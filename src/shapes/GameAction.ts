import {
  EnforceSignedIn,
  UserAccountData,
  UserData,
} from '@_linked/auth/types/auth';
import { schema } from '@_linked/schema/ontologies/schema';
import { PlayAction } from '@_linked/schema/shapes/PlayAction';
import { Thing } from '@_linked/schema/shapes/Thing';
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
import type { ActionTemplateResult } from './ActionTemplate.js';
import { Player } from './Player.js';
import { Team } from './Team.js';
import { Topic } from './Topic.js';
import { TopicScore, type TopicScoreResult } from './TopicScore.js';

export type ActionsQuantityMap = Map<ActionTemplateResult, number>;
export type GameActionResult = QResult<
  GameAction,
  {
    quantity: number;
    team: QResult<Team>;
    objects: ActionTemplateResult[];
    topic: QResult<Topic>;
    agent: QResult<Player>;
  }
>;

// this is the result of the submit method
export type SubmitSuccessResult = {
  topicScore: TopicScoreResult;
  actions: GameActionResult[];
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
export class GameAction extends PlayAction {
  /**
   * indicates that instances of this shape need to have this rdf.type
   */
  static targetClass = irlcg.GameAction;

  /**
   * instances of this shape need to have exactly one value defined for the given property
   */

  @objectProperty({
    path: irlcg.topic,
    shape: Topic,
    minCount: 1,
    maxCount: 1,
    description: 'Topic/Action this action fulfills',
  })
  get topic(): Topic {
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
    path: schema.object,
    shape: Thing,
    minCount: 1,
    description: 'Action template this action fulfills',
  })
  get objects(): ShapeSet<Thing> {
    return undefined as any;
  }

  // ── Disallowed inherited properties from Action ──────────────────────
  // Keep: agent (submitter), objects (redefined above for action templates)

  @disallowProperty
  get actionStatus(): any {
    return undefined;
  }

  @disallowProperty
  get participant(): any {
    return undefined;
  }

  @disallowProperty
  get location(): any {
    return undefined;
  }

  @disallowProperty
  get startTime(): any {
    return undefined;
  }

  @disallowProperty
  get endTime(): any {
    return undefined;
  }

  // ── Disallowed inherited properties from Thing ──────────────────────

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

  static submit(
    topic: QResult<Topic>,
    actionsAndQuantity: ActionsQuantityMap,
    overwritePreviousSubmission: boolean = false,
    subPlayer?: Player | UserData
  ): Promise<SubmitResponse> {
    return Server.call(
      this,
      {
        method: 'submit',
        overwriteData: true,
      },
      topic,
      actionsAndQuantity,
      overwritePreviousSubmission,
      subPlayer
    ) as Promise<SubmitResponse>;
  }

  static getGameActionByTopic(topic: QResult<Topic>, player?: UserData) {
    return Server.call(this, 'getGameActionByTopic', topic, player);
  }
  static getAllOf(userAccount: UserAccount): Promise<ShapeSet<GameAction>> {
    return Server.call(this, 'getAllOf', userAccount);
  }

  static hasFinishedGame(
    userAccount: UserAccountData,
    team: Team | QResult<Team>
  ): Promise<boolean> {
    return Server.call(this, 'hasFinishedGame', userAccount, team);
  }
}
