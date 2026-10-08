import { ShapeProvider } from '@_linked/server-utils/utils/ShapeProvider';
import {
  PeaceGameDebrief,
  type PeaceGameDebriefResult,
} from './PeaceGameDebrief.js';
import { Auth } from '@_linked/auth/utils/auth';
import { Player } from './Player.js';
import { UserAccount } from '@_linked/sioc/shapes/UserAccount';
import { EnforceSignedIn, UserAccountData } from '@_linked/auth/types/auth';
import { Team, type TeamWithEvents } from './Team.js';

export class PeaceGameDebriefProvider extends ShapeProvider {
  public shape = PeaceGameDebrief;

  /**
   * load the PeaceGameDebrief for the current user
   * @returns PeaceGameDebriefResult | EnforceSignedIn
   */
  async loadPeaceGameDebrief(): Promise<
    PeaceGameDebriefResult | EnforceSignedIn | null
  > {
    const auth = this.request.linkedAuth;
    const userAccount = auth?.userAccount;
    if (!auth || !userAccount) {
      return Auth.enforceSignedIn();
    }
    const user = auth.user;
    const player = await Player.select((p) => {
      return [p.currentTeam.select((t) => [t.identifier, t.attendsEvents])];
    })
      .where((p) => {
        return p.equals(user);
      })
      .one();

    let currentTeam = player?.currentTeam as TeamWithEvents;

    if (!player) {
      console.error('Player not found for user', user.id);
      return null;
    }

    // Teams created before createTeam assigned currentTeam can still reach this
    // page. Fall back to the team led by the current player.
    if (!currentTeam) {
      currentTeam = (await Team.select((t) => [t.identifier, t.attendsEvents])
        .where((t) => t.teamLeader.equals(user))
        .one()) as TeamWithEvents;
    }

    if (!currentTeam) {
      console.error('No current team found for user', player.id);
      return null;
    }

    const attendsEvents = currentTeam.attendsEvents;

    // Get event ID if team is in event mode
    const eventId =
      attendsEvents && attendsEvents.length > 0
        ? attendsEvents[0]?.id
        : undefined;

    const existingDebrief = await PeaceGameDebrief.select((d) => {
      return [
        d.creator,
        d.team,
        d.action,
        d.empowermentDebrief1,
        d.onenessDebrief1,
        d.unityDebrief1,
        d.cooperationDebrief1,
        d.abundanceDebrief1,
        d.loveDebrief1,
        d.faithDebrief1,
        d.faithDebrief2,
        d.faithDebrief3,
        d.faithDebrief4,
        d.faithDebrief5,
        d.faithDebrief6,
        d.event,
      ];
    })
      .where((d) => {
        let condition = d.creator
          .equals(userAccount)
          .and(d.team.equals(currentTeam));

        // Filter by event if in event mode to ensure correct PeaceGameDebrief is found
        if (eventId) {
          condition = condition.and(d.event.equals({ id: eventId }));
        }

        return condition;
      })
      .one();

    // if not existing, create a new one
    if (!existingDebrief) {
      // get the first event from attendsEvents (if available)
      const event =
        attendsEvents && attendsEvents.length > 0 ? attendsEvents[0] : null;

      const newDebriefData: any = {
        creator: { id: userAccount.id },
        team: {
          id: currentTeam.id,
        },
      };

      // only add event if attendsEvents exists and has at least one event
      if (event) {
        newDebriefData.event = {
          id: event.id,
        };
      }

      const newDebrief = await PeaceGameDebrief.create(newDebriefData);
      return newDebrief as unknown as PeaceGameDebriefResult;
    }

    // existing debrief found
    return existingDebrief as unknown as PeaceGameDebriefResult;
  }

  /**
   * get all PeaceGameDebrief by user account
   *
   * @param userAccount UserAccountData
   * @returns PeaceGameDebriefResult[]
   */
  async getAllOf(
    userAccount: UserAccountData
  ): Promise<PeaceGameDebriefResult[]> {
    if (!userAccount) {
      return [];
    }

    const debriefs = await PeaceGameDebrief.select((d) => {
      return [
        d.creator,
        d.team,
        d.action,
        d.empowermentDebrief1,
        d.onenessDebrief1,
        d.unityDebrief1,
        d.cooperationDebrief1,
        d.abundanceDebrief1,
        d.loveDebrief1,
        d.faithDebrief1,
        d.faithDebrief2,
        d.faithDebrief3,
        d.faithDebrief4,
        d.faithDebrief5,
        d.faithDebrief6,
      ];
    }).where((d) => {
      return d.creator.equals(userAccount);
    });

    return debriefs as PeaceGameDebriefResult[];
  }
}
