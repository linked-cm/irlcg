import {
  EnforceSignedIn,
  UserAccountData,
  UserData,
} from '@_linked/auth/types/auth';
import { PlayAction } from '@_linked/schema/shapes/PlayAction';
import { Server } from '@_linked/server-utils/utils/Server';
import { UserAccount } from '@_linked/sioc/shapes/UserAccount';
import { xsd } from '@_linked/xsd/ontologies/xsd';
import { ShapeSet } from '@_linked/core/collections/ShapeSet';

import { QResult } from '@_linked/core/queries/SelectQuery';
import {
  disallowProperty,
  literalProperty,
  objectProperty,
} from '@_linked/core/shapes/SHACL';
import { irlcg } from '../ontologies/lincd-irlcg.js';
import { linkedShape } from '../package.js';
import { Player } from './Player.js';
import { Team } from './Team.js';
import { ActionOption, type ActionOptionResult } from './ActionOption.js';
import { Action } from './Action.js';
import type { ActionTotalResult } from './ActionTotal.js';
import { Event } from './Event.js';

/**
 * Copy from `GameAction.ts` because we plan to refactor `GameAction` to `ActionSubmission`
 */

export type ActionsQuantityMap = Map<ActionOptionResult, number>;
export type ActionsQuantityEntries = Array<
  [option: QResult<ActionOption>, quantity: number]
>;
export type ActionSubmissionResult = QResult<
  ActionSubmission,
  {
    quantity: number;
    team: QResult<Team>;
    option: ActionOptionResult;
    action: QResult<Action>;
    agent: QResult<Player>;
    event?: QResult<Event>;
  }
>;

// this is the result of the submit method
export type SubmitSuccessResult = {
  actionTotal: ActionTotalResult;
  actions: ActionSubmissionResult[];
  justFinishedGame: boolean;
  user: UserData & {
    givenName?: string;
    familyName?: string;
  };
};

// this is the response of the submit method
export type SubmitResponse =
  | SubmitSuccessResult
  | { error: string }
  | EnforceSignedIn;

@linkedShape({
  description:
    "A player's submission of points for completing a specific action within a topic/action. Has quantity of actions, the team, and action template (using the 'object' property) relationships. (submission, score, entry)",
})
export class ActionSubmission extends PlayAction {
  /**
   * indicates that instances of this shape need to have this rdf.type
   */
  static targetClass = irlcg.ActionSubmission;

  /**
   * instances of this shape need to have exactly one value defined for the given property
   */
  @objectProperty({
    path: irlcg.action,
    shape: Action,
    minCount: 1,
    maxCount: 1,
    description: 'Action this action fulfills',
  })
  get action(): Action {
    return undefined as any;
  }

  @literalProperty({
    datatype: xsd.integer,
    path: irlcg.quantity,
    description: 'Number of action(s) completed',
    maxInclusive: 1_000,
    maxCount: 1,
  })
  get quantity(): number {
    return 0;
  }

  @objectProperty({
    path: irlcg.team,
    shape: Team,
    minCount: 1,
    maxCount: 1,
    description: 'Team the user was in when they completed the action',
  })
  get team(): Team {
    return undefined as any;
  }

  @objectProperty({
    path: irlcg.option,
    shape: ActionOption,
    minCount: 1,
    maxCount: 1,
    description: 'Action option this action fulfills',
  })
  get option(): ActionOption {
    return undefined as any;
  }

  @objectProperty({
    path: irlcg.event,
    description:
      'Event context for this action submission. Links to the Event this submission belongs to.',
    maxCount: 1,
    required: false,
    shape: Event,
  })
  get event(): Event {
    return undefined as any;
  }

  static submit(
    action: QResult<Action>,
    actionsAndQuantity: ActionsQuantityMap,
    overwritePreviousSubmission: boolean = false,
    subPlayer?: UserAccountData | Player | UserData
  ): Promise<SubmitResponse> {
    const entries: ActionsQuantityEntries = Array.from(
      actionsAndQuantity,
      ([option, quantity]) => [{ id: option.id }, quantity]
    );

    return Server.call(
      this,
      {
        method: 'submit',
        overwriteData: true,
      },
      action,
      entries,
      overwritePreviousSubmission,
      subPlayer
    ) as Promise<SubmitResponse>;
  }

  static getActionSubmissionByAction(
    action: QResult<Action>,
    player?: UserData
  ) {
    return Server.call(this, 'getActionSubmissionByAction', action, player);
  }

  static getAllOf(
    userAccount: UserAccount
  ): Promise<ShapeSet<ActionSubmission>> {
    return Server.call(this, 'getAllOf', userAccount);
  }

  static hasFinishedGame(
    userAccount: UserAccountData,
    team: Team | QResult<Team>
  ): Promise<boolean> {
    return Server.call(this, 'hasFinishedGame', userAccount, team);
  }
}
