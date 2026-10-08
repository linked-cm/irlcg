import {
  EnforceSignedIn,
  UserAccountData,
  UserData,
} from '@_linked/auth/types/auth';
import { Auth } from '@_linked/auth/utils/auth';
import { ShapeProvider } from '@_linked/server-utils/utils/ShapeProvider';
import { UserAccount } from '@_linked/sioc/shapes/UserAccount';
import { getQueryContext } from '@_linked/core/queries/QueryContext';
import { QResult } from '@_linked/core/queries/SelectQuery';
import type { EventTotals } from '../types/gameboard.js';
import { cached } from '../utils/cached.js';
import { Player } from './Player.js';
import { Team, type TeamWithEvents } from './Team.js';
import type { GameBoardTotalsResult } from './TopicScore.js';
import { ActionTotal, type ActionTotalResult } from './ActionTotal.js';
import { Action } from './Action.js';

/**
 * Copy from `TopicScoreProvider` because we plan to refactor TopicScoreProvider to ActionTotalProvider
 */

export class ActionTotalProvider extends ShapeProvider {
  public shape = ActionTotal;

  async getOrCreateActionTotal(
    action: QResult<Action>,
    creator: UserAccountData,
    currentTeam: QResult<Team>,
    event?: { id: string }
  ): Promise<ActionTotalResult> {
    if (!action || !creator?.accountOf?.id || !currentTeam) {
      throw new Error('No provided action, creator identity, or current team.');
    }

    // Query by canonical person identity so duplicate UserAccount records do
    // not split one player's score across multiple ActionTotals.
    // Previously this used getAllOf(creator) which filters by the player's DB currentTeam,
    // NOT the currentTeam parameter. When those differ (e.g. player switched teams in DB
    // but frontend still passes the old team), it would fail to find the existing record
    // and create a duplicate ActionTotal.
    // Now also filters by event when provided to ensure correct ActionTotal is found/created.
    const existingResults = await ActionTotal.select((at) => {
      return [
        at.action,
        at.score,
        at.medal,
        at.team,
        at.event,
        at.creator.select((c) => [c.accountOf]),
        at.images.select((img) => [img.contentUrl]),
      ];
    }).where((at) => {
      let condition = at.creator.accountOf
        .equals({ id: creator.accountOf.id })
        .and(at.team.equals({ id: currentTeam.id }))
        .and(at.action.equals({ id: action.id }));

      // Filter by event if provided to ensure correct ActionTotal is found
      // This prevents returning wrong ActionTotal when multiple exist for same creator+team+action but different events
      if (event?.id) {
        condition = condition.and(at.event.equals({ id: event.id }));
      }
      // If no event provided, don't filter by event (for backward compatibility)
      // This allows finding ActionTotals regardless of event status

      return condition;
    });

    const existing =
      existingResults.find((at) => (at.score || 0) > 0) || existingResults[0];

    if (existing) {
      console.log(
        `${process.pid} - returning existing actiontotal ${
          existing.id
        } - score ${existing.score} - medal ${existing.medal} for ${
          action.id
        } - ${creator.id}${event?.id ? ` - event ${event.id}` : ''}`
      );
      return existing;
    }

    // Determine event ID: use provided event, or fetch from player's currentTeam if not provided
    let eventId: string | undefined;
    if (event?.id) {
      eventId = event.id;
    } else {
      const existingPlayer = await Player.select((p) => [
        p.currentTeam.select((t) => [t.attendsEvents]),
      ])
        .where((p) => p.equals(creator.accountOf))
        .one();
      eventId = existingPlayer?.currentTeam?.attendsEvents?.[0]?.id;
    }

    // create new ActionTotal instance
    const createData: any = {
      action: {
        id: action.id,
      },
      creator: creator,
      team: {
        id: currentTeam.id,
      },
      score: 0, // default to no score
      medal: 0, // default to no medal
    };

    // add event if this is an event action
    if (eventId) {
      createData.event = {
        id: eventId,
      };
    }

    const at = (await ActionTotal.create(
      createData as any
    )) as any as ActionTotalResult;

    console.log(
      `${process.pid} - created actiontotal ${at.id} - for ${action.id} - ${
        creator.id
      }${eventId ? ` - event ${eventId}` : ''}`
    );

    return at;
  }

  getTotalPlayers() {
    // Plan 003: count UserAccounts whose Player is EITHER registered
    // (withoutAuthentication = false, i.e. they have a real sign-in) OR has
    // submitted at least one Peace Action (hasTakenAction = true).
    //
    // We're conservative here: existing signed-up users keep counting regardless
    // of their action history. The only Players we exclude are guest accounts
    // (withoutAuthentication = true) that have never submitted a Peace Action.
    // Lighting the Peace Torch alone does NOT make a guest count — torch lighting
    // is an atmospheric event, not a Peace Action.
    //
    // The lincd query API does not support boolean filters on nested object
    // properties (see GameActionProvider.ts:100 comment), so we load + filter in
    // memory. The 5-minute cache hides the cost. At millions-scale of guest
    // UserAccounts this is a known scalability concern (plan 003 R7) and a follow-up
    // should move to a denormalized counter.
    return cached(
      async () => {
        const accounts = await UserAccount.select((ua) => {
          return [
            ua.accountOf
              .as(Player)
              .select((p) => [p.withoutAuthentication, p.hasTakenAction]),
          ];
        });
        return accounts.filter((a) => {
          const p = (a.accountOf as any) ?? {};
          // Count if registered (withoutAuthentication is false/missing) OR has submitted any action.
          return p.withoutAuthentication !== true || p.hasTakenAction === true;
        }).length;
      },
      ['totalPlayers'],
      5 * 60 * 1000
    ); // cache for 5 minutes
  }

  /**
   * Get total actions taken by all users or for a specific team.
   *
   * @param currentTeam if provided, only count actions for that team
   * @returns total actions sum of ActionTotals
   */
  getTotalActions({
    currentTeam = null,
  }: {
    currentTeam?: QResult<Team> | null;
  } = {}) {
    return cached(
      async () => {
        let actionTotals;
        if (currentTeam) {
          // get ActionTotal for specific team
          actionTotals = await ActionTotal.select((at) => {
            return [at.score, at.creator.select((c) => [c.email])];
          }).where((at) => {
            return at.team.equals({ id: currentTeam.id });
          });
        } else {
          // get ActionTotal for all teams
          actionTotals = await ActionTotal.select((at) => {
            return [at.score, at.creator.select((c) => [c.email])];
          });
        }

        // filter out admin accounts for global stats only, not team-specific stats
        const totalActions = actionTotals
          .filter((actionTotal) => {
            const userAccount = actionTotal.creator;
            // Only filter admin for global totals, not team-specific totals
            return currentTeam ? true : !this.isAdmin(userAccount?.email);
          })
          .reduce((total, actionTotal) => {
            return total + (actionTotal.score || 0);
          }, 0);

        return totalActions;
      },
      ['getTotalActions', currentTeam],
      5 * 60 * 1000
    ); // cache for 5 minutes
  }

  /**
   * Enhanced method to get action totals including instance scores
   * Main actions (action1-7) should include their event action scores (actionE2-6)
   *
   * @param actionTotalMap Map of action string ID to base score
   * @returns Map with actions and their total scores (including instances)
   */
  private async enhanceActionTotalsWithInstances(
    actionTotalMap: Map<string, number>
  ): Promise<Map<string, number>> {
    const enhancedMap = new Map<string, number>();

    // Get all actions with their instances using new LINCD query
    const allActions = await Action.select((a) => {
      return [a.actionInstances];
    });

    // Build mapping: main action -> [event actions that belong to it]
    const mainToEventMap = new Map<string, string[]>();
    const eventActionIds = new Set<string>();

    allActions.forEach((action: any) => {
      if (action.actionInstances && action.actionInstances.length > 0) {
        // This is an event action that has main action instances
        const eventActionId = action.id;
        eventActionIds.add(eventActionId);

        action.actionInstances.forEach((mainAction: any) => {
          const mainActionId = mainAction.id;
          if (!mainToEventMap.has(mainActionId)) {
            mainToEventMap.set(mainActionId, []);
          }
          // push event action id to main action id if it exists
          const eventActions = mainToEventMap.get(mainActionId);
          if (eventActions) {
            eventActions.push(eventActionId);
          }
        });
      }
    });

    // Collect all main actions to process
    const mainActionsToProcess = new Set<string>();

    // Add main actions that have direct scores
    actionTotalMap.forEach((score, actionId) => {
      if (!eventActionIds.has(actionId)) {
        mainActionsToProcess.add(actionId);
      }
    });

    // Add main actions that have event actions with scores
    mainToEventMap.forEach((eventActions, mainActionId) => {
      const hasEventScores = eventActions.some(
        (eventActionId) => (actionTotalMap.get(eventActionId) || 0) > 0
      );
      if (hasEventScores) {
        mainActionsToProcess.add(mainActionId);
      }
    });

    // Calculate enhanced scores for each main action
    mainActionsToProcess.forEach((mainActionId) => {
      let totalScore = actionTotalMap.get(mainActionId) || 0;

      // Add scores from related event actions
      const eventActions = mainToEventMap.get(mainActionId) || [];
      eventActions.forEach((eventActionId) => {
        totalScore += actionTotalMap.get(eventActionId) || 0;
      });

      // Only include actions with actual scores
      if (totalScore > 0) {
        enhancedMap.set(mainActionId, totalScore);
      }
    });

    return enhancedMap;
  }

  /**
   * Enhanced method to get medal totals including instance medals
   * Main actions (action1-7) should include their event action medals (actionE2-6)
   * For medals, we take the MAXIMUM medal value, not the sum (since medals are ordinal: 1=bronze, 2=silver, 3=gold)
   *
   * @param medalMap Map of action string ID to medal value (1=bronze, 2=silver, 3=gold)
   * @returns Map with actions and their best medals (including instances)
   */
  private async enhanceMedalsWithInstances(
    medalMap: Map<string, number>
  ): Promise<Map<string, number>> {
    const enhancedMap = new Map<string, number>();

    // Get all actions with their instances using new LINCD query
    const allActions = await Action.select((a) => {
      return [a.actionInstances];
    });

    // Build mapping: main action -> [event actions that belong to it]
    const mainToEventMap = new Map<string, string[]>();
    const eventActionIds = new Set<string>();

    allActions.forEach((action: any) => {
      if (action.actionInstances && action.actionInstances.length > 0) {
        // This is an event action that has main action instances
        const eventActionId = action.id;
        eventActionIds.add(eventActionId);

        action.actionInstances.forEach((mainAction: any) => {
          const mainActionId = mainAction.id;
          if (!mainToEventMap.has(mainActionId)) {
            mainToEventMap.set(mainActionId, []);
          }
          // push event action id to main action id if it exists
          const eventActions = mainToEventMap.get(mainActionId);
          if (eventActions) {
            eventActions.push(eventActionId);
          }
        });
      }
    });

    // Collect all main actions to process
    const mainActionsToProcess = new Set<string>();

    // Add main actions that have direct medals
    medalMap.forEach((medal, actionId) => {
      if (!eventActionIds.has(actionId)) {
        mainActionsToProcess.add(actionId);
      }
    });

    // Add main actions that have event actions with medals
    mainToEventMap.forEach((eventActions, mainActionId) => {
      const hasEventMedals = eventActions.some(
        (eventActionId) => (medalMap.get(eventActionId) || 0) > 0
      );
      if (hasEventMedals) {
        mainActionsToProcess.add(mainActionId);
      }
    });

    // Calculate enhanced medals for each main action - take MAXIMUM, not sum
    mainActionsToProcess.forEach((mainActionId) => {
      let bestMedal = medalMap.get(mainActionId) || 0;

      // Take maximum medal from related event actions
      const eventActions = mainToEventMap.get(mainActionId) || [];
      eventActions.forEach((eventActionId) => {
        const eventMedal = medalMap.get(eventActionId) || 0;
        bestMedal = Math.max(bestMedal, eventMedal);
      });

      // Only include actions with actual medals
      if (bestMedal > 0) {
        enhancedMap.set(mainActionId, bestMedal);
      }
    });

    return enhancedMap;
  }

  async getGlobalActionTotal() {
    const actionTotals = await ActionTotal.select((at) => {
      return [at.score, at.action, at.creator.select((c) => [c.email])];
    });

    // filter out admin accounts and build action totals map
    const globalActionTotal: Map<string, number> = new Map();

    actionTotals
      .filter((actionTotal) => {
        const userAccount = actionTotal.creator;
        return !this.isAdmin(userAccount?.email);
      })
      .forEach((actionTotal) => {
        const actionId = actionTotal.action?.id;
        if (actionId) {
          const currentScore = globalActionTotal.has(actionId)
            ? globalActionTotal.get(actionId)
            : 0;
          const newScore = (currentScore || 0) + (actionTotal.score || 0);
          globalActionTotal.set(actionId, newScore);
        }
      });

    // Enhance totals to include instance scores
    const enhancedGlobalActionTotal =
      await this.enhanceActionTotalsWithInstances(globalActionTotal);

    // convert Map to plain object for cleaner JSON response
    const globalActionTotalObject: Record<string, number> = {};
    enhancedGlobalActionTotal.forEach((score, actionId) => {
      globalActionTotalObject[actionId] = score;
    });

    return { globalActionTotal: globalActionTotalObject };
  }

  async getTeamActionTotals(team: QResult<Team>, eventId?: string) {
    // Get team with current members to verify membership
    const teamWithMembers = await Team.select((t) => {
      return [t.members];
    })
      .where((t) => {
        return t.equals(team);
      })
      .one();

    if (!teamWithMembers) {
      return { teamActionTotals: {} };
    }

    const adminAccount = process.env.ADMIN_EMAIL
      ? await UserAccount.select((ua) => {
          return [ua.accountOf, ua.email];
        })
          .where((ua) => ua.email.equals(process.env.ADMIN_EMAIL))
          .one()
      : null;
    const adminPlayerId = adminAccount?.accountOf?.id;

    // Create set of current member IDs for efficient lookup
    const currentMemberIds = new Set(
      (teamWithMembers.members || [])
        .filter((member) => member.id !== adminPlayerId)
        .map((member) => member.id)
    );

    const actionTotals = await ActionTotal.select((t) => {
      return [
        t.score,
        t.action,
        t.team,
        t.event,
        t.creator.select((c) => [c.email, c.accountOf]),
      ];
    }).where((t) => {
      let condition = t.team.equals(team);
      if (eventId) {
        condition = condition.and(t.event.equals({ id: eventId }));
      }
      return condition;
    });

    // build action totals map (only for current team members)
    const teamActionTotals: Map<string, number> = new Map();

    actionTotals.forEach((actionTotal) => {
      const creatorId = actionTotal.creator?.accountOf?.id;
      const actionId = actionTotal.action?.id;

      // Only include if creator is still a current member of the team and
      // exclude the configured admin account to align with live/event totals.
      if (actionId && creatorId && currentMemberIds.has(creatorId)) {
        const currentScore = teamActionTotals.has(actionId)
          ? teamActionTotals.get(actionId)
          : 0;
        const newScore = (currentScore || 0) + (actionTotal.score || 0);
        teamActionTotals.set(actionId, newScore);
      }
    });

    // Enhance totals to include instance scores
    const enhancedTeamActionTotals =
      await this.enhanceActionTotalsWithInstances(teamActionTotals);

    // convert Map to plain object for cleaner JSON response
    const teamActionTotalsObject: Record<string, number> = {};
    enhancedTeamActionTotals.forEach((score, actionId) => {
      teamActionTotalsObject[actionId] = score;
    });

    return { teamActionTotals: teamActionTotalsObject };
  }

  /**
   * Get all ActionTotals for a specific creator or UserAccount.
   *
   * @param creator
   * @returns
   */
  async getAllOf(creator: UserAccountData): Promise<ActionTotalResult[]> {
    // make sure creator is valid
    if (!creator) {
      return [];
    }

    const userActionTotals = await ActionTotal.select((at) => {
      return [
        at.action,
        at.score,
        at.medal,
        at.team,
        at.event,
        at.creator.select((c) => [c.accountOf]),
        at.images.select((img) => [img.contentUrl]),
      ];
    }).where((at) => {
      return at.creator.equals({ id: creator.id });
    });

    return userActionTotals;
  }

  /**
   * Get all ActionTotals for a specific user by UserData.
   *
   * @param user - UserData object
   * @param currentTeam - Optional team to filter by, defaults to user's current team
   * @returns ActionTotal array for the user
   */
  async getAllOfByUser(user: UserData, currentTeam?: QResult<Team>) {
    if (!user) {
      throw new Error('User is required');
    }

    // get the user account first
    const userAccount = await UserAccount.select((ua) => {
      return [ua.accountOf];
    })
      .where((ua) => {
        return ua.accountOf.equals(user);
      })
      .one();

    if (!userAccount) {
      console.warn('No user account found for user:', user.id);
      return [];
    }

    let targetTeam = currentTeam;
    if (!targetTeam) {
      // get the user current team
      const player = await Player.select((p) => {
        return [p.currentTeam];
      })
        .where((p) => {
          return p.equals(user);
        })
        .one();

      if (!player || !player.currentTeam) {
        console.warn('No current team found for user:', user.id);
        return [];
      }

      targetTeam = player.currentTeam;
    }

    const userActionTotals = await ActionTotal.select((at) => {
      return [at.action, at.score, at.medal, at.team, at.creator];
    }).where((at) => {
      return at.creator
        .equals({ id: userAccount.id })
        .and(at.team.equals(targetTeam));
    });

    return userActionTotals;
  }

  /**
   * Get all ActionTotals for multiple users in a single batch query.
   * This is much more efficient than calling getAllOfByUser multiple times.
   *
   * @param users - Array of UserData objects
   * @param currentTeam - Team to filter by
   * @returns Object with user IDs as keys and their ActionTotal arrays as values
   */
  async getAllOfByUsers(
    users: UserData[],
    currentTeam: QResult<Team>
  ): Promise<Record<string, any[]>> {
    if (!users || users.length === 0) {
      return {};
    }

    if (!currentTeam) {
      throw new Error('Team is required for batch query');
    }

    // create a Set of user IDs for efficient lookup
    const userIdSet = new Set(users.map((user) => user.id));

    // get all action totals for the team and include creator information
    const allActionTotals = await ActionTotal.select((at) => {
      return [
        at.action.select((a) => [a.name, a.identifier]),
        at.score,
        at.medal,
        at.team,
        at.creator.select((c) => [c.accountOf]),
      ];
    }).where((at) => {
      return at.team.equals(currentTeam);
    });

    // group the results by user ID
    const resultObj: Record<string, any[]> = {};

    // initialize empty arrays for all users
    users.forEach((user) => {
      resultObj[user.id] = [];
    });

    // filter and group action totals by user
    allActionTotals.forEach((actionTotal) => {
      // skip if topicScore is empty or invalid
      if (
        !actionTotal ||
        !actionTotal.creator ||
        !actionTotal.creator.accountOf ||
        !actionTotal.action
      ) {
        return;
      }

      const userId = actionTotal.creator?.accountOf?.id;
      if (userId && userIdSet.has(userId)) {
        if (!resultObj[userId]) {
          resultObj[userId] = [];
        }
        resultObj[userId].push(actionTotal);
      }
    });

    return resultObj;
  }

  async getMyActionTotals(
    userAccount: UserAccountData,
    allTeams: boolean = false
  ) {
    if (!userAccount) {
      throw new Error('User account is required');
    }
    const user = userAccount.accountOf;
    let player;
    let eventId: string | undefined;
    if (!allTeams) {
      player = await Player.select((p) => {
        return [p.currentTeam.select((t) => [t.attendsEvents])];
      })
        .where((p) => {
          return p.equals(user);
        })
        .one();

      if (!player || !player.currentTeam) {
        throw new Error('No current team found for user');
      }

      // Get event ID if team is in event mode
      eventId = player.currentTeam?.attendsEvents?.[0]?.id;
    }

    let myActionTotals: Map<string, number> = new Map();
    let myMedalAction: Map<string, number> = new Map();

    //get the action totals of this user
    //either get those for ANY team (so overall totals)
    // or only get those of the current team of the user (based on the allTeams flag)
    // Also filter by event if in event mode to ensure correct aggregation
    let actionTotals = await ActionTotal.select((at) => {
      return [
        at.score,
        at.action.select((action) => [
          action.name,
          action.identifier,
          action.description,
          (action.image as any).select((img) => [img.contentUrl]),
        ]),
        at.team,
        at.event,
        at.medal,
        at.creator,
      ];
    }).where((t) => {
      let condition;
      if (allTeams) {
        condition = t.creator.equals(userAccount);
      } else {
        condition = t.team
          .equals(player.currentTeam)
          .and(t.creator.equals(userAccount));
      }

      // Filter by event if in event mode to prevent mixing event and non-event scores
      if (eventId) {
        condition = condition.and(t.event.equals({ id: eventId }));
      }
      // If not in event mode (eventId is undefined), don't filter by event
      // This maintains backward compatibility for non-event teams

      return condition;
    });

    actionTotals.forEach((actionTotal) => {
      // skip if actionTotal doesn't have a valid action
      if (!actionTotal.action || !actionTotal.action.id) {
        // console.warn(`ActionTotal has no valid action: ${actionTotal.action?.id || 'unknown'}, skipping actionTotal: ${actionTotal.id}`);
        return;
      }

      // set medal. Get the maximum medal score for this topic amongst scores of this user for different teams
      let medalScore = actionTotal.medal;
      // console.log(`actionTotal ${actionTotal.id}, action: ${actionTotal.action.id}, has medal score ${medalScore}, actual score: ${actionTotal.score}`);
      let bestMedal = myMedalAction.has(actionTotal.action.id)
        ? Math.max(myMedalAction.get(actionTotal.action.id) || 0, medalScore)
        : medalScore;
      myMedalAction.set(actionTotal.action.id, bestMedal);
      // set total score (which may be the sum of scores for the same action & user but under multiple teams)
      let newScore =
        (myActionTotals.has(actionTotal.action.id)
          ? myActionTotals.get(actionTotal.action.id) || 0
          : 0) + actionTotal.score;
      // console.log(`Setting ${actionTotal.action.id} total score to: ${newScore}`);
      myActionTotals.set(actionTotal.action.id, newScore);
    });

    const enhancedMyActionTotals = await this.enhanceActionTotalsWithInstances(
      myActionTotals
    );
    const enhancedMyMedalAction = await this.enhanceMedalsWithInstances(
      myMedalAction
    );

    // convert Maps to plain objects for cleaner JSON response
    const actionTotalsObject: Record<string, number> = {};
    const medalActionObject: Record<string, number> = {};

    enhancedMyActionTotals.forEach((score, actionId) => {
      actionTotalsObject[actionId] = score;
    });

    enhancedMyMedalAction.forEach((medal, actionId) => {
      medalActionObject[actionId] = medal;
    });

    return {
      myActionTotals: actionTotalsObject,
      myMedalAction: medalActionObject,
    };
  }

  getGameBoardTotals(): Promise<GameBoardTotalsResult> | EnforceSignedIn {
    let auth = this.request.linkedAuth;
    if (!auth) {
      console.log(`Must be signed in to get game board totals`);
      return Auth.enforceSignedIn();
    }

    return cached(
      async () => {
        console.log('Calculating game board totals...');
        const account = auth.userAccount;
        const user = auth.user;

        let totalPlayer = (await this.getTotalPlayers()) - 1; // 1 is account `ADMIN_EMAIL`
        let totalActions = await this.getTotalActions();
        let globalActionTotalResult = await this.getGlobalActionTotal();
        let globalActionTotal = globalActionTotalResult.globalActionTotal;

        // ValidationReport.printForShapeInstances(ActionTotal);

        const player = await Player.select((p) => {
          return [p.currentTeam.select((t) => [t.identifier, t.attendsEvents])];
        })
          .where((p) => {
            return p.equals(user);
          })
          .one();

        const currentTeam = player?.currentTeam;
        const currentEventId = currentTeam?.attendsEvents?.[0]?.id;

        let teamActionTotalsResult = currentTeam?.id
          ? await this.getTeamActionTotals(currentTeam, currentEventId)
          : { teamActionTotals: {} };

        // Use false to get only actions of the current team for personal totals
        let myActionTotals = await this.getMyActionTotals(account, false);

        return {
          totalPlayer,
          totalActions,
          myActionTotals,
          teamActionTotals: teamActionTotalsResult,
          globalActionTotal: { globalActionTotal },
        };
      },
      ['gameboardtotals', auth.user?.id, auth.user?.currentTeam?.id],
      1000 * 60 * 5
    ); // cache for 5 minutes per user and team
  }

  /**
   * Get event totals for a specific team or the current user's team.
   * Uses the new Team structure with attendsEvents.
   *
   * @param teamId - Optional ID of the team to get totals for. If not provided, uses current user's team.
   * @returns Promise<EventTotals> - Object containing totalPlayer and totalActions
   */
  getEventTotals(teamId?: string): Promise<EventTotals> {
    const userAccount = this.request.linkedAuth?.userAccount;

    return cached(
      async (): Promise<EventTotals> => {
        try {
          // get team: by ID if provided, otherwise from current user
          let team: QResult<Team> | null = null;

          if (teamId) {
            // get team by ID
            team = await Team.select((t) => [
              t.members,
              t.attendsEvents.select((e) => [e.actions, e.isEventMode]),
            ])
              .where((t) => t.equals({ id: teamId }))
              .one();
          } else if (userAccount) {
            // get team from current team of the user
            const player = await Player.select((p) => [
              p.currentTeam.select((t) => [
                t.members,
                t.attendsEvents.select((e) => [e.actions, e.isEventMode]),
              ]),
            ])
              .where((p) => p.equals(userAccount.accountOf))
              .one();
            team = player?.currentTeam || null;
          }

          const teamWithMembers = team as
            | (TeamWithEvents & {
                members?: UserData[];
              })
            | null;
          const currentEvent = teamWithMembers?.attendsEvents?.[0];

          // treat any non-trial team that attends an event as event-scoped for totals,
          // even when the event keeps the regular 5-menu experience (isEventMode=false).
          if (
            !teamWithMembers ||
            Team.isTrialTeam(teamWithMembers) ||
            !currentEvent
          ) {
            return { totalPlayer: 0, totalActions: 0 };
          }

          // check if user is admin
          const adminAccount = process.env.ADMIN_EMAIL
            ? await UserAccount.select((ua) => {
                return [ua.accountOf, ua.email];
              })
                .where((ua) => ua.email.equals(process.env.ADMIN_EMAIL))
                .one()
            : null;
          const adminPlayerId = adminAccount?.accountOf?.id;

          const members = (teamWithMembers.members || []).filter(
            (member) => member?.id !== adminPlayerId
          );

          const actionTotals = await ActionTotal.select((at) => {
            return [at.score, at.creator.select((c) => [c.email])];
          }).where((at) => {
            return at.team
              .equals({ id: teamWithMembers.id })
              .and(at.event.equals({ id: currentEvent.id }));
          });

          const totalPlayer = members.length;
          const totalActions = actionTotals.reduce((sum, actionTotal) => {
            if (this.isAdmin(actionTotal.creator?.email)) {
              return sum;
            }
            return sum + (actionTotal.score || 0);
          }, 0);

          return { totalPlayer, totalActions };
        } catch (error) {
          console.error('Error getting event totals:', error);
          return { totalPlayer: 0, totalActions: 0 };
        }
      },
      ['getEventTotals', teamId, userAccount?.id],
      1 * 60 * 1000 // cache for 1 minute
    );
  }

  // check if user is admin
  isAdmin(userEmail: string): boolean {
    return userEmail === process.env.ADMIN_EMAIL;
  }
}
