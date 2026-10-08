import { UserAccountData, UserData } from '@_linked/auth/types/auth';
import { ImageObject } from '@_linked/schema/shapes/ImageObject';
import { Person } from '@_linked/schema/shapes/Person';
import { Server } from '@_linked/server-utils/utils/Server';
import { sioc } from '@_linked/sioc/ontologies/sioc';
import { UserAccount } from '@_linked/sioc/shapes/UserAccount';
import { xsd } from '@_linked/xsd/ontologies/xsd';
import { ShapeSet } from '@_linked/core/collections/ShapeSet';

import { QResult } from '@_linked/core/queries/SelectQuery';
import { Shape } from '@_linked/core/shapes/Shape';
import { literalProperty, objectProperty } from '@_linked/core/shapes/SHACL';
import { irlcg } from '../ontologies/lincd-irlcg.js';
import { linkedShape } from '../package.js';
import type { EventTotals } from '../types/gameboard.js';
import { Player } from './Player.js';
import { Team } from './Team.js';
import { Topic } from './Topic.js';

export type TopicScoreResult = QResult<
  TopicScore,
  {
    creator: UserAccountData;
    topic: QResult<Topic>;
    team: QResult<Team>;
    medal: number;
    score: number;
    images?: QResult<ImageObject, { contentUrl: string }>[] | null;
  }
>;

export type GameBoardTotalsResult = {
  totalPlayer: number;
  totalActions: number;
  myTopicTotals: {
    myTopicTotals: Record<string, number>;
    myMedalTopic: Record<string, number>;
  };
  teamTopicTotals: {
    teamTopicTotals: Record<string, number>;
  };
  globalTopicTotal: {
    globalTopicTotal: Record<string, number>;
  };
};

@linkedShape({
  description:
    "A player's total count of actions for a topic & team. Links to UserAccount, not the Player itself. Has team relationships, medal achievements and optional uploaded images for this topic. (score, points, achievement)",
})
export class TopicScore extends Shape {
  static targetClass = irlcg.TopicScore;

  @objectProperty({
    path: sioc.has_creator,
    minCount: 1,
    maxCount: 1,
    description: 'Player who this action count belongs to.',
    shape: UserAccount,
  })
  get creator(): UserAccount {
    return undefined as any;
  }

  @objectProperty({
    path: irlcg.topic,
    shape: Topic,
    minCount: 1,
    maxCount: 1,
    description: 'Topic this score is associated with.',
  })
  get topic(): Topic {
    return undefined as any;
  }

  //store the team
  @objectProperty({
    path: irlcg.team,
    description: 'Team context for this topic score.',
    minCount: 1,
    maxCount: 1,
    shape: Team,
  })
  get team(): Team {
    return undefined as any;
  }

  @literalProperty({
    path: irlcg.medal,
    datatype: xsd.integer,
    minInclusive: 1,
    maxExclusive: 3,
    maxCount: 1,
    in: [
      1, // Bronze
      2, // Silver
      3, // Gold
    ],
    description: 'The type of medal (1= Bronze, 2= Silver, 3= Gold).',
  })
  /**
   * The type of medal (enums).
   * 1= Bronze
   * 2= Silver
   * 3= Gold
   */
  get medal(): number {
    return 0;
  }

  @literalProperty({
    path: irlcg.score,
    datatype: xsd.integer,
    maxCount: 1,
    description:
      'The total action count for the topic. Can be recalculated by looking at all the individual GameActions of the user for this topic',
  })
  /**
   * The total score for the topic. Can be recalculated by looking at all the individual GameActions of the user for this topic
   */
  get score(): number {
    return 0;
  }

  @objectProperty({
    path: irlcg.hasImage,
    required: false,
    shape: ImageObject,
  })
  get images(): ShapeSet<ImageObject> {
    return undefined as any;
  }

  static getOrCreateFor(
    topic: QResult<Topic>,
    creator: UserAccountData, // | UserData | Player,
    currentTeam: QResult<Team>
  ): Promise<TopicScoreResult> {
    return Server.call(
      this,
      'getOrCreateTopicScore',
      topic,
      creator,
      currentTeam
    );
  }

  static updateTopicScore(
    topicScore: TopicScore,
    newScore: number,
    subPlayer: Player
  ): Promise<TopicScore> {
    return Server.call(
      this,
      'updateTopicScore',
      topicScore,
      newScore,
      subPlayer
    );
  }

  static getGameBoardTotals(): Promise<GameBoardTotalsResult> {
    return Server.call(this, 'getGameBoardTotals');
  }

  static getEventTotals(eventUri?: string): Promise<EventTotals> {
    return Server.call(this, 'getEventTotals', eventUri);
  }

  static getMyTopicTotals(
    userAccount: QResult<UserAccount>,
    allTeams: boolean = false
  ): Promise<{
    myTopicTotals: Record<string, number>;
    myMedalTopic: Record<string, number>;
  }> {
    return Server.call(this, 'getMyTopicTotals', userAccount, allTeams);
  }
  static getAllOf(creator: UserAccountData): Promise<TopicScoreResult[]> {
    return Server.call(this, 'getAllOf', creator);
  }

  static getAllOfByUser(
    user: UserData,
    currentTeam?: QResult<Team>
  ): Promise<TopicScore[]> {
    return Server.call(this, 'getAllOfByUser', user, currentTeam);
  }

  static getAllOfByUsers(
    users: UserData[],
    currentTeam: QResult<Team>
  ): Promise<Record<string, TopicScore[]>> {
    return Server.call(this, 'getAllOfByUsers', users, currentTeam);
  }

  static getPlayerMedalScore(): Promise<TopicScore> {
    return Server.call(this, 'getPlayerMedalScore');
  }

  static async cleanupTopicScore(
    accounts: UserAccountData[],
    selectedAccount: UserAccountData
  ) {
    console.log('cleaning up TopicScore...');
    console.log(
      'Accounts to check:',
      accounts.map((a) => ({ accountId: a.id, userId: a.accountOf?.id }))
    );

    // get all TopicScores
    try {
      const allTopicScores = await TopicScore.select((ts) => [
        ts.score,
        ts.medal,
        ts.creator,
        ts.topic.select((t) => [t.identifier]),
        ts.team.select((t) => [t.identifier]),
      ]);
      console.log(`📊 Total TopicScores in database: ${allTopicScores.length}`);

      // show TopicScores that might be related to these accounts
      const relevantScores = allTopicScores.filter((ts) => {
        const creatorId = String(ts.creator?.id || '');
        return accounts.some(
          (acc) => creatorId === acc.id || creatorId === acc.accountOf?.id
        );
      });

      if (relevantScores.length > 0) {
        console.log(
          `⚠️  Found ${relevantScores.length} TopicScores related to these accounts:`,
          relevantScores.map((ts) => ({
            id: ts.id,
            score: ts.score,
            medal: ts.medal,
            topic: ts.topic?.identifier,
            team: ts.team?.identifier,
            creator: String(ts.creator?.id || ''),
          }))
        );
      }
    } catch (e: any) {
      console.log('Could not query all TopicScores:', e?.message || e);
    }

    // get all for all accounts in the group
    // NOTE: We use direct select query instead of getAllOf() because getAllOf()
    // has a bug and doesn't return all results. The direct query works correctly.
    const items = await Promise.all(
      accounts.map((userAccountData: UserAccountData) => {
        return TopicScore.getAllOf(userAccountData);
      })
    );

    if (items.length >= 1) {
      // map to store highest scores by team and topic
      // the reason to map the team because we need to make sure the data is not duplicated or removed when compare
      const highestScores = new Map<string, Map<string, TopicScoreResult>>();

      // map to store the TopicScore by team
      const teamMap = new Map<string, TopicScoreResult[]>();

      // group TopicScore items by team
      items.forEach((itemSet) => {
        itemSet.forEach((item: TopicScoreResult) => {
          const teamId = item?.team?.id;
          if (teamId) {
            if (!teamMap.has(teamId)) {
              teamMap.set(teamId, []);
            }
            teamMap.get(teamId)?.push(item);
          }
        });
      });

      teamMap.forEach((itemSet, teamId) => {
        itemSet.forEach((item: TopicScoreResult) => {
          const topic = item.topic;
          const score = item.score;

          // skip items with null topic references (broken data)
          // NOTE: some TopicScore records have null topic references due to data integrity issues.
          // these records cannot be properly compared or merged, so we skip them.
          if (!topic || !topic.id) {
            console.warn(
              `Skipping TopicScore ${item.id} with null topic reference in team ${teamId}`
            );
            return;
          }

          // check if teamId exists in the highestScores map
          // to make sure compare data on the same team
          if (!highestScores.has(teamId)) {
            highestScores.set(teamId, new Map<string, TopicScoreResult>());
          }

          const teamScores = highestScores.get(teamId)!;
          const highestScoreItem = teamScores.get(topic.id);
          const highestScore = highestScoreItem?.score || 0;

          // compare the same topic and keep the highest score
          if (!highestScoreItem || score > highestScore) {
            item.score = score;
            teamScores.set(topic.id, item);
            console.log('update highest score: ', item.id);
          } else {
            console.log('skip highest score: ', item.id);
          }
        });
      });

      // convert back the highest scores from all teams into a single array
      // example: [TopicScoreResult, TopicScoreResult, ...]
      const highestItems = Array.from(highestScores.values()).flatMap(
        (teamScores) => Array.from(teamScores.values())
      );

      // set the creator to the selected account
      for (const item of highestItems) {
        // item.creator = selectedAccount;
        await TopicScore.update({
          creator: selectedAccount,
        }).for(item);

        console.log(
          'saving TopicScore:',
          item.id,
          ', with account',
          selectedAccount.id
        );
      }

      // remove the other TopicScores
      // create a Set of IDs from highestItems to compare by ID instead of reference
      const highestItemIds = new Set(highestItems.map((item) => item.id));
      const allItems = await TopicScore.getAllOf(selectedAccount);
      for (const otherItem of allItems) {
        // compare by ID, not by reference (includes() uses reference equality which fails here)
        if (!highestItemIds.has(otherItem.id)) {
          console.log('removing TopicScore:', otherItem.id);
          await TopicScore.delete(otherItem);
        }
      }
      if (allItems.length > 0) {
        console.log('no TopicScores to remove');
      }
    }

    console.log('cleaned up TopicScore is done');
  }
}
