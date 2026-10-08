import { UserAccountData } from '@_linked/auth/types/auth';
import { Auth } from '@_linked/auth/utils/auth';
import { ShapeProvider } from '@_linked/server-utils/utils/ShapeProvider';
import { QResult } from '@_linked/core/queries/SelectQuery';
import { ActionPlan } from './ActionPlan.js';
import { Player } from './Player.js';
import { Action } from './Action.js';
import type { TeamWithEvents } from './Team.js';

export class ActionPlanProvider extends ShapeProvider {
  public shape = ActionPlan;

  async loadActionPlan(action: QResult<Action>) {
    if (!action) {
      return null;
    }

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
        return p.equals({
          id: user.id,
        });
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

    const actionPlan = await ActionPlan.select((a) => {
      return [
        a.creator,
        a.team,
        a.action,
        a.intendedMedal,
        a.planGrowingEdge,
        a.planIntentionStatement,
        a.scheduledTime1,
        a.scheduledTime2,
        a.scheduledTime3,
        a.scheduledTime4,
        a.scheduledTime5,
        a.scheduledTime6,
        a.scheduledTime7,
        a.scheduledTimeEnd1,
        a.scheduledTimeEnd2,
        a.scheduledTimeEnd3,
        a.scheduledTimeEnd4,
        a.scheduledTimeEnd5,
        a.scheduledTimeEnd6,
        a.scheduledTimeEnd7,
        a.planTeamSupport,
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

        // Filter by event if in event mode to ensure correct ActionPlan is found
        if (eventId) {
          condition = condition.and(a.event.equals({ id: eventId }));
        }

        return condition;
      })
      .one();

    if (!actionPlan) {
      // get the first event from attendsEvents (if available)
      const event =
        attendsEvents && attendsEvents.length > 0 ? attendsEvents[0] : null;

      const newActionPlanData: any = {
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
        newActionPlanData.event = {
          id: event.id,
        };
      }

      return await ActionPlan.create(newActionPlanData);
    }

    return actionPlan;
  }

  /**
   * get all ActionPlan by account
   *
   * @param create
   * @returns
   */
  async getAllOf(create: UserAccountData) {
    const actionPlans = await ActionPlan.select((a) => {
      return [
        a.creator,
        a.team,
        a.action,
        a.intendedMedal,
        a.planGrowingEdge,
        a.planIntentionStatement,
        a.scheduledTime1,
        a.scheduledTime2,
        a.scheduledTime3,
        a.scheduledTime4,
        a.scheduledTime5,
        a.scheduledTime6,
        a.scheduledTime7,
        a.scheduledTimeEnd1,
        a.scheduledTimeEnd2,
        a.scheduledTimeEnd3,
        a.scheduledTimeEnd4,
        a.scheduledTimeEnd5,
        a.scheduledTimeEnd6,
        a.scheduledTimeEnd7,
        a.planTeamSupport,
        a.event,
      ];
    }).where((a) => {
      return a.creator.equals({ id: create.id });
    });

    return actionPlans;
  }
}
