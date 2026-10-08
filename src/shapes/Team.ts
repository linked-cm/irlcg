import { UserAccountData, UserData } from '@_linked/auth/types/auth';
import { schema } from '@_linked/schema/ontologies/schema';
import { Organization } from '@_linked/schema/shapes/Organization';
import { Person } from '@_linked/schema/shapes/Person';
import { Server } from '@_linked/server-utils/utils/Server';
import { xsd } from '@_linked/xsd/ontologies/xsd';
import { ShapeSet } from '@_linked/core/collections/ShapeSet';

import { QResult } from '@_linked/core/queries/SelectQuery';
import {
  disallowProperty,
  literalProperty,
  objectProperty,
} from '@_linked/core/shapes/SHACL';
import { irlcg } from '../ontologies/lincd-irlcg.js';
import { linkedShape } from '../package.js';
import { Meeting } from './Meeting.js';
import { type EventResult, type Event } from './Event.js';
import './Event.js';
import { Action } from './Action.js';

export type TeamResult = QResult<
  Team,
  {
    identifier?: string;
    name?: string;
    members?: UserData[];
    teamLeader?: UserData;
    attendsEvents?: EventResult[];
  }
>;

/**
 * Team type with required attendsEvents for checking event mode.
 * Based on TeamResult but requires attendsEvents to be selected.
 */
export type TeamWithEvents = Omit<TeamResult, 'attendsEvents'> & {
  attendsEvents?: EventResult[];
};

/**
 * Minimum query result required by the event-mode helpers.
 *
 * Callers do not need to select a complete EventResult: mode detection only
 * reads the team identity plus the first event's explicit mode and action IDs.
 */
export type TeamEventModeContext = {
  id: string;
  attendsEvents?: Array<{
    actions?: Array<{ id: string }>;
    isEventMode?: boolean;
  }>;
};

/**
 * Serializable participation data returned by `getTeamParticipation`.
 * Embedded action metadata prevents a separate client query for every card.
 */
export type TeamParticipation = {
  percentage: number;
  action: {
    id: string;
    name?: string;
    identifier?: string;
    category?: string;
    image?: {
      id?: string;
      contentUrl?: string;
    } | null;
  };
};

@linkedShape({
  description:
    'A team of players in the peace game. Always has an identifier and team leader, may have a name. Represents game groups with team leaders, meetings, messages, and member management. (group, squad, unit)',
})
export class Team extends Organization {
  static targetClass = irlcg.Team;

  @objectProperty({
    path: irlcg.Meeting,
    shape: Meeting,
  })
  get meetings(): ShapeSet<Meeting> {
    return undefined as any;
  }

  @literalProperty({
    path: irlcg.teamLeaderMessage,
  })
  get teamLeaderMessage(): string {
    return '';
  }

  /**
   * NOTE: overwriting identifier from Thing to imply that it's a required property for a Team
   */
  @literalProperty({
    path: schema.identifier,
    datatype: xsd.string,
    description:
      'The identifier of this team. Every team has an identifier that can be used as a team number or name.',
    maxCount: 1,
    minCount: 1,
  })
  get identifier(): string {
    return '';
  }

  /**
   * NOTE: overwriting from schema Thing to imply that it's a required property for a Team
   */
  @literalProperty({
    path: schema.name,
    maxCount: 1,
    datatype: xsd.string,
    description:
      'The name of this team. OPTIONAL. All teams have identifiers, only event teams have names.',
  })
  get name(): string {
    return '';
  }

  // I created team leader as property replacing team founder that use as admin
  @objectProperty({
    path: irlcg.teamLeader,
    shape: Person,
    minCount: 1,
    maxCount: 1,
    description:
      'Leader of the team, responsible for team management and coordination.',
  })
  get teamLeader(): Person {
    return undefined as any;
  }

  @literalProperty({
    path: irlcg.nextMeetingDate,
    description: 'Date of the next scheduled team meeting.',
  })
  get nextMeetingDate(): Date {
    return undefined as any;
  }

  @disallowProperty
  get faxNumber(): any {
    return undefined;
  }

  @disallowProperty
  get email(): any {
    return undefined;
  }

  @disallowProperty
  get legalName(): any {
    return undefined;
  }

  @disallowProperty
  get address(): any {
    return undefined;
  }

  @disallowProperty
  get telephone(): any {
    return undefined;
  }

  @disallowProperty
  get founder(): any {
    return undefined;
  }

  @objectProperty({
    path: irlcg.attendsEvents,
    shape: ['@_linked/irlcg', 'Event'],
    description: 'Events that the team attends.',
  })
  get attendsEvents(): ShapeSet<Event> {
    return undefined as any;
  }

  static addUserToTeam(options: {
    teamId: number | string;
    userAccount: UserAccountData;
    removeFromOtherTeams?: boolean;
    setCurrentTeam?: boolean;
    profileSetupCompleted?: boolean;
    isEventTeam?: boolean;
  }): Promise<{
    team: Team;
    error?: {
      code: string;
      message: string;
      details: string;
      error: boolean;
    };
  }> {
    return Server.call(this, 'addUserToTeam', options);
  }

  static isTrialTeam(team: { id: string } | null | undefined) {
    if (!team) return false;
    //TODO: make this better, probably with a type check
    return team.id.includes('trial');
  }

  static getAllAccounts(): Promise<AccountsResult[]> {
    return Server.call(this, 'getAllAccounts');
  }

  static getTeamMeeting() {
    return Server.call(this, 'getTeamMeeting');
  }

  static getAllUserInTheTeam() {
    return Server.call(this, 'getAllUserInTheTeam');
  }

  static getAllTeamsIdentifiers() {
    return Server.call(this, 'getAllTeamsIdentifiers');
  }

  static getAllTeams() {
    return Server.call(this, 'getAllTeams');
  }

  /**
   * Get teams of a user, with optional filtering by team type and inclusion of members.
   *
   * @param user
   * @param teamFilter
   * @param withMembers
   * @returns Team or EventTeam
   */
  static getUserTeams({
    user,
    teamFilter = 'all',
    withMembers = false,
  }: {
    user?: UserData;
    teamFilter?: 'all' | 'regular' | 'event';
    withMembers?: boolean;
  }) {
    return Server.call(this, 'getUserTeams', user, teamFilter, withMembers);
  }

  static getTeamOfUser() {
    return Server.call(this, 'getTeamOfUser');
  }

  static getTeamById(teamId: number | string) {
    return Server.call(this, 'getTeamById', teamId);
  }

  static getTeamMembersByTeamId(teamIdentifier: string | number) {
    return Server.call(this, 'getTeamMembersByTeamId', teamIdentifier);
  }

  static getTeamOf(person: Person) {
    return Server.call(this, 'getTeamOf', person);
  }

  static getCurrentTeamOf(player: UserData) {
    return Server.call(this, 'getCurrentTeamOf', player);
  }

  static createTeam(eventId?: string) {
    return Server.call(this, 'createTeam', eventId);
  }

  // TODO: disable for now, because not used on FE
  // static createTeamMeeting(form) {
  //   return Server.call(this, 'createTeamMeeting', form);
  // }

  static getTeamLeader() {
    return Server.call(this, 'getTeamLeader');
  }

  static assignUserAsTeamLeader(teamId: number, user: AccountsResult) {
    return Server.call(this, 'assignUserAsTeamLeader', teamId, user);
  }

  static isUserTeamLeaderOnCurrentTeam() {
    return Server.call(this, 'isUserTeamLeaderOnCurrentTeam');
  }

  static addTeamMate(firstName: string, lastName: string, teamID?: number) {
    return Server.call(this, 'addTeamMate', firstName, lastName, teamID);
  }

  /**
   * Returns participation keyed by action IRI. Positive totals count once per
   * member; omitting `team` uses the authenticated user's current team.
   */
  static getTeamParticipation(
    team?: QResult<Team>
  ): Promise<Record<string, TeamParticipation>> {
    return Server.call(this, 'getTeamParticipation', team);
  }
  static getTeamStatistics() {
    return Server.call(this, 'getTeamStatistics');
  }

  static moveTeamMembersToAnotherTeam(
    user: UserData,
    teamId: number | string,
    newTeamId: number
  ) {
    return Server.call(
      this,
      'moveTeamMembersToAnotherTeam',
      user,
      teamId,
      newTeamId
    );
  }

  static addUserToAction(userAccount: UserAccountData) {
    return Server.call(this, 'addUserToAction', userAccount);
  }

  static removeTeamMate(user: UserData, teamId: number | string) {
    return Server.call(this, 'removeTeamMate', user, teamId);
  }

  static switchCurrentTeam(teamId: string) {
    return Server.call(this, 'switchCurrentTeam', teamId);
  }

  /**
   * Check if a team is using event-type actions (actionE2, actionPW1, actionEC2, etc.).
   * Checks the first action from the first event to determine if team is using event actions.
   * Note: callers must select attendsEvents with actions in their query.
   *
   * @param team - Team with attendsEvents and actions selected
   * @returns true when the team's first event uses event-type actions (not regular actions)
   */
  static isEventAction(team: TeamEventModeContext | null | undefined): boolean {
    if (!team?.attendsEvents?.length) return false;

    const firstEvent = team.attendsEvents[0];
    const firstActionId = firstEvent?.actions?.[0]?.id;

    if (!firstActionId) return false;

    return Action.isEventAction(firstActionId);
  }

  /**
   * Get isEventMode from the team's first event.
   * Uses explicit event.isEventMode when set; falls back to action-based check for backward compat.
   * Excludes trial teams.
   * @param team - Team with attendsEvents (include isEventMode for explicit, or actions for fallback)
   * @returns true = event mode; false = regular mode
   */
  static getIsEventMode(
    team: TeamEventModeContext | null | undefined
  ): boolean {
    if (!team) return false;
    if (Team.isTrialTeam(team)) return false;
    const firstEvent = team?.attendsEvents?.[0];
    if (!firstEvent) return false;
    if (
      firstEvent.isEventMode !== undefined &&
      firstEvent.isEventMode !== null
    ) {
      return firstEvent.isEventMode;
    }
    return Team.isEventAction(team);
  }
}
export type AccountsResult = {
  email: string;
  firstName: string;
  lastName: string;
  teamIdentifier: string;
  userAccount: UserAccountData;
};
