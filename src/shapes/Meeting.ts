import { Event } from '@_linked/schema/shapes/Event';
import { irlcg } from '../ontologies/lincd-irlcg.js';

import {
  disallowProperty,
  literalProperty,
  objectProperty,
} from '@_linked/core/shapes/SHACL';
import { linkedShape } from '../package.js';
import { Server } from '@_linked/server-utils/utils/Server';
import { UserAccount } from '@_linked/sioc/shapes/UserAccount';
import { Person } from '@_linked/schema/shapes/Person';
import { sioc } from '@_linked/sioc/ontologies/sioc';

@linkedShape({
  description:
    'A team meeting event. Represents scheduled gatherings with meeting type (in person or online). (gathering, session, assembly)',
})
export class Meeting extends Event {
  static targetClass = irlcg.Meeting;

  @literalProperty({
    path: irlcg.meetingType,
    maxCount: 1,
    in: ['inPerson', 'online', 'hybrid'],
    description: 'Meeting format (inPerson, online, hybrid)',
  })
  get meetingType(): string {
    return '';
  }

  static getRemainingMeeting(additional: boolean) {
    return Server.call(this, 'getRemainingMeeting', additional);
  }

  // ── Disallowed inherited properties from schema Event ─────────────
  // Keep: startDate, endDate (from Event), name, description (from Thing)

  @disallowProperty
  get attendees(): any {
    return undefined;
  }

  @disallowProperty
  get location(): any {
    return undefined;
  }

  @disallowProperty
  get superEvent(): any {
    return undefined;
  }

  @disallowProperty
  get image(): any {
    return undefined;
  }

  // ── Disallowed inherited properties from Thing ──────────────────────

  @disallowProperty
  get alternateName(): any {
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
  get url(): any {
    return undefined;
  }

  @disallowProperty
  get additionalType(): any {
    return undefined;
  }
}
