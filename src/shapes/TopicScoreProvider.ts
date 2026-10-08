import {
  EnforceSignedIn,
  UserAccountData,
  UserData,
} from '@_linked/auth/types/auth';
import { Auth } from '@_linked/auth/utils/auth';
import { Person } from '@_linked/schema/shapes/Person';
import { ShapeProvider } from '@_linked/server-utils/utils/ShapeProvider';
import { UserAccount } from '@_linked/sioc/shapes/UserAccount';
import { getQueryContext } from '@_linked/core/queries/QueryContext';
import { QResult } from '@_linked/core/queries/SelectQuery';
import { GameActionProvider } from '../backend.js';
import type { EventTotals } from '../types/gameboard.js';
import { cached } from '../utils/cached.js';
import { EventTeam } from './EventTeam.js';
import { Player } from './Player.js';
import { Team, type TeamWithEvents } from './Team.js';
import { TeamProvider } from './TeamProvider.js';
import { Topic } from './Topic.js';
import {
  TopicScore,
  type TopicScoreResult,
  type GameBoardTotalsResult,
} from './TopicScore.js';

export class TopicScoreProvider extends ShapeProvider {
  public shape = TopicScore;

  async getOrCreateTopicScore(
    topic: QResult<Topic>,
    creator: UserAccountData,
    currentTeam: QResult<Team>
  ): Promise<TopicScoreResult> {
    if (!topic || !creator || !currentTeam) {
      throw new Error('No provided topic, creator, or current team.');
    }

    // find existing TopicScore for the topic and creator in the current team
    const existing = await this.getAllOf(creator).then((scores) => {
      return scores.find((ts) => {
        return ts.topic?.id === topic.id && ts.team?.id === currentTeam.id;
      });
    });

    if (existing) {
      console.log(
        `${process.pid} - returning existing topicscore ${existing.id} - score ${existing.score} - medal ${existing.medal} for ${topic.id} - ${creator.id}`
      );
      return existing;
    }

    // create new TopicScore instance
    const ts = await TopicScore.create({
      topic: {
        id: topic.id,
      },
      creator: creator,
      team: {
        id: currentTeam.id,
      },
      score: 0, // default to no score
      medal: 0, // default to no medal
    });

    console.log(
      `${process.pid} - created topicscore ${ts.id} - for ${topic.id} - ${creator.id}`
    );

    return ts;
  }

  /**
   * Update the score of a TopicScore instance.
   *
   * @param topicScore
   * @param newScore
   * @param subPlayer
   */
  async updateTopicScore(
    topicScore: TopicScore,
    newScore: number,
    subPlayer: Player
  ) {
    if (!topicScore) {
      throw new Error(`TopicScore with URI ${topicScore?.id} not found.`);
    }

    await TopicScore.update({ score: newScore }).for({ id: topicScore.id });

    // this will update the score and recalculate the medal
    const update: any = await this.callOtherProvider<GameActionProvider>(
      GameActionProvider
    ).submit({ id: topicScore.topic.id }, new Map(), false, {
      id: subPlayer.id,
    });

    return update?.topicScore;
  }

  getTotalPlayers() {
    // ValidationReport.printForShapeInstances(UserAccount);
    return cached(
      async () => {
        const accounts = await UserAccount.select();
        return accounts.length;
      },
      ['totalPlayers'],
      5 * 60 * 1000
    ); // cache for 5 minutes
  }

  /**
   * Get total actions taken by all users or for a specific team.
   *
   * @param currentTeam if provided, only count actions for that team
   * @returns total actions sum of TopicScores
   */
  getTotalActions({
    currentTeam = null,
  }: {
    currentTeam?: QResult<Team> | null;
  } = {}) {
    return cached(
      async () => {
        let topicScores;
        if (currentTeam) {
          // get topicScore for specific team
          topicScores = await TopicScore.select((t) => {
            return [
              t.score,
              t.creator.select((c) => {
                return [c.email];
              }),
            ];
          }).where((t) => {
            return t.team.equals({ id: currentTeam.id });
          });
        } else {
          // get topicScore for all teams
          topicScores = await TopicScore.select((t) => {
            return [
              t.score,
              t.creator.select((c) => {
                return [c.email];
              }),
            ];
          });
        }

        // filter out admin accounts and sum scores
        const totalActions = topicScores
          .filter((topicScore) => {
            const userAccount = topicScore.creator;
            return !this.isAdmin(userAccount?.email);
          })
          .reduce((total, topicScore) => {
            return total + (topicScore.score || 0);
          }, 0);

        return totalActions;
      },
      ['getTotalActions', currentTeam],
      5 * 60 * 1000
    ); // cache for 5 minutes
  }

  // Get Player Medal on Team
  async getPlayerMedalScore() {
    const auth = this.request.linkedAuth;
    if (!auth) {
      console.log('Must be logged in to get player medal score');
      return Auth.enforceSignedIn();
    }

    const user = auth.userAccount.accountOf as Person;

    const team = await this.callOtherProvider<TeamProvider>(
      TeamProvider
    ).getTeamOf(user);

    const teamMembers = (team as any).members;

    const teamMedalPlayers = new Map<Person, number>();
    const collectedMedal = [];

    const allTopicScores = await TopicScore.selectAll();
    allTopicScores.forEach((topicScore) => {
      const member = teamMembers.find(
        (member) => member.id === (topicScore as any).creator?.accountOf?.id
      );

      if (member) {
        const medalScore = topicScore.medal;

        // Update teamMedalPlayers Map
        teamMedalPlayers.set(
          member,
          (teamMedalPlayers.get(member) || 0) + medalScore
        );

        // Update collectedMedal array
        const memberMedalScore = collectedMedal.find(
          (item) => item.member.id === member.id
        );

        if (memberMedalScore) {
          memberMedalScore.medalScore[
            medalScore > 0
              ? ['bronze', 'silver', 'gold'][medalScore - 1]
              : 'bronze'
          ] += 1;
        } else {
          collectedMedal.push({
            member,
            medalScore: { bronze: 0, silver: 0, gold: 0 },
          });
          collectedMedal[collectedMedal.length - 1].medalScore[
            medalScore > 0
              ? ['bronze', 'silver', 'gold'][medalScore - 1]
              : 'bronze'
          ] += 1;
        }
      }
    });

    return { teamMedalPlayers, collectedMedal };
  }

  /**
   * Enhanced method to get topic totals including instance scores
   * Main topics (topic1-7) should include their event topic scores (topicE2-6)
   *
   * @param topicScoreMap Map of topic string ID to base score
   * @returns Map with topics and their total scores (including instances)
   */
  private async enhanceTopicTotalsWithInstances(
    topicScoreMap: Map<string, number>
  ): Promise<Map<string, number>> {
    const enhancedMap = new Map<string, number>();

    // Get all topics with their instances using new LINCD query
    const allTopics = await Topic.select((t) => {
      return [
        t.id,
        t.topicInstances.select((instance) => {
          return [instance.id];
        }),
      ];
    });

    // Build mapping: main topic -> [event topics that belong to it]
    const mainToEventMap = new Map<string, string[]>();
    const eventTopicIds = new Set<string>();

    allTopics.forEach((topic: any) => {
      if (topic.topicInstances && topic.topicInstances.length > 0) {
        // This is an event topic that has main topic instances
        const eventTopicId = topic.id;
        eventTopicIds.add(eventTopicId);

        topic.topicInstances.forEach((mainTopic: any) => {
          const mainTopicId = mainTopic.id;
          if (!mainToEventMap.has(mainTopicId)) {
            mainToEventMap.set(mainTopicId, []);
          }
          mainToEventMap.get(mainTopicId).push(eventTopicId);
        });
      }
    });

    // Collect all main topics to process
    const mainTopicsToProcess = new Set<string>();

    // Add main topics that have direct scores
    topicScoreMap.forEach((score, topicId) => {
      if (!eventTopicIds.has(topicId)) {
        mainTopicsToProcess.add(topicId);
      }
    });

    // Add main topics that have event topics with scores
    mainToEventMap.forEach((eventTopics, mainTopicId) => {
      const hasEventScores = eventTopics.some(
        (eventTopicId) => (topicScoreMap.get(eventTopicId) || 0) > 0
      );
      if (hasEventScores) {
        mainTopicsToProcess.add(mainTopicId);
      }
    });

    // Calculate enhanced scores for each main topic
    mainTopicsToProcess.forEach((mainTopicId) => {
      let totalScore = topicScoreMap.get(mainTopicId) || 0;

      // Add scores from related event topics
      const eventTopics = mainToEventMap.get(mainTopicId) || [];
      eventTopics.forEach((eventTopicId) => {
        totalScore += topicScoreMap.get(eventTopicId) || 0;
      });

      // Only include topics with actual scores
      if (totalScore > 0) {
        enhancedMap.set(mainTopicId, totalScore);
      }
    });

    return enhancedMap;
  }

  /**
   * Enhanced method to get medal totals including instance medals
   * Main topics (topic1-7) should include their event topic medals (topicE2-6)
   * For medals, we take the MAXIMUM medal value, not the sum (since medals are ordinal: 1=bronze, 2=silver, 3=gold)
   *
   * @param medalMap Map of topic string ID to medal value (1=bronze, 2=silver, 3=gold)
   * @returns Map with topics and their best medals (including instances)
   */
  private async enhanceMedalsWithInstances(
    medalMap: Map<string, number>
  ): Promise<Map<string, number>> {
    const enhancedMap = new Map<string, number>();

    // Get all topics with their instances using new LINCD query
    const allTopics = await Topic.select((t) => {
      return [
        t.id,
        t.topicInstances.select((instance) => {
          return [instance.id];
        }),
      ];
    });

    // Build mapping: main topic -> [event topics that belong to it]
    const mainToEventMap = new Map<string, string[]>();
    const eventTopicIds = new Set<string>();

    allTopics.forEach((topic: any) => {
      if (topic.topicInstances && topic.topicInstances.length > 0) {
        // This is an event topic that has main topic instances
        const eventTopicId = topic.id;
        eventTopicIds.add(eventTopicId);

        topic.topicInstances.forEach((mainTopic: any) => {
          const mainTopicId = mainTopic.id;
          if (!mainToEventMap.has(mainTopicId)) {
            mainToEventMap.set(mainTopicId, []);
          }
          mainToEventMap.get(mainTopicId).push(eventTopicId);
        });
      }
    });

    // Collect all main topics to process
    const mainTopicsToProcess = new Set<string>();

    // Add main topics that have direct medals
    medalMap.forEach((medal, topicId) => {
      if (!eventTopicIds.has(topicId)) {
        mainTopicsToProcess.add(topicId);
      }
    });

    // Add main topics that have event topics with medals
    mainToEventMap.forEach((eventTopics, mainTopicId) => {
      const hasEventMedals = eventTopics.some(
        (eventTopicId) => (medalMap.get(eventTopicId) || 0) > 0
      );
      if (hasEventMedals) {
        mainTopicsToProcess.add(mainTopicId);
      }
    });

    // Calculate enhanced medals for each main topic - take MAXIMUM, not sum
    mainTopicsToProcess.forEach((mainTopicId) => {
      let bestMedal = medalMap.get(mainTopicId) || 0;

      // Take maximum medal from related event topics
      const eventTopics = mainToEventMap.get(mainTopicId) || [];
      eventTopics.forEach((eventTopicId) => {
        const eventMedal = medalMap.get(eventTopicId) || 0;
        bestMedal = Math.max(bestMedal, eventMedal);
      });

      // Only include topics with actual medals
      if (bestMedal > 0) {
        enhancedMap.set(mainTopicId, bestMedal);
      }
    });

    return enhancedMap;
  }

  async getGlobalTopicTotal() {
    const topicScores = await TopicScore.select((t) => {
      return [
        t.score,
        t.topic.select((topic) => {
          return [topic.id];
        }),
        t.creator.select((c) => {
          return [c.email];
        }),
      ];
    });

    // filter out admin accounts and build topic totals map
    const globalTopicTotal: Map<string, number> = new Map();

    topicScores
      .filter((topicScore) => {
        const userAccount = topicScore.creator;
        return !this.isAdmin(userAccount?.email);
      })
      .forEach((topicScore) => {
        const topicId = topicScore.topic?.id;
        if (topicId) {
          const currentScore = globalTopicTotal.has(topicId)
            ? globalTopicTotal.get(topicId)
            : 0;
          const newScore = currentScore + (topicScore.score || 0);
          globalTopicTotal.set(topicId, newScore);
        }
      });

    // Enhance totals to include instance scores
    const enhancedGlobalTopicTotal = await this.enhanceTopicTotalsWithInstances(
      globalTopicTotal
    );

    // convert Map to plain object for cleaner JSON response
    const globalTopicTotalObject: Record<string, number> = {};
    enhancedGlobalTopicTotal.forEach((score, topicId) => {
      globalTopicTotalObject[topicId] = score;
    });

    return { globalTopicTotal: globalTopicTotalObject };
  }

  async getTeamTopicTotals(team: QResult<Team>) {
    const topicScores = await TopicScore.select((t) => {
      return [
        t.score,
        t.topic.select((topic) => {
          return [topic.id];
        }),
        t.creator.select((c) => {
          return [c.email];
        }),
      ];
    }).where((t) => {
      return t.team.equals(team);
    });

    // filter out admin accounts and build topic totals map
    const teamTopicTotals: Map<string, number> = new Map();

    topicScores
      .filter((topicScore) => {
        const userAccount = topicScore.creator;
        return !this.isAdmin(userAccount.email);
      })
      .forEach((topicScore) => {
        const topicId = topicScore.topic?.id;
        if (topicId) {
          const currentScore = teamTopicTotals.has(topicId)
            ? teamTopicTotals.get(topicId)
            : 0;
          const newScore = currentScore + (topicScore.score || 0);
          teamTopicTotals.set(topicId, newScore);
        }
      });

    // Enhance totals to include instance scores
    const enhancedTeamTopicTotals = await this.enhanceTopicTotalsWithInstances(
      teamTopicTotals
    );

    // convert Map to plain object for cleaner JSON response
    const teamTopicTotalsObject: Record<string, number> = {};
    enhancedTeamTopicTotals.forEach((score, topicId) => {
      teamTopicTotalsObject[topicId] = score;
    });

    return { teamTopicTotals: teamTopicTotalsObject };
  }

  /**
   * Get all TopicScores for a specific creator or UserAccount.
   *
   * @param creator
   * @returns
   */
  async getAllOf(creator: UserAccountData): Promise<TopicScoreResult[]> {
    // make sure creator is valid
    if (!creator) {
      return [];
    }

    // const player = getQueryContext('user').as(Player);
    const player = await Player.select((p) => {
      return [p.currentTeam];
    })
      .where((p) => {
        return p.equals({ id: creator.accountOf.id });
      })
      .one();

    if (!player || !player.currentTeam) {
      return [];
    }

    const userScores = await TopicScore.select((t) => {
      return [
        t.topic,
        t.score,
        t.medal,
        t.team,
        t.creator.select((c) => [c.accountOf]),
        t.images.select((img) => [img.contentUrl]),
      ];
    }).where((t) => {
      return t.creator
        .equals({ id: creator.id })
        .and(t.team.equals(player.currentTeam));
    });

    return userScores;
  }

  /**
   * Get all TopicScores for a specific user by UserData.
   *
   * @param user - UserData object
   * @param currentTeam - Optional team to filter by, defaults to user's current team
   * @returns TopicScore array for the user
   */
  async getAllOfByUser(user: UserData, currentTeam?: QResult<Team>) {
    if (!user) {
      throw new Error('User is required');
    }

    // get the user account first
    const userAccount = await UserAccount.select((ua) => {
      return [ua.accountOf];
    })
      .where((ua) => {
        return ua.accountOf.equals(user);
      })
      .one();

    if (!userAccount) {
      console.warn('No user account found for user:', user.id);
      return [];
    }

    let targetTeam = currentTeam;
    if (!targetTeam) {
      // get the user current team
      const player = await Player.select((p) => {
        return [p.currentTeam];
      })
        .where((p) => {
          return p.equals(user);
        })
        .one();

      if (!player || !player.currentTeam) {
        console.warn('No current team found for user:', user.id);
        return [];
      }

      targetTeam = player.currentTeam;
    }

    const userScores = await TopicScore.select((t) => {
      return [t.topic, t.score, t.medal, t.team, t.creator];
    }).where((t) => {
      return t.creator
        .equals({ id: userAccount.id })
        .and(t.team.equals(targetTeam));
    });

    return userScores;
  }

  /**
   * Get all TopicScores for multiple users in a single batch query.
   * This is much more efficient than calling getAllOfByUser multiple times.
   *
   * @param users - Array of UserData objects
   * @param currentTeam - Team to filter by
   * @returns Object with user IDs as keys and their TopicScore arrays as values
   */
  async getAllOfByUsers(
    users: UserData[],
    currentTeam: QResult<Team>
  ): Promise<Record<string, any[]>> {
    if (!users || users.length === 0) {
      return {};
    }

    if (!currentTeam) {
      throw new Error('Team is required for batch query');
    }

    // create a Set of user IDs for efficient lookup
    const userIdSet = new Set(users.map((user) => user.id));

    // get all topic scores for the team and include creator information
    const allTopicScores = await TopicScore.select((ts) => {
      return [
        ts.topic.select((t) => [t.name, t.identifier]),
        ts.score,
        ts.medal,
        ts.team,
        ts.creator.select((c) => {
          return [c.accountOf];
        }),
      ];
    }).where((ts) => {
      return ts.team.equals(currentTeam);
    });

    // group the results by user ID
    const resultObj: Record<string, any[]> = {};

    // initialize empty arrays for all users
    users.forEach((user) => {
      resultObj[user.id] = [];
    });

    // filter and group topic scores by user
    allTopicScores.forEach((topicScore) => {
      // skip if topicScore is empty or invalid
      if (
        !topicScore ||
        !topicScore.creator ||
        !topicScore.creator.accountOf ||
        !topicScore.topic
      ) {
        return;
      }

      const userId = topicScore.creator?.accountOf?.id;
      if (userId && userIdSet.has(userId)) {
        if (!resultObj[userId]) {
          resultObj[userId] = [];
        }
        resultObj[userId].push(topicScore);
      }
    });

    return resultObj;
  }

  async getMyTopicTotals(
    userAccount: UserAccountData,
    allTeams: boolean = false
  ) {
    if (!userAccount) {
      throw new Error('User account is required');
    }
    const user = userAccount.accountOf;
    let player;
    if (!allTeams) {
      player = await Player.select((p) => {
        return [p.currentTeam];
      })
        .where((p) => {
          return p.equals(user);
        })
        .one();

      if (!player || !player.currentTeam) {
        throw new Error('No current team found for user');
      }
    }

    let myTopicTotals: Map<string, number> = new Map();
    let myMedalTopic: Map<string, number> = new Map();
    // let userAccount = UserAccount.getAccountOf(user as any);
    //get the topic scores of this user
    //either get those for ANY team (so overall totals)
    // or only get those of the current team of the user (based on the allTeams flag)
    let topicScores = await TopicScore.select((t) => {
      return [
        t.score,
        t.topic.select((topic) => [
          topic.name,
          topic.identifier,
          topic.description,
          (topic.image as any).select((img) => [img.contentUrl]),
        ]),
        t.medal,
        t.creator,
      ];
    }).where((t) => {
      if (allTeams) {
        return t.creator.equals(userAccount);
      } else {
        // const user = getQueryContext('user').as(Player);
        return t.team
          .equals(player.currentTeam)
          .and(t.creator.equals(userAccount));
      }
    });

    topicScores.forEach((topicScore) => {
      // skip if topicScore doesn't have a valid topic
      if (!topicScore.topic || !topicScore.topic.id) {
        // console.warn(`TopicScore has no valid topic: ${topicScore.topic?.id || 'unknown'}, skipping topicScore: ${topicScore.id}`);
        return;
      }

      // set medal. Get the maximum medal score for this topic amongst scores of this user for different teams
      let medalScore = topicScore.medal;
      // console.log(`topicScore ${topicScore.id}, topic: ${topicScore.topic.id}, has medal score ${medalScore}, actual score: ${topicScore.score}`);
      let bestMedal = myMedalTopic.has(topicScore.topic.id)
        ? Math.max(myMedalTopic.get(topicScore.topic.id), medalScore)
        : medalScore;
      myMedalTopic.set(topicScore.topic.id, bestMedal);
      // set total score (which may be the sum of scores for the same topic & user but under multiple teams)
      let newScore =
        (myTopicTotals.has(topicScore.topic.id)
          ? myTopicTotals.get(topicScore.topic.id)
          : 0) + topicScore.score;
      // console.log(`Setting ${topicScore.topic.id} total score to: ${newScore}`);
      myTopicTotals.set(topicScore.topic.id, newScore);
    });

    const enhancedMyTopicTotals = await this.enhanceTopicTotalsWithInstances(
      myTopicTotals
    );
    const enhancedMyMedalTopic = await this.enhanceMedalsWithInstances(
      myMedalTopic
    );

    // convert Maps to plain objects for cleaner JSON response
    const topicTotalsObject: Record<string, number> = {};
    const medalTopicObject: Record<string, number> = {};

    enhancedMyTopicTotals.forEach((score, topicId) => {
      topicTotalsObject[topicId] = score;
    });

    enhancedMyMedalTopic.forEach((medal, topicId) => {
      medalTopicObject[topicId] = medal;
    });

    return {
      myTopicTotals: topicTotalsObject,
      myMedalTopic: medalTopicObject,
    };
  }

  getGameBoardTotals(): Promise<GameBoardTotalsResult> | EnforceSignedIn {
    let auth = this.request.linkedAuth;
    if (!auth) {
      console.log(`Must be signed in to get game board totals`);
      return Auth.enforceSignedIn();
    }

    return cached(
      async () => {
        console.log('Calculating game board totals...');
        const account = auth.userAccount;
        const user = auth.user;

        let totalPlayer = (await this.getTotalPlayers()) - 1; // 1 is account `ADMIN_EMAIL`
        let totalActions = await this.getTotalActions();
        let globalTopicTotalResult = await this.getGlobalTopicTotal();
        let globalTopicTotal = globalTopicTotalResult.globalTopicTotal;

        // temporary increase totalPlayer, totalActions and each action
        // Action 1: 284, Action 2: 6759, Action 3: 998, Action 4: 1362, Action 5: 4012, Action 6: 789, Action 7: 716, Total: 14920, Players: 1799
        // TODO: later will be removed until add actual data in
        totalPlayer += 1799;
        totalActions += 44974;

        const actionIncrements = {
          topic1: 856,
          topic2: 20374,
          topic3: 3008,
          topic4: 4106,
          topic5: 12094,
          topic6: 2158,
          topic7: 2378,
        };

        // Apply increments only to main topics (topic1-7)
        Object.entries(globalTopicTotal).forEach(([key, value]) => {
          // console.log(`Checking topic URI: ${key} for increments`);
          for (const [topic, increment] of Object.entries(actionIncrements)) {
            // don't apply increments to event topics topicE, topicEC, topicPW
            if (
              key.includes(topic) &&
              !key.includes('topicE') &&
              !key.includes('topicEC') &&
              !key.includes('topicPW')
            ) {
              // console.log(`Applying increment: ${topic} (+${increment}) to ${key}`);
              globalTopicTotal[key] = value + increment;
              break;
            }
          }
        });

        // ValidationReport.printForShapeInstances(TopicScore);

        // let team = user.currentTeam;
        const player = getQueryContext('user').as(Player);
        const currentTeam = player.currentTeam;

        let teamTopicTotalsResult = currentTeam
          ? await this.getTeamTopicTotals(currentTeam)
          : { teamTopicTotals: {} };

        let myTopicTotals = await this.getMyTopicTotals(account, true);

        return {
          totalPlayer,
          totalActions,
          myTopicTotals,
          teamTopicTotals: teamTopicTotalsResult,
          globalTopicTotal: { globalTopicTotal },
        };
      },
      ['gameboardtotals'],
      1000 * 60 * 5
    ); // cache for 5 minutes
  }

  /**
   * Get event totals for a specific event team or the current user's team.
   *
   * @param eventId - Optional ID of the event team to get totals for
   * @returns Promise<EventTotals> - Object containing totalPlayer and totalActions
   */
  getEventTotals(eventId?: string): Promise<EventTotals> {
    const userAccount = this.request.linkedAuth?.userAccount;

    return cached(
      async (): Promise<EventTotals> => {
        try {
          const eventTeam = await this.getEventTeam(eventId, userAccount);

          if (!eventTeam) {
            console.warn(
              'Event team not found for the given ID or user account'
            );
            return { totalPlayer: 0, totalActions: 0 };
          }

          const totalPlayer = eventTeam?.members?.length || 0;
          const totalActions = await this.getTotalActions({
            currentTeam: { id: eventTeam.id },
          });

          return {
            totalPlayer,
            totalActions,
          };
        } catch (error) {
          console.error('Error getting event totals:', error);
          return { totalPlayer: 0, totalActions: 0 };
        }
      },
      ['getEventTotals', eventId, userAccount],
      1 * 60 * 1000 // cache for 1 minute
    );
  }

  /**
   * Get the event team either by ID or from the current user's team.
   *
   * @param eventId - Optional ID of the event team
   * @param userAccount - Current user account
   * @returns QResult<EventTeam> - The event team or null if not found
   */
  private async getEventTeam(eventId?: string, userAccount?: UserAccountData) {
    // If eventUri is provided, get the specific event team
    if (eventId) {
      const eventTeam = await EventTeam.select((t) => {
        return [t.members];
      })
        .where((t) => {
          return t.equals({ id: eventId });
        })
        .one();

      return eventTeam;
    }

    // If no eventId, get the current user's team
    if (!userAccount) {
      throw new Error('No event provided and user not authenticated');
    }

    const user = userAccount.accountOf;

    // Get the player with their current team
    const player = await Player.select((p) => {
      return [
        p.currentTeam.select((t) => {
          return [
            t.members,
            t.attendsEvents.select((e) => {
              return [e.identifier, e.name, e.actions];
            }),
          ];
        }),
      ];
    })
      .where((p) => {
        return p.equals(user);
      })
      .one();

    if (!player) {
      console.warn('Player not found for user account');
      return null;
    }

    const currentTeam = player.currentTeam;

    // Verify it's an event team
    if (!Team.getIsEventMode(currentTeam as TeamWithEvents)) {
      console.warn(
        'User is not in event mode - current team is not an event team'
      );
      return null;
    }

    return currentTeam;
  }

  // check if user is admin
  isAdmin(userEmail: string): boolean {
    return userEmail === process.env.ADMIN_EMAIL;
  }
}
