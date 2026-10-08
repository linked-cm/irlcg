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
import { Action } from './Action.js';
import { Event } from './Event.js';

/**
 * Copy from `TopicScore` because we plan to refactor TopicScore to ActionTotal
 */

export type ActionTotalResult = QResult<
  ActionTotal,
  {
    creator: UserAccountData;
    action: QResult<Action>;
    team: QResult<Team>;
    event?: QResult<Event>;
    medal: number;
    score: number;
    images?: QResult<ImageObject, { contentUrl: string }>[] | null;
  }
>;

export type GameBoardTotalsResult = {
  totalPlayer: number;
  totalActions: number;
  myActionTotals: {
    myActionTotals: Record<string, number>;
    myMedalAction: Record<string, number>;
  };
  teamActionTotals: {
    teamActionTotals: Record<string, number>;
  };
  globalActionTotal: {
    globalActionTotal: Record<string, number>;
  };
};

@linkedShape({
  description:
    "A player's total count of actions for a topic & team. Links to UserAccount, not the Player itself. Has team relationships, medal achievements and optional uploaded images for this topic. (score, points, achievement)",
})
export class ActionTotal extends Shape {
  static targetClass = irlcg.ActionTotal;

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
    path: irlcg.action,
    shape: Action,
    minCount: 1,
    maxCount: 1,
    description: 'Action this score is associated with.',
  })
  get action(): Action {
    return undefined as any;
  }

  //store the team
  @objectProperty({
    path: irlcg.team,
    description: 'Team context for this action total.',
    minCount: 1,
    maxCount: 1,
    shape: Team,
  })
  get team(): Team {
    return undefined as any;
  }

  @objectProperty({
    path: irlcg.event,
    description:
      'Event context for this action total. Links to the Event this score belongs to.',
    maxCount: 1,
    required: false,
    shape: Event,
  })
  get event(): Event {
    return undefined as any;
  }

  @literalProperty({
    path: irlcg.medal,
    datatype: xsd.integer,
    minInclusive: 1,
    maxInclusive: 3,
    maxCount: 1,
    in: [1, 2, 3],
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
    action: QResult<Action>,
    creator: UserAccountData, // | UserData | Player,
    currentTeam: QResult<Team>,
    event?: { id: string }
  ): Promise<ActionTotalResult> {
    return Server.call(
      this,
      'getOrCreateActionTotal',
      action,
      creator,
      currentTeam,
      event
    );
  }

  static getGameBoardTotals(): Promise<GameBoardTotalsResult> {
    return Server.call(this, 'getGameBoardTotals');
  }

  static getEventTotals(eventUri?: string): Promise<EventTotals> {
    return Server.call(this, 'getEventTotals', eventUri);
  }

  static getMyActionTotals(
    userAccount: QResult<UserAccount>,
    allTeams: boolean = false
  ): Promise<{
    myActionTotals: Record<string, number>;
    myMedalAction: Record<string, number>;
  }> {
    return Server.call(this, 'getMyActionTotals', userAccount, allTeams);
  }

  static getAllOf(creator: UserAccountData): Promise<ActionTotalResult[]> {
    return Server.call(this, 'getAllOf', creator);
  }

  static getAllOfByUser(
    user: UserData,
    currentTeam?: QResult<Team>
  ): Promise<ActionTotal[]> {
    return Server.call(this, 'getAllOfByUser', user, currentTeam);
  }

  static getAllOfByUsers(
    users: UserData[],
    currentTeam: QResult<Team>
  ): Promise<Record<string, ActionTotal[]>> {
    return Server.call(this, 'getAllOfByUsers', users, currentTeam);
  }

  static async cleanupActionTotal(
    accounts: UserAccountData[],
    selectedAccount: UserAccountData
  ) {
    console.log('cleaning up ActionTotal...');
    // get all for all accounts in the group
    // normally will get 2 accounts with all the ActionTotals by the accounts
    const items = await Promise.all(
      accounts.map((userAccountData: UserAccountData) => {
        return ActionTotal.getAllOf(userAccountData);
      })
    );

    if (items.length >= 1) {
      // map to store highest scores by team and topic
      // the reason to map the team because we need to make sure the data is not duplicated or removed when compare
      const highestScores = new Map<string, Map<string, ActionTotalResult>>();

      // map to store the ActionTotal by team
      const teamMap = new Map<string, ActionTotalResult[]>();

      // group ActionTotal items by team
      items.forEach((itemSet) => {
        itemSet.forEach((item: ActionTotalResult) => {
          const teamId = item?.team?.id;
          const actionId = item?.action?.id;
          if (!teamId || !actionId) {
            throw new Error(
              `Cannot merge ActionTotal ${item.id}: missing team or action reference`
            );
          }
          if (!teamMap.has(teamId)) {
            teamMap.set(teamId, []);
          }
          teamMap.get(teamId)?.push(item);
        });
      });

      teamMap.forEach((itemSet, teamId) => {
        itemSet.forEach((item: ActionTotalResult) => {
          const action = item.action;
          const score = item.score;
          const eventId = item.event?.id || '__no_event__';
          const actionEventKey = `${action.id}\u0000${eventId}`;

          // check if teamId exists in the highestScores map
          // to make sure compare data on the same team
          if (!highestScores.has(teamId)) {
            highestScores.set(teamId, new Map<string, ActionTotalResult>());
          }

          const teamScores = highestScores.get(teamId)!;
          const highestScoreItem = teamScores.get(actionEventKey);
          const highestScore = highestScoreItem?.score || 0;

          // compare the same topic and keep the highest score
          if (!highestScoreItem || score > highestScore) {
            item.score = score;
            teamScores.set(actionEventKey, item);
            console.log('update highest score: ', item.id);
          } else {
            console.log('skip highest score: ', item.id);
          }
        });
      });

      // convert back the highest scores from all teams into a single array
      // example: [ActionTotalResult, ActionTotalResult, ...]
      const highestItems = Array.from(highestScores.values()).flatMap(
        (teamScores) => Array.from(teamScores.values())
      );

      // set the creator to the selected account
      for (const item of highestItems) {
        // item.creator = selectedAccount;
        await ActionTotal.update({
          creator: { id: selectedAccount.id },
        }).for(item);

        console.log(
          'saving ActionTotal:',
          item.id,
          ', with account',
          selectedAccount.id
        );
      }

      // remove the other TopicScores
      // create a Set of IDs from highestItems to compare by ID instead of reference
      const highestItemIds = new Set(highestItems.map((item) => item.id));
      // Use the original cross-account records so losers owned by a source
      // account are removed before that account is deleted.
      const allItems = items.flat();
      for (const otherItem of allItems) {
        // compare by ID, not by reference (includes() uses reference equality which fails here)
        if (!highestItemIds.has(otherItem.id)) {
          console.log('removing ActionTotal:', otherItem.id);
          await ActionTotal.delete({ id: otherItem.id });
        }
      }
      if (allItems.length === highestItems.length) {
        console.log('no ActionTotals to remove');
      }
    }

    console.log('cleaned up ActionTotal is done');
  }
}
