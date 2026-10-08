import { UserAccountData } from '@_linked/auth/types/auth';
import { Thing } from '@_linked/schema/shapes/Thing';
import { Server } from '@_linked/server-utils/utils/Server';
import { sioc } from '@_linked/sioc/ontologies/sioc';
import { UserAccount } from '@_linked/sioc/shapes/UserAccount';
import { xsd } from '@_linked/xsd/ontologies/xsd';
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

export type ActionPlanResult = QResult<
  ActionPlan,
  {
    creator: UserAccountData;
    team: QResult<Team>;
    action: QResult<Action>;
    event?: QResult<Event>;
    planGrowingEdge: string;
    planIntentionStatement: string;
    intendedMedal: number;
    planTeamSupport: string;
    scheduledTime1: Date;
    scheduledTime2: Date;
    scheduledTime3: Date;
    scheduledTime4: Date;
    scheduledTime5: Date;
    scheduledTime6: Date;
    scheduledTime7: Date;
    scheduledTimeEnd1: Date;
    scheduledTimeEnd2: Date;
    scheduledTimeEnd3: Date;
    scheduledTimeEnd4: Date;
    scheduledTimeEnd5: Date;
    scheduledTimeEnd6: Date;
    scheduledTimeEnd7: Date;
  }
>;

@linkedShape({
  description:
    "Player's planned actions for an action including goals, growing edge, schedule, and intended outcomes (plan, strategy, intentions, commitment)",
})
export class ActionPlan extends Thing {
  static targetClass = irlcg.ActionPlan;

  @objectProperty({
    path: sioc.has_creator,
    minCount: 1,
    maxCount: 1,
    description: 'Player who created this plan',
    shape: UserAccount,
  })
  get creator(): UserAccount {
    return undefined as any;
  }

  @objectProperty({
    path: irlcg.team,
    description: 'Team context for this plan',
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
    description: 'Action this action plan is for',
  })
  get action(): Action {
    return undefined as any;
  }

  @objectProperty({
    path: irlcg.event,
    description:
      'Event context for this action plan. Links to the Event this plan belongs to.',
    maxCount: 1,
    required: false,
    shape: Event,
  })
  get event(): Event {
    return undefined as any;
  }

  @literalProperty({
    path: irlcg.planGrowingEdge,
    maxCount: 1,
    description: 'Personal development frontier player intends to explore',
  })
  get planGrowingEdge(): string {
    return '';
  }

  @literalProperty({
    path: irlcg.planIntentionStatement,
    maxCount: 1,
    description: 'Commitment statement of what player will accomplish',
  })
  get planIntentionStatement(): string {
    return '';
  }

  @literalProperty({
    path: irlcg.intendedMedal,
    datatype: xsd.integer,
    maxCount: 1,
    in: [1, 2, 3],
    description: 'Target achievement level (1=bronze, 2=silver, 3=gold)',
  })
  get intendedMedal(): number {
    return 0;
  }

  @literalProperty({
    path: irlcg.planTeamSupport,
    maxCount: 1,
    description: 'Support needed from team to achieve plan',
  })
  get planTeamSupport(): string {
    return '';
  }

  @literalProperty({
    path: irlcg.scheduledTime1,
    datatype: xsd.dateTime,
    maxCount: 1,
    description: 'First scheduled time slot for action',
  })
  get scheduledTime1(): Date {
    return null as any;
  }

  @literalProperty({
    path: irlcg.scheduledTime2,
    datatype: xsd.dateTime,
    maxCount: 1,
    description: 'Second scheduled time slot for action',
  })
  get scheduledTime2(): Date {
    return null as any;
  }

  @literalProperty({
    path: irlcg.scheduledTime3,
    datatype: xsd.dateTime,
    maxCount: 1,
    description: 'Third scheduled time slot for action',
  })
  get scheduledTime3(): Date {
    return null as any;
  }

  @literalProperty({
    path: irlcg.scheduledTime4,
    datatype: xsd.dateTime,
    maxCount: 1,
    description: 'Fourth scheduled time slot for action',
  })
  get scheduledTime4(): Date {
    return null as any;
  }

  @literalProperty({
    path: irlcg.scheduledTime5,
    datatype: xsd.dateTime,
    maxCount: 1,
    description: 'Fifth scheduled time slot for action',
  })
  get scheduledTime5(): Date {
    return null as any;
  }
  @literalProperty({
    path: irlcg.scheduledTime6,
    datatype: xsd.dateTime,
    maxCount: 1,
    description: 'Sixth scheduled time slot for action',
  })
  get scheduledTime6(): Date {
    return null as any;
  }

  @literalProperty({
    path: irlcg.scheduledTime7,
    datatype: xsd.dateTime,
    maxCount: 1,
    description: 'Seventh scheduled time slot for action',
  })
  get scheduledTime7(): Date {
    return null as any;
  }

  @literalProperty({
    path: irlcg.scheduledTimeEnd1,
    datatype: xsd.dateTime,
    maxCount: 1,
    description: 'End time for first scheduled time slot',
  })
  get scheduledTimeEnd1(): Date {
    return null as any;
  }

  @literalProperty({
    path: irlcg.scheduledTimeEnd2,
    datatype: xsd.dateTime,
    maxCount: 1,
    description: 'End time for second scheduled time slot',
  })
  get scheduledTimeEnd2(): Date {
    return null as any;
  }

  @literalProperty({
    path: irlcg.scheduledTimeEnd3,
    datatype: xsd.dateTime,
    maxCount: 1,
    description: 'End time for third scheduled time slot',
  })
  get scheduledTimeEnd3(): Date {
    return null as any;
  }

  @literalProperty({
    path: irlcg.scheduledTimeEnd4,
    datatype: xsd.dateTime,
    maxCount: 1,
    description: 'End time for fourth scheduled time slot',
  })
  get scheduledTimeEnd4(): Date {
    return null as any;
  }

  @literalProperty({
    path: irlcg.scheduledTimeEnd5,
    datatype: xsd.dateTime,
    maxCount: 1,
    description: 'End time for fifth scheduled time slot',
  })
  get scheduledTimeEnd5(): Date {
    return null as any;
  }

  @literalProperty({
    path: irlcg.scheduledTimeEnd6,
    datatype: xsd.dateTime,
    maxCount: 1,
    description: 'End time for sixth scheduled time slot',
  })
  get scheduledTimeEnd6(): Date {
    return null as any;
  }

  @literalProperty({
    path: irlcg.scheduledTimeEnd7,
    datatype: xsd.dateTime,
    maxCount: 1,
    description: 'End time for seventh scheduled time slot',
  })
  get scheduledTimeEnd7(): Date {
    return null as any;
  }

  static loadActionPlan(action: QResult<Action>) {
    return Server.call(this, 'loadActionPlan', action);
  }

  static getAllOf(creator: UserAccountData): Promise<ActionPlanResult[]> {
    return Server.call(this, 'getAllOf', creator);
  }

  static async cleanupAction(
    accounts: UserAccountData[],
    selectedAccount: UserAccountData,
    scoreFn: (item: ActionPlanResult) => number
  ) {
    console.log(`cleaning up ActionPlan...`);

    // get all for all accounts in the group
    // normally will get 2 accounts with all the ActionPlans by the accounts
    const items = await Promise.all(
      accounts.map((userAccountData) => ActionPlan.getAllOf(userAccountData))
    );

    if (items.length >= 1) {
      // map to store highest scores by team and action
      // the reason to map the team because we need to make sure the data is not duplicated or removed when compare
      const highestScores = new Map<string, Map<string, ActionPlanResult>>();

      // map to store the ActionPlan by team
      const teamMap = new Map<string, ActionPlanResult[]>();

      // group ActionPlan items by team
      items.forEach((itemSet) => {
        itemSet.forEach((item: ActionPlanResult) => {
          const teamId = item?.team?.id;
          const actionId = item?.action?.id;
          if (!teamId || !actionId) {
            throw new Error(
              `Cannot merge ActionPlan ${item.id}: missing team or action reference`
            );
          }
          if (!teamMap.has(teamId)) {
            teamMap.set(teamId, []);
          }
          teamMap.get(teamId)?.push(item);
        });
      });

      teamMap.forEach((itemSet, teamId) => {
        itemSet.forEach((item: ActionPlanResult) => {
          const actionId = item.action.id;
          const eventId = item.event?.id || '__no_event__';
          const actionEventKey = `${actionId}\u0000${eventId}`;
          const score = scoreFn(item);

          // check if teamId exists in the highestScores map
          // to make sure compare data on the same team
          if (!highestScores.has(teamId)) {
            highestScores.set(teamId, new Map<string, ActionPlanResult>());
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
      // example: [ActionPlanResult, ActionPlanResult, ...]
      const highestItems = Array.from(highestScores.values()).flatMap(
        (teamScores) => Array.from(teamScores.values())
      );

      // connect the final account and preserve all fields
      for (const item of highestItems) {
        await ActionPlan.update({
          creator: { id: selectedAccount.id },
        }).for(item);

        console.log(
          'saving ActionPlan:',
          item.id,
          ', with account',
          selectedAccount.id
        );
      }

      // remove the other ActionPlans
      // create a Set of IDs from highestItems to compare by ID instead of reference
      const highestItemIds = new Set(highestItems.map((item) => item.id));
      // Use the original cross-account records so losers owned by a source
      // account are removed before that account is deleted.
      const allItems = items.flat();
      for (const otherItem of allItems) {
        // compare by ID, not by reference (includes() uses reference equality which fails here)
        if (!highestItemIds.has(otherItem.id)) {
          console.log('removing ActionPlan:', otherItem.id);
          await ActionPlan.delete({ id: otherItem.id });
        }
      }
      if (allItems.length === highestItems.length) {
        console.log('no ActionPlans to remove');
      }
    }

    console.log(`clean ActionPlan is done.`);
  }

  // ── Disallowed inherited properties from Thing ──────────────────────
  // ActionPlan uses only its own custom properties (planGrowingEdge, etc.)

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
