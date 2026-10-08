import { linkedShape } from '../package.js';
import { Action, type ActionResult } from './Action.js';
import { irlcg } from '../ontologies/lincd-irlcg.js';
import { literalProperty, objectProperty } from '@_linked/core/shapes/SHACL';
import { xsd } from '@_linked/xsd/ontologies/xsd';
import { ImageObject } from '@_linked/schema/shapes/ImageObject';
import { Boolean } from '@_linked/xsd/shapes/Boolean';
import { ShapeSet } from '@_linked/core/collections/ShapeSet';
import { Event as SchemaEvent } from '@_linked/schema/shapes/Event';
import { Server } from '@_linked/server-utils/utils/Server';
import { QResult } from '@_linked/core/queries/SelectQuery';
import { type Team } from './Team.js';

export type ImageObjectResult = QResult<ImageObject, { contentUrl: string }>;

export type EventResult = QResult<
  SchemaEvent,
  {
    identifier: string;
    name: string;
    actions: ActionResult[];
    description?: string;
    alternateName?: string;
    startDate?: Date;
    endDate?: Date;
    image: ImageObjectResult | null;
    disambiguatingDescription?: string; // a closing message that will appear at the end of the event or last action.
    showPeacegameLogo?: boolean; // whether to show the Peacegame logo at the end of the event or last action.
    isEventMode?: boolean; // true = event mode (simplified menu, event totals); false = regular mode
    allowTeamSelection?: boolean; // when true, signup can choose among teams associated with this event instead of always using the default team
    pinned?: boolean; // pinned events are sorted to the top of quick-event lists
    purpleTheme?: boolean; // use the purple Torch of Peace card treatment
    route?: string; // optional app route used instead of event registration
    eventLogo?: ImageObjectResult | null;
    defaultTeam?:
      | (QResult<Team> & {
          identifier?: string;
        })
      | null;
  }
>;

@linkedShape({
  description:
    'A unique kind of team created for specific events with start and end dates. Represents event-based teams with attendance tracking and time-bound participation. (event, event team)',
})
export class Event extends SchemaEvent {
  static targetClass = irlcg.Event;

  @literalProperty({
    path: irlcg.attendance,
    // required: true,
    datatype: xsd.string,
    maxCount: 1,
    description:
      'Indicates if this event is in person (at a physical location) or from home (online).',
  })
  get attendance(): string {
    return '';
  }

  @objectProperty({
    path: irlcg.eventLogo,
    shape: ImageObject,
    maxCount: 1,
  })
  get eventLogo(): ImageObject {
    return undefined as any;
  }

  @literalProperty({
    path: irlcg.showPeacegameLogo,
    datatype: Boolean.targetClass,
    required: false,
    maxCount: 1,
  })
  get showPeacegameLogo(): boolean {
    return false;
  }

  @literalProperty({
    path: irlcg.attendanceInPerson,
    datatype: Boolean.targetClass,
    required: false,
    maxCount: 1,
  })
  get attendanceInPerson(): boolean {
    return false;
  }

  @literalProperty({
    path: irlcg.attendanceHome,
    datatype: Boolean.targetClass,
    required: false,
    maxCount: 1,
  })
  get attendanceHome(): boolean {
    return false;
  }

  @literalProperty({
    path: irlcg.isEventMode,
    datatype: Boolean.targetClass,
    required: false,
    maxCount: 1,
    description:
      'Event mode: true = simplified menu, event totals, event gameboard; false = full menu, regular totals.',
  })
  get isEventMode(): boolean {
    return false;
  }

  @literalProperty({
    path: irlcg.allowTeamSelection,
    datatype: Boolean.targetClass,
    required: false,
    maxCount: 1,
    description:
      'Controls whether event registration can show a team selector. When enabled, signup may choose the default team or another team already associated with the event.',
  })
  get allowTeamSelection(): boolean {
    return false;
  }

  @literalProperty({
    path: irlcg.pinned,
    datatype: Boolean.targetClass,
    required: false,
    maxCount: 1,
    description: 'Pins this event to the top of quick-event lists.',
  })
  get pinned(): boolean {
    return false;
  }

  @literalProperty({
    path: irlcg.purpleTheme,
    datatype: Boolean.targetClass,
    required: false,
    maxCount: 1,
    description: 'Uses the purple featured-event card theme.',
  })
  get purpleTheme(): boolean {
    return false;
  }

  @literalProperty({
    path: irlcg.route,
    datatype: xsd.string,
    required: false,
    maxCount: 1,
    description:
      'Optional application route opened by this event card instead of registration.',
  })
  get route(): string {
    return '';
  }

  @objectProperty({
    path: irlcg.action,
    shape: Action,
  })
  get actions(): ShapeSet<Action> {
    return undefined as any;
  }

  @objectProperty({
    path: irlcg.defaultTeam,
    // shape: Team,
    shape: ['@_linked/irlcg', 'Team'],
    maxCount: 1,
  })
  get defaultTeam(): Team {
    return undefined as any;
  }

  /**
   * Get Event by ID or identifier
   *
   * @param eventId ID or identifier of the event
   * @returns Event or undefined if not found
   */
  static getOne(eventId: number | string) {
    return Server.call(this, 'getOne', eventId);
  }

  static findGameboard(eventId: string): Promise<{
    showPeacegameLogo: boolean;
    eventLogo: ImageObjectResult | null;
  }> {
    return Server.call(this, 'findGameboard', eventId);
  }

  /**
   * Get all events (no date filtering).
   *
   * @returns Promise resolving to array of all events with id, identifier, name, description, and image
   */
  static getAll(): Promise<EventResult[] | null> {
    return Server.call(this, 'getAll');
  }

  /**
   * Get active events only.
   * Returns only events that have both startDate and endDate and are currently active
   * (start date <= today <= end date). Events without dates are excluded.
   *
   * @returns Promise resolving to array of active events with id, identifier, name, description, and image
   */
  static getActive(): Promise<EventResult[] | null> {
    return Server.call(this, 'getActive');
  }
}
