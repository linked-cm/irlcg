import { ShapeProvider } from '@_linked/server-utils/utils/ShapeProvider';
import { Meeting } from './Meeting.js';
import { Person } from '@_linked/schema/shapes/Person';
import { Team } from './Team.js';
export class MeetingProvider extends ShapeProvider {
  public shape = Meeting;

  async getRemainingMeeting(additionalMeeting) {
    let remainingMeeting = (await Meeting.selectAll()).length;

    if (remainingMeeting > 8) {
      return false;
    } else if (additionalMeeting) {
      return true;
    } else {
      return true;
    }
  }
}
