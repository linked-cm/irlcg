import type {
  AuthSession,
  UserAccountData,
  UserData,
} from '@_linked/auth/types/auth';
import { Auth } from '@_linked/auth/utils/auth';
import { asset } from '@_linked/core/utils/LinkedFileStorage';
import type { QResult } from '@_linked/core/queries/SelectQuery';
import { LinkedLiveUpdate } from '@_linked/server-utils/utils/LinkedLiveUpdates';
import { ShapeProvider } from '@_linked/server-utils/utils/ShapeProvider';
import { UserAccount } from '@_linked/sioc/shapes/UserAccount';
import { EventTeam } from './EventTeam.js';
import { Player } from './Player.js';
import { Team, type TeamWithEvents } from './Team.js';
import { OnceScoreAlgorithm } from './score_config/OnceScoreAlgorithm.js';
import { ThresholdScoreAlgorithm } from './score_config/ThresholdScoreAlgorithm.js';
import {
  type ActionsQuantityEntries,
  ActionSubmission,
  type ActionSubmissionResult,
  type SubmitResponse,
} from './ActionSubmission.js';
import { Action } from './Action.js';
import { ActionTotal } from './ActionTotal.js';
import { ActionTotalProvider } from './ActionTotalProvider.js';
import { formatDisplayName } from '../utils/helper.js';

/**
 * Copy from `GameActionProvider.ts` because we plan to refactor `GameActionProvider` to `ActionSubmissionProvider`
 */

// Prevent accidental or abusive large entries in a single submit.
const MAX_ACTION_QUANTITY = 10;

// Daily limits are per user, per action, per team/event.
const DAILY_ACTION_QUANTITY_LIMIT = 50;

// Action 2 / Oneness is the befriending action, so conference players can
// reasonably submit more of these in one day.
const ONENESS_DAILY_ACTION_QUANTITY_LIMIT = 200;

const DELEGATED_SUBMISSION_FORBIDDEN =
  'Only the current team leader can submit actions for a member of that team';

type SubmissionError = { error: string };
type DelegatedAuthorization =
  | { authorizedTeamId: string | null }
  | SubmissionError;

export class ActionSubmissionProvider extends ShapeProvider {
  public shape = ActionSubmission;

  /**
   * Normalize regular and event action identifiers to their action number.
   * Examples: action2, E2, EC2, ED2, PW2 all become "2".
   */
  private getActionNumber(
    action: QResult<Action> & { identifier?: string }
  ): string {
    const actionId = action?.id?.split('/').pop() || '';
    const actionIdentifier = String(action?.identifier || '');
    const actionKey = actionIdentifier || actionId;
    return (
      actionKey
        .toLowerCase()
        .replace(/^action/, '')
        .match(/\d+$/)?.[0] || ''
    );
  }

  /** Action 2 / Oneness gets the higher daily limit; all other actions use the default. */
  private getDailyActionQuantityLimit(
    action: QResult<Action> & { identifier?: string }
  ): number {
    return this.getActionNumber(action) === '2'
      ? ONENESS_DAILY_ACTION_QUANTITY_LIMIT
      : DAILY_ACTION_QUANTITY_LIMIT;
  }

  private isUserAccountTarget(
    target?: UserAccountData | UserData
  ): target is UserAccountData {
    // The RPC target may be either a person or a specific account. Preserve an
    // explicit account so duplicate accounts for one person do not split scores.
    return Boolean(
      target && 'accountOf' in target && target.accountOf?.id && target.id
    );
  }

  /**
   * Authorize acting as another player before loading or changing their data.
   * A leader may submit only for members of the team they currently lead.
   */
  private async authorizeDelegatedSubmission(
    signedInUser: UserData,
    targetUser: UserData
  ): Promise<DelegatedAuthorization> {
    if (targetUser.id === signedInUser.id) {
      return { authorizedTeamId: null };
    }

    const submittingPlayer = await Player.select((p) => [
      p.currentTeam.select((t) => [
        t.teamLeader,
        t.members.select((member) => [member.givenName]),
      ]),
    ]).for({ id: signedInUser.id });
    const submittingTeam = submittingPlayer?.currentTeam;
    const teamMembers = Array.isArray(submittingTeam?.members)
      ? submittingTeam.members
      : submittingTeam?.members
      ? [submittingTeam.members]
      : [];
    const isCurrentTeamLeader =
      submittingTeam?.teamLeader?.id === signedInUser.id;
    const targetIsCurrentTeamMember = teamMembers.some(
      (member) => member.id === targetUser.id
    );

    if (!isCurrentTeamLeader || !targetIsCurrentTeamMember) {
      return { error: DELEGATED_SUBMISSION_FORBIDDEN };
    }

    return { authorizedTeamId: submittingTeam.id };
  }

  private async resolveSubmissionTarget(
    auth: AuthSession,
    requestedTarget?: UserAccountData | UserData
  ) {
    // Resolve the target to a UserAccount first: ActionTotal.creator is an
    // account, while ActionSubmission.agent and team membership use the person.
    const requestedAccount = this.isUserAccountTarget(requestedTarget)
      ? requestedTarget
      : null;
    const requestedUser =
      requestedAccount?.accountOf || requestedTarget || auth.user;
    const authorization = await this.authorizeDelegatedSubmission(
      auth.user,
      requestedUser
    );

    if ('error' in authorization) {
      return authorization;
    }

    const targetAccountId =
      requestedAccount?.id || (!requestedTarget ? auth.userAccount?.id : null);

    // Include team events in the same query so all records created by submit()
    // share the target player's team and event scope.
    const accountQuery = UserAccount.select((account) => [
      account.accountOf
        .as(Player)
        .select((player) => [
          player.currentTeam.select((team) => [
            team.attendsEvents.select((event) => [event.isEventMode]),
          ]),
          player.givenName,
          player.familyName,
          player.address,
        ]),
    ]);
    const userAccount = targetAccountId
      ? await accountQuery.for({ id: targetAccountId })
      : await accountQuery
          .where((account) => account.accountOf.equals(requestedUser))
          .one();

    if (!userAccount || userAccount.accountOf?.id !== requestedUser.id) {
      console.warn('User account not found for user', requestedUser.id);
      return { error: 'User account not found' };
    }

    const user = userAccount.accountOf;
    const currentTeam = user?.currentTeam as TeamWithEvents;
    if (!currentTeam?.attendsEvents?.length) {
      console.warn('No current team or attendsEvents found for user', user.id);
      return { error: 'No current team or attendsEvents found for user' };
    }

    if (
      authorization.authorizedTeamId &&
      currentTeam.id !== authorization.authorizedTeamId
    ) {
      // Membership authorization and account resolution are separate queries;
      // recheck the team to prevent submitting through a stale account payload.
      return { error: DELEGATED_SUBMISSION_FORBIDDEN };
    }

    const currentEvent = currentTeam.attendsEvents[0];
    if (!currentEvent?.id) {
      return { error: 'No current event found for user' };
    }

    return { userAccount, user, currentTeam, currentEvent };
  }

  /**
   * Submit one or more action-option quantities for the signed-in player.
   *
   * Important rules enforced here:
   * - Every single submitted quantity is capped by MAX_ACTION_QUANTITY.
   * - Daily limits are scoped by user + action + current team + current event.
   * - New submissions receive startTime so future daily-limit checks can count them.
   */
  async submit(
    action: QResult<Action>,
    actionsAndQuantity: ActionsQuantityEntries,
    overwritePreviousSubmission: boolean = false,
    subPlayer?: UserAccountData | UserData
  ): Promise<SubmitResponse> {
    const auth = this.request.linkedAuth;
    if (!auth) {
      console.warn('Must be logged in to submit an action submission');
      return Auth.enforceSignedIn();
    }

    if (!action) {
      console.warn('Action not found', action?.id);
      return { error: 'Action not found' };
    }

    if (
      !Array.isArray(actionsAndQuantity) ||
      actionsAndQuantity.some(
        (entry) => !Array.isArray(entry) || entry.length !== 2 || !entry[0]?.id
      )
    ) {
      return { error: 'Invalid action quantities' };
    }

    const actionQuantities = actionsAndQuantity.map(([option, quantity]) => ({
      optionId: option.id,
      quantity,
    }));

    const target = await this.resolveSubmissionTarget(auth, subPlayer);
    if ('error' in target) {
      return target;
    }
    const { userAccount, user, currentTeam, currentEvent } = target;

    // Per-submit protection: block a single request from adding too many
    // actions at once, even if the frontend validation is bypassed.
    const dailyActionQuantityLimit = this.getDailyActionQuantityLimit(action);
    const submittedQuantity = actionQuantities.reduce(
      (total, { quantity }) => total + Number(quantity || 0),
      0
    );

    for (const { quantity } of actionQuantities) {
      const numericQuantity = Number(quantity);
      if (
        !Number.isInteger(numericQuantity) ||
        numericQuantity <= 0 ||
        numericQuantity > MAX_ACTION_QUANTITY
      ) {
        return {
          error: `Action quantity must be a whole number between 1 and ${MAX_ACTION_QUANTITY}`,
        };
      }
    }

    // Track deleted submission IDs so we can filter them out of the query
    // results below. ActionSubmission.delete() may not propagate immediately
    // in the in-memory LINCD store, causing "ghost" submissions to appear
    // in subsequent queries within the same request.
    const deletedIds = new Set<string>();

    if (overwritePreviousSubmission) {
      //delete all previous actions for this topic by this user
      //except the custom created options
      const previousActions = await ActionSubmission.select((as) => {
        return [
          as.action,
          as.agent,
          as.team,
          as.event,
          as.option.select((o) => [
            o.name,
            o.points,
            o.isBonus,
            o.isCustom,
            o.identifier,
            o.description,
          ]),
        ];
      }).where((as) => {
        let condition = as.action
          .equals({ id: action.id })
          .and(as.agent.equals(user))
          .and(as.team.equals(currentTeam));

        // Filter by event if in event mode to ensure only submissions for this event are deleted
        if (currentEvent?.id) {
          condition = condition.and(as.event.equals({ id: currentEvent.id }));
        }

        return condition;
      });

      // since checking for isBonus is not possible in the query, we filter it out manually
      const filteredPreviousActions = previousActions.filter((action) => {
        const option = action.option;
        return !option.isBonus;
      });

      const previousActionIds = filteredPreviousActions.map(({ id }) => ({
        id,
      }));

      if (previousActionIds.length > 0) {
        previousActionIds.forEach(({ id }) => deletedIds.add(id));
        await ActionSubmission.delete(previousActionIds);
      }
    }

    // When nothing to submit and not overwriting, return existing ActionTotal without overwriting
    // This prevents resetting score to 0 when user accidentally submits empty form
    if (actionQuantities.length === 0 && !overwritePreviousSubmission) {
      const existingActionTotal = await ActionTotal.getOrCreateFor(
        { id: action.id },
        userAccount,
        currentTeam,
        currentEvent ? { id: currentEvent.id } : undefined
      );
      return {
        actionTotal: existingActionTotal,
        actions: [],
        justFinishedGame: false,
        user: user,
      } as unknown as SubmitResponse;
    }

    // Daily limit window uses the server's local day. Every new submission gets
    // startTime below, and older records without startTime are ignored here
    // because we cannot safely place them into a specific day.
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    // Count only this user's submissions for the same action/team/event. This
    // keeps daily limits separate when the same player participates in multiple
    // teams or events.
    const todaysActionSubmissions = await ActionSubmission.select((as) => {
      return [as.quantity, as.startTime];
    }).where((as) => {
      let condition = as.action
        .equals({ id: action.id })
        .and(as.agent.equals(user))
        .and(as.team.equals(currentTeam));

      if (currentEvent?.id) {
        condition = condition.and(as.event.equals({ id: currentEvent.id }));
      }

      return condition;
    });

    const todaysQuantity = todaysActionSubmissions
      .filter((submission) => {
        if (deletedIds.has(submission.id)) return false;
        const startTime = submission.startTime
          ? new Date(submission.startTime)
          : null;
        return (
          startTime && startTime >= startOfToday && startTime < startOfTomorrow
        );
      })
      .reduce(
        (total, submission) => total + Number(submission.quantity || 0),
        0
      );

    if (todaysQuantity + submittedQuantity > dailyActionQuantityLimit) {
      return {
        error: `Daily action limit reached. You can submit up to ${dailyActionQuantityLimit} actions per action each day.`,
      };
    }

    // Create new submissions after validation passes. startTime is required for
    // daily-limit enforcement on future submits.
    const now = new Date();
    const actionPromises = actionQuantities.map(
      async ({ optionId, quantity }) => {
        const actionSubmission = await ActionSubmission.create({
          action: { id: action.id },
          quantity: quantity,
          agent: { id: user.id },
          team: { id: currentTeam.id },
          option: { id: optionId },
          event: { id: currentEvent.id },
          startTime: now,
        });
        return actionSubmission;
      }
    );

    const actions = await Promise.all(actionPromises);

    // Plan 003: flip Player.hasTakenAction true on first submission. The flag
    // powers ActionTotalProvider.getTotalPlayers() so guest Players who only lit
    // the torch don't inflate the player count. Safe to set repeatedly.
    await Player.update({ hasTakenAction: true }).for(user);

    //calculate the new total score for this action by looking at all the new & previous actions
    const userTopicActions = await this.getAllOfQuery(
      user,
      action,
      currentTeam
    );
    // Filter out "ghost" submissions that were deleted but may still appear
    // in the query due to in-memory store eventual consistency
    const transformActions: ActionSubmissionResult[] = userTopicActions
      .map((as) => {
        return {
          id: as.id,
          quantity: as.quantity,
          team: as.team,
          option: as.option,
          action: as.action,
          agent: as.agent,
        };
      })
      .filter((action) => action !== null && !deletedIds.has(action.id));

    // calculate total score including bonus actions
    const totalScore = transformActions.reduce((total, action) => {
      const template = action.option;
      const templatePoints = template?.points || 0;
      return total + action.quantity * templatePoints;
    }, 0);
    console.log(`Total score: ${totalScore}`);

    // calculate total score without bonus actions
    const totalScoreWithoutBonus = transformActions
      .filter((action) => {
        const template = action.option;
        const isBonus = template?.isBonus || false;
        return !isBonus;
      })
      .reduce((total, action) => {
        const template = action.option;
        const templatePoints = template?.points || 0;
        return total + action.quantity * templatePoints;
      }, 0);
    console.log(`Total score without bonus: ${totalScoreWithoutBonus}`);

    //get or create a new ActionTotal (pass event to ensure correct event-scoped record)
    const actionTotal = await ActionTotal.getOrCreateFor(
      { id: action.id },
      userAccount,
      currentTeam,
      currentEvent ? { id: currentEvent.id } : undefined
    );

    // current implementation of images: they are stored in the topic score
    // and each image is counted as 1 point
    // in the future we may want to restructure this and store images in GameActions
    let finalTotalScore = totalScore;
    let finalTotalScoreWithoutBonus = totalScoreWithoutBonus;
    if (actionTotal?.images?.length > 0) {
      finalTotalScore += actionTotal.images.length;
      finalTotalScoreWithoutBonus += actionTotal.images.length;
      console.log(`Added ${actionTotal.images.length} image points`);
    }

    // Calculate the medal for this score.
    // Load scoreConfiguration by algorithm type in separate queries so the right
    // shape (OnceScoreAlgorithm vs ThresholdScoreAlgorithm) is populated.
    // Using two .as() on the same path can leave template refs unloaded for
    // OnceScoreAlgorithm (e.g. Unity/action3), causing medal to stay 0 despite score > 0.
    let medal = 0;
    const actionWithOnce = await Action.select((t) => [
      t.scoreConfiguration
        .as(OnceScoreAlgorithm)
        .select((a) => [a.bronzeTemplate, a.silverTemplate, a.goldTemplate]),
    ])
      .where((a) => a.equals({ id: action.id }))
      .one();
    const onceConfig = actionWithOnce?.scoreConfiguration;
    if (
      onceConfig?.bronzeTemplate != null &&
      onceConfig?.silverTemplate != null &&
      onceConfig?.goldTemplate != null
    ) {
      medal = OnceScoreAlgorithm.calculateTotalScore(
        action,
        transformActions,
        totalScoreWithoutBonus,
        {
          gold: onceConfig.goldTemplate.id,
          silver: onceConfig.silverTemplate.id,
          bronze: onceConfig.bronzeTemplate.id,
        }
      );
    } else {
      const actionWithThreshold = await Action.select((t) => [
        t.scoreConfiguration
          .as(ThresholdScoreAlgorithm)
          .select((a) => [a.bronzeMinScore, a.silverMinScore, a.goldMinScore]),
      ])
        .where((a) => a.equals({ id: action.id }))
        .one();
      const thresholdConfig = actionWithThreshold?.scoreConfiguration;
      if (
        thresholdConfig?.bronzeMinScore != null &&
        thresholdConfig?.silverMinScore != null &&
        thresholdConfig?.goldMinScore != null
      ) {
        // Use totalScoreWithoutBonus (excludes bonus + images) for threshold
        // medal calculation. Medal tiers represent core achievement levels
        // (e.g. Bronze = Audio Program, Silver = Audio + Meditation, Gold = all three).
        // Bonus actions add to the visible score but should NOT inflate the medal tier.
        medal = ThresholdScoreAlgorithm.calculateTotalScore(
          action,
          transformActions,
          totalScoreWithoutBonus,
          {
            gold: thresholdConfig.goldMinScore,
            silver: thresholdConfig.silverMinScore,
            bronze: thresholdConfig.bronzeMinScore,
          }
        );
      }
    }
    console.log(`Medal: ${medal}`);

    //check if the user had already finished the game before this submission
    const finishedGameBefore = await this.hasFinishedGame(
      userAccount,
      currentTeam
    );

    //update the total score and medal
    const updateActionTotal = await ActionTotal.update({
      score: finalTotalScore,
      medal: medal,
      creator: {
        id: userAccount.id,
        accountOf: { id: userAccount.accountOf.id },
      },
      action: { id: action.id },
      team: { id: currentTeam.id },
      event: { id: currentEvent.id },
    }).for(actionTotal);
    console.log(
      `Updated action score: ${updateActionTotal.score}, medal: ${updateActionTotal.medal}`
    );

    if (actionTotal.medal !== medal) {
      const medalName =
        medal === 1 ? 'Bronze' : medal === 2 ? 'Silver' : 'Gold';
      const displayName = formatDisplayName(user.givenName, user.familyName);
      const currentAction = await Action.select((a) => [a.name, a.identifier])
        .where((a) => a.equals({ id: action.id }))
        .one();
      const actionName = currentAction?.name || currentAction?.identifier;
      if (displayName && medal > 0) {
        LinkedLiveUpdate.send('activity', {
          countryCode: 'us',
          message: `${displayName} - ${actionName}`,
          endIcon: asset(
            `/images/medals/${actionName.toLowerCase()}-${medalName.toLowerCase()}.webp`
          ),
          eventId: currentEvent.id,
          teamId: currentTeam.id,
        });
      }
    }

    // check if the user finished the game after this submission
    const finishedGameNow = await this.hasFinishedGame(
      userAccount,
      currentTeam
    );
    const justFinishedGame = !finishedGameBefore && finishedGameNow;
    console.log(`User finished game now: ${justFinishedGame}`);

    // console.log(
    //   `${process.pid} - returning updated topic score ${topicScore.uri} for ${topic.name} - ${user.givenName}: score ${topicScore.score}, medal ${topicScore.medal}`,
    // );
    return {
      actionTotal: updateActionTotal,
      actions,
      justFinishedGame,
      user: user,
    } as unknown as SubmitResponse;
  }

  async hasFinishedGame(
    userAccount: UserAccountData,
    team: TeamWithEvents
  ): Promise<boolean> {
    let actionTotals = await this.callOtherProvider<ActionTotalProvider>(
      ActionTotalProvider
    ).getAllOf(userAccount);

    // we need to check user playing on register team or event team
    // because regular team has 7 topic action and event team has 5
    // also, now event has 3 types: PW, E, EC
    const isEventMode = Team.getIsEventMode(team);

    const actions = await Action.select();
    const filteredActions = isEventMode
      ? actions.filter(
          (action) =>
            action.id.includes('actionPW') ||
            action.id.includes('actionE') ||
            action.id.includes('actionEC')
        )
      : actions.filter(
          (action) =>
            action.id.includes('action') &&
            !action.id.includes('PW') &&
            !action.id.includes('E') &&
            !action.id.includes('EC')
        );

    //return true if the user has a score for each topic and all the scores are > 0
    const result =
      actionTotals.length === filteredActions.length &&
      actionTotals.every((actionTotal) => {
        return actionTotal.score > 0;
      });

    return result;
  }

  /**
   * Get all game actions for a user, optionally filtered by topic and team.
   *
   * @param user
   * @param topic
   * @param currentTeam
   * @returns
   */
  async getAllOfQuery(
    user: UserData,
    action?: QResult<Action>,
    currentTeam?: QResult<Team | EventTeam>
  ): Promise<ActionSubmissionResult[]> {
    if (action && currentTeam) {
      // Get event ID from currentTeam if it's an event team
      // Check if currentTeam has attendsEvents property (could be TeamWithEvents)
      let eventId: string | undefined;
      const teamWithEvents = currentTeam as TeamWithEvents;
      if (
        teamWithEvents?.attendsEvents &&
        Array.isArray(teamWithEvents.attendsEvents) &&
        teamWithEvents.attendsEvents.length > 0
      ) {
        eventId = teamWithEvents.attendsEvents[0]?.id;
      }

      const actionSubmissions = await ActionSubmission.select((as) => {
        return [
          as.agent,
          as.action,
          as.team,
          as.event,
          as.quantity,
          as.option.select((o) => [
            o.name,
            o.points,
            o.isBonus,
            o.isCustom,
            o.identifier,
            o.description,
          ]),
        ];
      }).where((as) => {
        let condition = as.agent
          .equals(user)
          .and(as.action.equals({ id: action.id }))
          .and(as.team.equals({ id: currentTeam.id }));

        // Filter by event if in event mode to ensure correct ActionSubmissions are found
        if (eventId) {
          condition = condition.and(as.event.equals({ id: eventId }));
        }

        return condition;
      });

      return actionSubmissions;
    }

    const actionSubmissions = await ActionSubmission.select((as) => {
      return [
        as.agent,
        as.action,
        as.team,
        as.quantity,
        as.option.select((o) => [
          o.name,
          o.points,
          o.isBonus,
          o.isCustom,
          o.identifier,
          o.description,
        ]),
      ];
    }).where((as) => {
      return as.agent.equals({
        id: user.id,
      });
    });

    return actionSubmissions;
  }

  async getActionSubmissionByAction(
    action: QResult<Action>,
    forPlayer?: UserData
  ) {
    if (!action) {
      console.warn(`Action not found for getActionSubmissionByAction`);
      return {
        actionSubmissions: [],
        customActionTemplates: [],
      };
    }

    let user = this.request.linkedAuth?.user;
    let userAccount = this.request.linkedAuth?.userAccount;
    if (!userAccount) {
      return Auth.enforceSignedIn();
    }

    // set player from param or authenticated user
    let player;
    if (forPlayer) {
      const existingPerson = await Player.select((p) => {
        return [
          p.currentTeam.select((t) => [t.attendsEvents]),
          p.givenName,
          p.familyName,
          p.address,
        ];
      })
        .where((p) => {
          return p.equals(forPlayer);
        })
        .one();
      player = existingPerson;
    } else {
      const existingPlayer = await Player.select((p) => {
        return [
          p.currentTeam.select((t) => [t.attendsEvents]),
          p.givenName,
          p.familyName,
          p.address,
        ];
      })
        .where((p) => {
          return p.equals(user);
        })
        .one();
      player = existingPlayer;
    }

    // Use player (not user) for agent filter - correct when querying for sub-player
    const actionSubmissions = await this.getAllOfQuery(
      player,
      { id: action.id },
      player.currentTeam
    );

    // get unique custom action templates by id
    const customActionTemplatesMap = new Map();
    actionSubmissions
      .filter((action) => {
        return action.option.isCustom;
      })
      .forEach((action) => {
        const template = action.option;
        // set the template id
        customActionTemplatesMap.set(template.id, template);
      });
    const customActionTemplates = Array.from(customActionTemplatesMap.values());

    return {
      actionSubmissions,
      customActionTemplates,
    };
  }
}
