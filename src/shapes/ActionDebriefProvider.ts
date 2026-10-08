import { Auth } from '@_linked/auth/utils/auth';
import { ShapeProvider } from '@_linked/server-utils/utils/ShapeProvider';
import { UserAccount } from '@_linked/sioc/shapes/UserAccount';
import { QResult } from '@_linked/core/queries/SelectQuery';
import { ActionDebrief } from './ActionDebrief.js';
import { Player } from './Player.js';
import { UserAccountData } from '@_linked/auth/types/auth';
import { Action } from './Action.js';
import type { TeamWithEvents } from './Team.js';

export class ActionDebriefProvider extends ShapeProvider {
  public shape = ActionDebrief;

  async loadActionDebrief(action: QResult<Action>) {
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

    const currentTeam = player?.currentTeam as TeamWithEvents;
    const attendsEvents = currentTeam?.attendsEvents;

    if (!player || !currentTeam) {
      console.error('No current team found for user', player.id);
      return null;
    }

    // Get event ID if team is in event mode
    const eventId =
      attendsEvents && attendsEvents.length > 0
        ? attendsEvents[0]?.id
        : undefined;

    const actionDebrief = await ActionDebrief.select((a) => {
      return [
        a.creator,
        a.team,
        a.action,
        a.event,
        a.debriefplanGrowingEdge,
        a.debriefactionsTaken,
        a.debriefLearnings,
        a.debriefProblems,
        a.event,
      ];
    })
      .where((a) => {
        let condition = a.creator
          .equals(userAccount)
          .and(
            a.team.equals({
              id: player.currentTeam.id,
            })
          )
          .and(a.action.equals({ id: action.id }));

        // Filter by event if in event mode to ensure correct ActionDebrief is found
        if (eventId) {
          condition = condition.and(a.event.equals({ id: eventId }));
        }

        return condition;
      })
      .one();

    if (!actionDebrief) {
      // get the first event from attendsEvents (if available)
      const event =
        attendsEvents && attendsEvents.length > 0 ? attendsEvents[0] : null;

      const newActionDebriefData: any = {
        creator: userAccount,
        team: {
          id: player.currentTeam.id,
        },
        action: {
          id: action.id,
        },
      };

      // only add event if attendsEvents exists and has at least one event
      if (event) {
        newActionDebriefData.event = {
          id: event.id,
        };
      }

      return await ActionDebrief.create(newActionDebriefData);
    }

    return actionDebrief;

    // let actionDebrief = ActionDebrief.getLocalInstances().find((debrief) => {
    //   return (
    //     debrief.topic?.namedNode === topic?.namedNode &&
    //     debrief.team.equals(user.currentTeam) &&
    //     debrief.creator?.namedNode === userAccount?.namedNode
    //   );
    // });
    // if (!actionDebrief) {
    //   actionDebrief = new ActionDebrief();
    //   actionDebrief.creator = userAccount;
    //   actionDebrief.team = user.currentTeam;
    //   if (topic) {
    //     actionDebrief.topic = topic;
    //   } else {
    //     return null;
    //   }
    //   actionDebrief.save();
    // }
  }

  /**
   * get all ActionDebrief by account
   *
   * @param create
   * @returns
   */
  async getAllOf(create: UserAccountData) {
    const actionDebriefs = await ActionDebrief.select((a) => {
      return [
        a.creator,
        a.team,
        a.action,
        a.debriefplanGrowingEdge,
        a.debriefactionsTaken,
        a.debriefLearnings,
        a.debriefProblems,
      ];
    }).where((a) => {
      return a.creator.equals({ id: create.id });
    });

    return actionDebriefs;
  }
}
