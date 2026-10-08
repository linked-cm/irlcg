import { linkedShape } from '../package.js';
import { Team } from './Team.js';
import { Action } from './Action.js';
import { irlcg } from '../ontologies/lincd-irlcg.js';
import { literalProperty, objectProperty } from '@_linked/core/shapes/SHACL';
import { xsd } from '@_linked/xsd/ontologies/xsd';
import { Server } from '@_linked/server-utils/utils/Server';
import { QResult } from '@_linked/core/queries/SelectQuery';
import { ImageObject } from '@_linked/schema/shapes/ImageObject';
import { Boolean } from '@_linked/xsd/shapes/Boolean';
import { ShapeSet } from '@_linked/core/collections/ShapeSet';

@linkedShape({
  description:
    'A unique kind of team created for specific events with start and end dates. Represents event-based teams with attendance tracking and time-bound participation. (event, event team)',
})
export class EventTeam extends Team {
  static targetClass = irlcg.EventTeam;

  @literalProperty({
    path: irlcg.startDate,
    datatype: xsd.dateTime,
    maxCount: 1,
  })
  get startDate(): Date {
    return undefined as any;
  }

  @literalProperty({
    path: irlcg.endDate,
    maxCount: 1,
    datatype: xsd.dateTime,
  })
  get endDate(): Date {
    return undefined as any;
  }

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

  @objectProperty({
    path: irlcg.action,
    shape: Action,
  })
  get actions(): ShapeSet<Action> {
    return undefined as any;
  }

  /**
   * Get EventTeam by ID or identifier
   *
   * @param teamId ID or identifier of the event team
   * @returns EventTeam or undefined if not found
   */
  static getEventTeamById(teamId: number | string) {
    return Server.call(this, 'getEventTeamById', teamId);
  }

  static getEventGameboard(teamUri: string): Promise<{
    showPeacegameLogo: boolean;
    eventLogo: QResult<
      ImageObject & {
        contentUrl: string;
      }
    > | null;
  }> {
    return Server.call(this, 'getEventGameboard', teamUri);
  }

  /**
   * Creates a new EventTeam
   *
   * @param name
   * @param subtitle
   * @param description introduction message
   * @param closingMessage
   * @param startDate
   * @param endDate
   * @param image
   * @param showPeacegameLogo
   * @param eventLogo
   * @param customIdentifier
   * @param actionIdentifiers
   * @returns
   */

  static createEventTeam(
    name: string,
    subtitle: string,
    description: string,
    closingMessage: string,
    startDate: Date,
    endDate: Date,
    image: { dataUrl: string; format: string },
    showPeacegameLogo?: boolean,
    eventLogo?: { dataUrl: string; format: string },
    customIdentifier?: string,
    actionIdentifiers?: string
  ) {
    return Server.call(
      this,
      'createEventTeam',
      name,
      subtitle,
      description,
      closingMessage,
      startDate,
      endDate,
      image,
      showPeacegameLogo,
      eventLogo,
      customIdentifier,
      actionIdentifiers
    );
  }

  static getAllEventTeams() {
    return Server.call(this, 'getAllEventTeams');
  }
  static isEventTeam(
    team: Team | EventTeam | QResult<Team>
  ): team is EventTeam {
    //TODO: make this better, probably with a type check
    if (!team) return false;
    const id = (team as QResult<Team>).id || (team as Team).id;
    if (id) {
      return id.includes('event-teams');
    }
    return false;
  }
}
