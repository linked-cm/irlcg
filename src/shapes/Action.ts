import { ImageObject } from '@_linked/schema/shapes/ImageObject';
import { Thing } from '@_linked/schema/shapes/Thing';
import { Server } from '@_linked/server-utils/utils/Server';

import { ShapeSet } from '@_linked/core/collections/ShapeSet';
import { QResult } from '@_linked/core/queries/SelectQuery';
import {
  disallowProperty,
  literalProperty,
  objectProperty,
} from '@_linked/core/shapes/SHACL';
import { irlcg } from '../ontologies/lincd-irlcg.js';
import { linkedShape } from '../package.js';
import { ScoreConfiguration } from './score_config/ScoreConfiguration.js';
import { ActionOption, type ActionOptionResult } from './ActionOption.js';

/**
 * Copy form `Topic.ts` because we plan to refactor `Topic` to `Action`
 */

export type ActionResult = QResult<
  Action,
  {
    id: string;
    identifier: string;
    name: string;
    description: string;
    route?: string;
    actionOptions: ActionOptionResult[];
    scoreConfiguration: QResult<ScoreConfiguration>;
    image: QResult<ImageObject, { contentUrl: string }>;
  }
>;

@linkedShape({
  description:
    'A game topic representing a theme or category for actions. Also called "Action". Represents topics with score configurations, categories, and action template relationships. (action, step, task)',
})
export class Action extends Thing {
  /**
   * indicates that instances of this shape need to have this rdf.type
   */
  static targetClass = irlcg.Action;

  @objectProperty({
    path: irlcg.scoreConfiguration,
    shape: ScoreConfiguration,
    maxCount: 1,
    description: 'How actions are counted for this action.',
  })
  get scoreConfiguration(): ScoreConfiguration {
    return undefined as any;
  }

  @objectProperty({
    path: irlcg.hasInstance,
    shape: Action,
  })
  get actionInstances(): ShapeSet<Action> {
    return undefined as any;
  }

  @literalProperty({
    path: irlcg.category,
    maxCount: 1,
    description: 'A collection of related actions forming a broader theme.',
  })
  get category(): string {
    return '';
  }

  @literalProperty({
    path: irlcg.route,
    maxCount: 1,
    description:
      'The route path for this action in the application (e.g., /empowerment, /oneness).',
  })
  get route(): string {
    return '';
  }

  @objectProperty({
    path: irlcg.actionOption,
    shape: ActionOption,
    description: 'Action templates associated with this action.',
  })
  get actionOptions(): ShapeSet<ActionOption> {
    return undefined as any;
  }

  /**
   * Get an action by its identifier.
   * @param identifier The identifier of the action.
   * @returns The topic result if found, or an error object.
   */
  static getAction(
    identifier: string
  ): Promise<ActionResult | { error: string }> {
    return Server.call(this, 'getAction', identifier);
  }

  /**
   * Get main actions (action1-7) excluding event and special actions.
   * @returns A list of main actions.
   */
  static getActions(): Promise<ActionResult[]> {
    return Server.call(this, 'getActions');
  }

  /**
   * Get action type from action id.
   * This action type is hardcoded and not stored in the database.
   * Handles both ID (e.g., "https://.../action1") and plain identifiers (e.g., "action1", "PW1").
   *
   * @param id - Action id (can be URI, path, or plain identifier)
   * Examples:
   * - /action1, /action2, /action3, /action4, /action5, /action6, /action7
   * - /actionPW1, /actionPW2, /actionPW3, /actionPW4, /actionPW5, /actionPW6, /actionPW7
   * - /actionE2, /actionE3, /actionE4, /actionE5, /actionE6
   * - /actionEC2, /actionEC3, /actionEC4, /actionEC5, /actionEC6
   * - /actionED2, /actionED3, /actionED4
   * - /actionPF2
   * - https://example.com/data/action1
   * - action1, PW1, E2, EC3, PF2
   * @returns Action type: 'regular', 'peacewalk', 'event', 'eventC', 'district' or 'peaceFlame'
   */
  static getActionType(
    id: string
  ): 'regular' | 'event' | 'eventC' | 'peacewalk' | 'district' | 'peaceFlame' {
    if (!id) return 'regular';

    // extract action name from ID if needed
    // "https://example.com/data/action1" → "action1"
    // "/action1" → "action1"
    // "action1" → "action1"
    let actionName = id;
    if (id.includes('/')) {
      // Get the last segment after the last slash
      actionName = id.split('/').pop() || id;
    }

    // remove leading slash if present
    actionName = actionName.replace(/^\/+/, '');

    // convert to lowercase for comparison
    const lowerId = actionName.toLowerCase();

    // extract type identifier from action name
    // "action1" → "1" (regular)
    // "actionE2" → "E2" (event)
    // "actionPW1" → "PW1" (peacewalk)
    // "actionEC2" → "EC2" (eventC)
    // "actionPF2" → "PF2" (PeaceFlame)
    // remove "action" prefix if present to get the identifier part
    const identifier = lowerId.replace(/^action/, '');

    // check in order: PW, EC, then E (to avoid EC matching E)
    if (identifier.startsWith('pw')) return 'peacewalk';
    if (identifier === 'pf2') return 'peaceFlame';
    if (identifier.startsWith('ec')) return 'eventC';
    if (identifier.startsWith('ed')) return 'district';
    if (identifier.startsWith('e')) return 'event';

    // if no match, return regular
    return 'regular';
  }

  /**
   * Check if an action is event-based (not regular)
   *
   * @param id - Action id
   * @returns true if action is event, eventC, or peacewalk
   */
  static isEventAction(id: string): boolean {
    return this.getActionType(id) !== 'regular';
  }
}
