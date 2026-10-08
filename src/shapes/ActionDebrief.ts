import { UserAccountData } from '@_linked/auth/types/auth';
import { Thing } from '@_linked/schema/shapes/Thing';
import { Server } from '@_linked/server-utils/utils/Server';
import { sioc } from '@_linked/sioc/ontologies/sioc';
import { UserAccount } from '@_linked/sioc/shapes/UserAccount';
import { QResult } from '@_linked/core/queries/SelectQuery';
import {
  disallowProperty,
  literalProperty,
  objectProperty,
} from '@_linked/core/shapes/SHACL';
import { irlcg } from '../ontologies/lincd-irlcg.js';
import { linkedShape } from '../package.js';
import { Team } from './Team.js';
import { Action } from './Action.js';
import { Event } from './Event.js';

export type ActionDebriefResult = QResult<
  ActionDebrief,
  {
    creator: UserAccountData;
    team: QResult<Team>;
    action: QResult<Action>;
    event?: QResult<Event>;
    debriefplanGrowingEdge: string;
    debriefactionsTaken: string;
    debriefDescription: string;
    debriefLearnings: string;
    debriefProblems: string;
  }
>;

@linkedShape({
  description:
    'Player reflection capturing lessons learned, challenges faced, and personal growth areas from game activities (debrief, reflection, review, assessment)',
})
export class ActionDebrief extends Thing {
  static targetClass = irlcg.ActionDebrief;

  @objectProperty({
    path: sioc.has_creator,
    description: 'Player who authored this reflection',
    shape: UserAccount,
    minCount: 1,
    maxCount: 1,
  })
  get creator(): UserAccount {
    return undefined as any;
  }

  @objectProperty({
    path: irlcg.team,
    description: 'Team context for this debrief',
    shape: Team,
    minCount: 1,
    maxCount: 1,
  })
  get team(): Team {
    return undefined as any;
  }

  @objectProperty({
    path: irlcg.action,
    shape: Action,
    minCount: 1,
    maxCount: 1,
    description: 'Action being reflected upon (Subject, Action)',
  })
  get action(): Action {
    return undefined as any;
  }

  @objectProperty({
    path: irlcg.event,
    description:
      'Event context for this action debrief. Links to the Event this debrief belongs to.',
    maxCount: 1,
    required: false,
    shape: Event,
  })
  get event(): Event {
    return undefined as any;
  }

  @literalProperty({
    path: irlcg.debriefplanGrowingEdge,
    maxCount: 1,
    description:
      'Personal development frontier where player is actively evolving and pushing boundaries',
  })
  get debriefplanGrowingEdge(): string {
    return '';
  }

  @literalProperty({
    path: irlcg.debriefactionsTaken,
    maxCount: 1,
    description: 'Specific actions completed during this activity',
  })
  get debriefactionsTaken(): string {
    return '';
  }

  @literalProperty({
    path: irlcg.debriefDescription,
    maxCount: 1,
    description: 'Overview summary of the experience',
  })
  get debriefDescription(): string {
    return '';
  }

  @literalProperty({
    path: irlcg.debriefLearnings,
    maxCount: 1,
    description: 'Key insights and knowledge gained from experience',
  })
  get debriefLearnings(): string {
    return '';
  }
  @literalProperty({
    path: irlcg.debriefProblems,
    maxCount: 1,
    description: 'Obstacles, difficulties, or challenges encountered',
  })
  get debriefProblems(): string {
    return '';
  }

  static loadActionDebrief(action: QResult<Action>) {
    return Server.call(this, 'loadActionDebrief', action);
  }

  static getAllOf(creator: UserAccountData): Promise<ActionDebriefResult[]> {
    return Server.call(this, 'getAllOf', creator);
  }

  static async cleanupAction(
    accounts: UserAccountData[],
    selectedAccount: UserAccountData,
    scoreFn: (item: ActionDebriefResult) => number
  ) {
    console.log(`cleaning up ActionDebrief...`);

    // get all for all accounts in the group
    // normally will get 2 accounts with all the ActionDebriefs by the accounts
    const items = await Promise.all(
      accounts.map((userAccountData) => {
        return ActionDebrief.getAllOf(userAccountData);
      })
    );

    if (items.length >= 1) {
      // map to store highest scores by team and action
      // the reason to map the team because we need to make sure the data is not duplicated or removed when compare
      const highestScores = new Map<string, Map<string, ActionDebriefResult>>();

      // map to store the ActionTotal by team
      const teamMap = new Map<string, ActionDebriefResult[]>();

      // group ActionDebrief items by team
      items.forEach((itemSet) => {
        itemSet.forEach((item: ActionDebriefResult) => {
          const teamId = item?.team?.id;
          const actionId = item?.action?.id;
          if (!teamId || !actionId) {
            throw new Error(
              `Cannot merge ActionDebrief ${item.id}: missing team or action reference`
            );
          }
          if (!teamMap.has(teamId)) {
            teamMap.set(teamId, []);
          }
          teamMap.get(teamId)?.push(item);
        });
      });

      teamMap.forEach((itemSet, teamId) => {
        itemSet.forEach((item: ActionDebriefResult) => {
          const actionId = item.action.id;
          const eventId = item.event?.id || '__no_event__';
          const actionEventKey = `${actionId}\u0000${eventId}`;
          const score = scoreFn(item);

          // check if teamId exists in the highestScores map
          // to make sure compare data on the same team
          if (!highestScores.has(teamId)) {
            highestScores.set(teamId, new Map<string, ActionDebriefResult>());
          }

          const teamScores = highestScores.get(teamId)!;
          const highestScoreItem = teamScores.get(actionEventKey);
          const highestScore = highestScoreItem ? scoreFn(highestScoreItem) : 0;

          // compare the same action and keep the highest score
          if (!highestScoreItem || score > highestScore) {
            teamScores.set(actionEventKey, item);
            console.log('update highest score: ', item.id);
          } else {
            console.log('skip highest score: ', item.id);
          }
        });
      });

      // convert back the highest scores from all teams into a single array
      // example: [ActionDebriefResult, ActionDebriefResult, ...]
      const highestItems = Array.from(highestScores.values()).flatMap(
        (teamScores) => Array.from(teamScores.values())
      );

      // connect the final account and preserve all fields
      for (const item of highestItems) {
        await ActionDebrief.update({
          creator: { id: selectedAccount.id },
        }).for(item);

        console.log(
          'saving ActionDebrief:',
          item.id,
          ', with account',
          selectedAccount.id
        );
      }

      // remove the other ActionDebriefs
      // create a Set of IDs from highestItems to compare by ID instead of reference
      const highestItemIds = new Set(highestItems.map((item) => item.id));
      // Delete losers from the original cross-account result set. Re-querying
      // only the selected account misses losing records still owned by a
      // source account, which would become orphaned when that account is removed.
      const allItems = items.flat();
      for (const otherItem of allItems) {
        // compare by ID, not by reference (includes() uses reference equality which fails here)
        if (!highestItemIds.has(otherItem.id)) {
          console.log('removing ActionDebrief:', otherItem.id);
          await ActionDebrief.delete({ id: otherItem.id });
        }
      }
      if (allItems.length === highestItems.length) {
        console.log('no ActionDebriefs to remove');
      }
    }

    console.log(`clean ActionDebrief is done.`);
  }

  // ── Disallowed inherited properties from Thing ──────────────────────
  // ActionDebrief uses only its own custom debrief properties

  @disallowProperty
  get name(): any {
    return undefined;
  }

  @disallowProperty
  get alternateName(): any {
    return undefined;
  }

  @disallowProperty
  get description(): any {
    return undefined;
  }

  @disallowProperty
  get disambiguatingDescription(): any {
    return undefined;
  }

  @disallowProperty
  get identifier(): any {
    return undefined;
  }

  @disallowProperty
  get image(): any {
    return undefined;
  }

  @disallowProperty
  get url(): any {
    return undefined;
  }

  @disallowProperty
  get additionalType(): any {
    return undefined;
  }
}
