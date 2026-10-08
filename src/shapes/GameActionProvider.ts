import { UserAccountData, UserData } from '@_linked/auth/types/auth';
import { Auth } from '@_linked/auth/utils/auth';
import { Person } from '@_linked/schema/shapes/Person';
import { ShapeProvider } from '@_linked/server-utils/utils/ShapeProvider';
import { UserAccount } from '@_linked/sioc/shapes/UserAccount';
import { QResult } from '@_linked/core/queries/SelectQuery';
import { ActionTemplate, type ActionTemplateResult } from './ActionTemplate.js';
import { EventTeam } from './EventTeam.js';
import {
  type ActionsQuantityMap,
  GameAction,
  type GameActionResult,
  type SubmitResponse,
} from './GameAction.js';
import { Player } from './Player.js';
import { Team, type TeamWithEvents } from './Team.js';
import { Topic } from './Topic.js';
import { TopicScore, type TopicScoreResult } from './TopicScore.js';
import { TopicScoreProvider } from './TopicScoreProvider.js';
import { OnceScoreAlgorithm } from './score_config/OnceScoreAlgorithm.js';
import { ThresholdScoreAlgorithm } from './score_config/ThresholdScoreAlgorithm.js';

export class GameActionProvider extends ShapeProvider {
  public shape = GameAction;

  async submit(
    topic: QResult<Topic>,
    actionsAndQuantity: ActionsQuantityMap,
    overwritePreviousSubmission: boolean = false,
    subPlayer?: UserData
  ): Promise<SubmitResponse> {
    const auth = this.request.linkedAuth;
    if (!auth) {
      console.warn('Must be logged in to submit a game action');
      return Auth.enforceSignedIn();
    }

    if (!topic) {
      console.warn('Topic not found', topic.id);
      return { error: 'Topic not found' };
    }

    //make sure to use the selected subPlayer instead of the current user if it's provided
    let user, userAccount;
    if (!subPlayer) {
      user = auth.user;
      userAccount = auth.userAccount;
    } else {
      const existingAccount = await UserAccount.select((a) => {
        return [
          a.accountOf.as(Player).select((p) => {
            return [p.currentTeam, p.givenName, p.familyName, p.address];
          }),
        ];
      })
        .where((a) => {
          return a.accountOf.equals(subPlayer);
        })
        .one();

      userAccount = existingAccount;
      user = existingAccount.accountOf;
    }

    // const player = getQueryContext('user').as(Player)
    // const currentTeam = player.currentTeam;
    const currentTeam = user?.currentTeam;
    if (!currentTeam) {
      console.warn('No current team found for user', user.id);
      return { error: 'No current team found for user' };
    }

    if (overwritePreviousSubmission) {
      //delete all previous actions for this topic by this user
      //except the custom created options
      const previousActions = await GameAction.select((ga) => {
        return [
          ga.topic,
          ga.agent,
          ga.team,
          ga.objects.as(ActionTemplate).select((actionTemplate) => {
            return [
              actionTemplate.name,
              actionTemplate.points,
              actionTemplate.isBonus,
              actionTemplate.isCustom,
              actionTemplate.identifier,
              actionTemplate.description,
            ];
          }),
        ];
      }).where((ga) => {
        return ga.topic
          .equals({ id: topic.id })
          .and(ga.agent.equals(user))
          .and(ga.team.equals(currentTeam));
        // .and(ga.objects[0]?.isBonus.equals(false))
      });

      // since checking for isBonus is not possible in the query, we filter it out manually
      const filteredPreviousActions = previousActions.filter((action) => {
        const objects = action.objects as ActionTemplateResult[];
        return !objects[0].isBonus;
      });

      await GameAction.delete(filteredPreviousActions);
    }

    //create new actions
    const actionPromises = Array.from(actionsAndQuantity.entries()).map(
      async ([template, quantity]) => {
        const action: GameActionResult = await GameAction.create({
          topic: { id: topic.id },
          quantity: quantity,
          agent: { id: user.id },
          team: { id: currentTeam.id },
          objects: [template],
        });
        return action;
      }
    );
    const actions = await Promise.all(actionPromises);

    //calculate the new total score for this topic by looking at all the new & previous actions
    const userTopicActions = await this.getAllOfQuery(user, topic, currentTeam);
    const transformActions: GameActionResult[] = userTopicActions
      .map((action) => {
        // get the first action template
        const template = action.objects[0];
        return {
          id: action.id,
          quantity: action.quantity,
          team: action.team,
          objects: [template],
          topic: action.topic,
          agent: action.agent,
        };
      })
      .filter((action) => action !== null); // filter out null actions

    // calculate total score including bonus actions
    const totalScore = transformActions.reduce((total, action) => {
      const template = action.objects[0];
      const templatePoints = template?.points || 0;
      return total + action.quantity * templatePoints;
    }, 0);
    console.log(`Total score: ${totalScore}`);

    // calculate total score without bonus actions
    const totalScoreWithoutBonus = transformActions
      .filter((action) => {
        const template = action.objects[0];
        const isBonus = template?.isBonus || false;
        return !isBonus;
      })
      .reduce((total, action) => {
        const template = action.objects[0];
        const templatePoints = template?.points || 0;
        return total + action.quantity * templatePoints;
      }, 0);
    console.log(`Total score without bonus: ${totalScoreWithoutBonus}`);

    //get or create a new topic score
    const topicScore = await TopicScore.getOrCreateFor(
      { id: topic.id },
      userAccount,
      currentTeam
    );

    // current implementation of images: they are stored in the topic score
    // and each image is counted as 1 point
    // in the future we may want to restructure this and store images in GameActions
    let finalTotalScore = totalScore;
    let finalTotalScoreWithoutBonus = totalScoreWithoutBonus;
    if (topicScore?.images?.length > 0) {
      finalTotalScore += topicScore.images.length;
      finalTotalScoreWithoutBonus += topicScore.images.length;
      console.log(`Added ${topicScore.images.length} image points`);
    }

    //calculate the medal for this score
    const existingTopic = await Topic.select((t) => {
      return [
        t.scoreConfiguration
          .as(OnceScoreAlgorithm)
          .select((a) => [a.bronzeTemplate, a.silverTemplate, a.goldTemplate]),
        t.scoreConfiguration
          .as(ThresholdScoreAlgorithm)
          .select((a) => [a.bronzeMinScore, a.silverMinScore, a.goldMinScore]),
      ];
    })
      .where((t) => {
        return t.equals({ id: topic.id });
      })
      .one();

    const scoreConfig = existingTopic.scoreConfiguration;
    let medal = 0;
    // check if scoreConfig is OnceScoreAlgorithm or ThresholdScoreAlgorithm
    if (
      scoreConfig.bronzeTemplate !== null &&
      scoreConfig.silverTemplate !== null &&
      scoreConfig.goldTemplate !== null
    ) {
      // this OnceScoreAlgorithm, calculation is based on the templates
      // medal = OnceScoreAlgorithm.calculateTotalScore(
      //   topic,
      //   transformActions,
      //   totalScoreWithoutBonus,
      //   {
      //     gold: scoreConfig.goldTemplate.id,
      //     silver: scoreConfig.silverTemplate.id,
      //     bronze: scoreConfig.bronzeTemplate.id,
      //   }
      // );
    } else if (
      // this ThresholdScoreAlgorithm, calculation is based on the scores
      scoreConfig.bronzeMinScore !== null &&
      scoreConfig.silverMinScore !== null &&
      scoreConfig.goldMinScore !== null
    ) {
      // medal = ThresholdScoreAlgorithm.calculateTotalScore(
      //   topic,
      //   transformActions,
      //   totalScoreWithoutBonus,
      //   {
      //     gold: scoreConfig.goldMinScore,
      //     silver: scoreConfig.silverMinScore,
      //     bronze: scoreConfig.bronzeMinScore,
      //   }
      // );
    } else {
      medal = 0;
    }
    console.log(`Medal: ${medal}`);

    //check if the user had already finished the game before this submission
    const finishedGameBefore = await this.hasFinishedGame(
      userAccount,
      user.currentTeam
    );

    //update the total score and medal
    const updateTopicScore = await TopicScore.update({
      score: finalTotalScore,
      medal: medal,
      creator: {
        id: userAccount.id,
        accountOf: { id: userAccount.accountOf.id },
      },
      topic: { id: topic.id },
      team: { id: currentTeam.id },
    }).for(topicScore);
    console.log(
      `Updated topic score: ${updateTopicScore.score}, medal: ${updateTopicScore.medal}`
    );

    // check if the user finished the game after this submission
    const finishedGameNow = await this.hasFinishedGame(
      userAccount,
      user.currentTeam
    );
    const justFinishedGame = !finishedGameBefore && finishedGameNow;
    console.log(`User finished game now: ${justFinishedGame}`);

    // console.log(
    //   `${process.pid} - returning updated topic score ${topicScore.uri} for ${topic.name} - ${user.givenName}: score ${topicScore.score}, medal ${topicScore.medal}`,
    // );
    return {
      topicScore: updateTopicScore,
      actions,
      justFinishedGame,
      user: user,
    };
  }

  async hasFinishedGame(
    userAccount: UserAccountData,
    team: TeamWithEvents
  ): Promise<boolean> {
    let topicScores = await this.callOtherProvider<TopicScoreProvider>(
      TopicScoreProvider
    ).getAllOf(userAccount);

    // we need to check user playing on register team or event team
    // because regular team has 7 topic action and event team has 5
    // also, now event has 3 types: PW, E, EC
    const isEventMode = Team.getIsEventMode(team);

    const topics = await Topic.select();
    const filteredTopics = isEventMode
      ? topics.filter(
          (t) =>
            t.id.includes('topicPW') ||
            t.id.includes('topicE') ||
            t.id.includes('topicEC')
        )
      : topics.filter(
          (t) =>
            t.id.includes('topic') &&
            !t.id.includes('PW') &&
            !t.id.includes('E') &&
            !t.id.includes('EC')
        );

    //return true if the user has a score for each topic and all the scores are > 0
    const result =
      topicScores.length === filteredTopics.length &&
      topicScores.every((topicScore) => {
        return topicScore.score > 0;
      });

    return result;
  }

  /**
   * Get all game actions for a user, optionally filtered by topic and team.
   *
   * @param user
   * @param topic
   * @param currentTeam
   * @returns
   */
  async getAllOfQuery(
    user: UserData,
    topic?: QResult<Topic>,
    currentTeam?: QResult<Team | EventTeam>
  ): Promise<GameActionResult[]> {
    if (topic && currentTeam) {
      const gameActions = await GameAction.select((ga) => {
        return [
          ga.agent,
          ga.topic,
          ga.team,
          ga.quantity,
          ga.objects.as(ActionTemplate).select((actionTemplate) => {
            return [
              actionTemplate.name,
              actionTemplate.points,
              actionTemplate.isBonus,
              actionTemplate.isCustom,
              actionTemplate.identifier,
              actionTemplate.description,
            ];
          }),
        ];
      }).where((ga) => {
        return ga.agent
          .equals(user)
          .and(ga.topic.equals({ id: topic.id }))
          .and(ga.team.equals({ id: currentTeam.id }));
      });

      return gameActions;
    }

    const gameActions = await GameAction.select((ga) => {
      return [
        ga.agent,
        ga.topic,
        ga.team,
        ga.quantity,
        ga.objects.as(ActionTemplate).select((actionTemplate) => {
          return [
            actionTemplate.name,
            actionTemplate.points,
            actionTemplate.isBonus,
            actionTemplate.isCustom,
            actionTemplate.identifier,
            actionTemplate.description,
          ];
        }),
      ];
    }).where((ga) => {
      return ga.agent.equals({
        id: user.id,
      });
    });

    return gameActions;
  }

  async getAllOf(user: Person) {
    return await GameAction.select((g) => [
      g.agent,
      g.topic,
      g.quantity,
      g.team,
    ]).where((g) => g.agent.equals({ id: user.id }));
  }

  async getGameActionByTopic(topic: QResult<Topic>, forPlayer?: UserData) {
    if (!topic) {
      console.warn(`Topic not found for getGameActionByTopic`);
      return {
        gameActions: [],
        customActionTemplates: [],
      };
    }

    let user = this.request.linkedAuth?.user;
    let userAccount = this.request.linkedAuth?.userAccount;
    if (!userAccount) {
      return Auth.enforceSignedIn();
    }

    // set player from param or authenticated user
    let player;
    if (forPlayer) {
      const existingPerson = await Player.select((p) => {
        return [p.currentTeam, p.givenName, p.familyName, p.address];
      })
        .where((p) => {
          return p.equals(forPlayer);
        })
        .one();
      player = existingPerson;
    } else {
      // player = user;
      // TODO: currentTeam id is temporary, like: `lin://tmp/678
      // player = getQueryContext('user').as(Player)
      const existingPlayer = await Player.select((p) => {
        return [p.currentTeam, p.givenName, p.familyName, p.address];
      })
        .where((p) => {
          return p.equals(user);
        })
        .one();
      player = existingPlayer;
    }

    const gameActions = await this.getAllOfQuery(
      user,
      { id: topic.id },
      player.currentTeam
    );

    // get unique custom action templates by id
    const customActionTemplatesMap = new Map();
    gameActions
      .filter((action) => {
        const objects = action.objects as QResult<
          ActionTemplate,
          {
            name: string;
            points: number;
            isBonus: boolean;
            isCustom: boolean;
            identifier: string;
            description: string;
          }
        >[];
        return objects[0].isCustom;
      })
      .forEach((action) => {
        const template = action.objects[0] as QResult<ActionTemplate>;
        // set the template id
        customActionTemplatesMap.set(template.id, template);
      });
    const customActionTemplates = Array.from(customActionTemplatesMap.values());

    return {
      gameActions,
      customActionTemplates,
    };
  }
}
