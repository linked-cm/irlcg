import {
  AuthSession,
  UserAccountData,
  UserData,
} from '@_linked/auth/types/auth';
import { Auth } from '@_linked/auth/utils/auth';
import { Person } from '@_linked/schema/shapes/Person';
import { Place } from '@_linked/schema/shapes/Place';
import { getNewIncrementalId } from '@_linked/schema/utils/Identifier';
import { ShapeProvider } from '@_linked/server-utils/utils/ShapeProvider';
import { getQueryContext } from '@_linked/core/queries/QueryContext';
import { QResult } from '@_linked/core/queries/SelectQuery';
import { UserAccount } from '@linked.cm/profile/shapes/UserAccount';
import { ActionDebrief } from './ActionDebrief.js';
import { ActionPlan } from './ActionPlan.js';
import { EventTeam } from './EventTeam.js';
import { ActionSubmission } from './ActionSubmission.js';
import { PeaceGameDebrief } from './PeaceGameDebrief.js';
import { Meeting } from './Meeting.js';
import { Player } from './Player.js';
import {
  type AccountsResult,
  Team,
  type TeamParticipation,
  type TeamResult,
  type TeamWithEvents,
} from './Team.js';
import { ActionTotal } from './ActionTotal.js';
import { Action } from './Action.js';
import { Event } from './Event.js';
import { calculateTeamParticipation } from '../utils/teamParticipation.js';

type AssignUserAsTeamLeaderResult =
  | {
      team: TeamResult;
      user: UserData;
    }
  | {
      error: string;
    };

export class TeamProvider extends ShapeProvider {
  public shape = Team;

  async addTeamMate(
    firstName: string,
    lastName: string,
    teamIdentifier?: string
  ) {
    // check if the first name and email are provided
    if (!firstName || !lastName) {
      return {
        error: 'No first name or last name are provided',
      };
    }
    let auth: AuthSession = this.request.linkedAuth;
    if (!auth) {
      console.log('Must be logged in to add a team mate');
      return Auth.enforceSignedIn();
    }
    let user = auth.user;

    let team: QResult<Team>;
    if (!teamIdentifier) {
      //use the current team of the user
      team = await Team.getCurrentTeamOf(user);
    } else {
      team = await this.getTeamById(teamIdentifier);
    }

    let newPerson = await Player.create({
      givenName: firstName,
      familyName: lastName,
      withoutAuthentication: true,
      currentTeam: { id: team.id },
    });

    let newAccount = await UserAccount.create({
      // Reference the existing Player by IRI. Passing the full create result
      // makes core interpret it as a nested Person mutation, where
      // Player-only properties such as withoutAuthentication are invalid.
      accountOf: { id: newPerson.id },
    });

    if (!newAccount) {
      console.error('Failed to create a new user account');
      return {
        error: 'Failed to create a new user account',
      };
    }

    const account = {
      ...newAccount,
      accountOf: {
        ...newAccount.accountOf,
        ...newPerson,
      },
    };

    return this.addUserToTeam({
      teamId: team,
      userAccount: account,
      removeFromOtherTeams: false,
    }).then((response) => {
      if (response) {
        return response;
      } else {
        return 'Failed to add user to the team';
      }
    });
  }

  async addUserToTeam(options: {
    teamId: string | QResult<Team>;
    userAccount: UserAccountData;
    removeFromOtherTeams?: boolean;
    setCurrentTeam?: boolean;
    profileSetupCompleted?: boolean;
  }) {
    console.log(`addUserToTeam`, options.teamId);

    // set default values for options
    const {
      teamId,
      userAccount,
      removeFromOtherTeams = false,
      setCurrentTeam = true,
      profileSetupCompleted = false,
    } = options;

    // get the team
    let team: QResult<Team>;
    if (teamId && (teamId as QResult).id) {
      team = teamId as QResult<Team>;
    } else {
      team = await this.getTeamById(teamId as string);
    }

    if (!team) {
      console.log(`Team with id ${teamId} not found`);
      return {
        error: {
          code: 'TEAM_NOT_FOUND',
          message: `Team with identifier "${teamId}" not found`,
          details: `The team you're trying to join doesn't exist`,
          error: true,
        },
      };
    }

    // find out if the user is in event/trial mode
    const userTeams = await this.getUserTeams(userAccount.accountOf);
    const specialTeam = userTeams.find(
      // only match `/teams/event` or `/teams/trial`, NOT /event-teams/
      (team) =>
        team.id.includes('/teams/event') || team.id.includes('/teams/trial')
    );

    // check if user is in trial/event mode and trying to join a specific team
    // to fixing bug user can't join to another team if already in trial/event mode
    const isJoiningGenericMode = teamId === 'trial' || teamId === 'event';

    // if user is in trial/event mode and joining any other team (numbered team or another trial/event),
    // transfer all data (ActionPlan, ActionDebrief, ActionTotal) to the new team
    // this ensures data is preserved when moving from trial/event mode to a real team
    if (specialTeam) {
      const modeType = specialTeam.id.includes('/teams/event')
        ? 'event'
        : 'trial';
      console.log(
        `User is in ${modeType} mode (${specialTeam.id}) and joining team (${team.id}), transferring data...`
      );
      // move team members to another team (this transfers ActionPlan, ActionDebrief, ActionTotal)
      await this.moveTeamMembersToAnotherTeam(
        userAccount.accountOf,
        specialTeam.id,
        team.id
      );

      return { team, player: userAccount.accountOf };
    }

    // check if user has a previous team and transfer ActionTotals if switching teams
    if (setCurrentTeam) {
      // query player's current team before switching
      const player = await Player.select((p) => {
        return [p.currentTeam];
      })
        .where((p) => {
          return p.equals(userAccount.accountOf);
        })
        .one();

      const previousTeamId = player?.currentTeam?.id;

      if (previousTeamId && previousTeamId !== team.id) {
        console.log(
          `User switching from team ${previousTeamId} to ${team.id}, transferring ActionTotals...`
        );
        // Transfer all ActionTotals, ActionPlans, ActionDebriefs to new team
        await this.moveTeamMembersToAnotherTeam(
          userAccount.accountOf,
          previousTeamId,
          team.id
        );
        // Note: moveTeamMembersToAnotherTeam already updates currentTeam
      } else {
        // set current team to player if no previous team or same team
        const currentTeam = await Player.update({
          currentTeam: {
            id: team.id,
          },
        }).for(userAccount.accountOf);
        console.log(`set current team`, team.id);
      }
    }

    if (removeFromOtherTeams) {
      //remove the user from all other teams
      for (const userTeam of userTeams) {
        if (userTeam.id !== team.id) {
          await Team.update({
            members: {
              remove: {
                id: userAccount.accountOf.id,
              },
            } as any,
          }).for(userTeam);

          // const res2 = await Person.update(p1,{
          //   friends: {
          //     remove: {
          //       id: res.friends.added[0].id,
          //     },
          //   },
          // });
        }
      }
    }

    //update the team members
    await Team.update({
      members: {
        add: {
          id: userAccount.accountOf.id,
        },
      } as any,
    }).for(team);
    // team.members.add(user);

    // set profile completed to true if profileSetupCompleted is provided
    if (profileSetupCompleted) {
      await Player.update({
        profileSetupCompleted: true,
      }).for(userAccount.accountOf);
      console.log(
        `set profileSetupCompleted to true for user`,
        userAccount.accountOf.id
      );
    }

    return { team, player: userAccount.accountOf };
  }

  /**
   * Get teams of a user, with optional filtering by team type and inclusion of members.
   *
   * @param user
   * @param teamFilter
   * @param withMembers
   * @returns Team or EventTeam
   */
  async getUserTeams(
    user?: UserData,
    teamFilter: 'all' | 'regular' | 'event' = 'all',
    withMembers = true
  ) {
    if (!user) {
      const auth: AuthSession = this.request.linkedAuth;
      if (!auth) {
        throw new Error('Must be logged in to get user teams');
      }
      user = auth.user;
    }
    const teams = await Team.select((t) => {
      return [
        t.identifier,
        t.name,
        t.alternateName,
        t.image,
        t.members,
        t.attendsEvents.select((e) => [
          e.identifier,
          e.name,
          e.actions,
          e.isEventMode,
        ]),
      ];
    }).where((t) => {
      return t.members.some((member) => member.equals(user));
    });

    // remove members from teams if withMembers is false
    const resultTeams = withMembers
      ? teams
      : teams.map((team) => ({ ...team, members: [] }));

    if (teamFilter === 'event') {
      return resultTeams.filter((team) =>
        Team.getIsEventMode(team as unknown as TeamWithEvents)
      );
    } else if (teamFilter === 'regular') {
      return resultTeams.filter(
        (team) =>
          !Team.getIsEventMode(team as unknown as TeamWithEvents) &&
          team.id.includes('/teams/')
      );
    }

    return resultTeams; // all teams
  }

  /**
   * Assign a user as team leader by email
   *
   * @param teamId - The team identifier
   * @param accountResult - The account result containing user email
   * @returns Promise with team and user data or error
   */
  async assignUserAsTeamLeader(
    teamId: string,
    accountResult: AccountsResult
  ): Promise<AssignUserAsTeamLeaderResult> {
    try {
      // get the team by identifier
      const team = await Team.select((t) => {
        return [t.identifier, t.name, t.teamLeader, t.members];
      })
        .where((t) => {
          return t.identifier.equals(teamId);
        })
        .one();

      if (!team) {
        console.log(`Team with id ${teamId} not found`);
        return {
          error: `Team with identifier "${teamId}" not found`,
        };
      }

      // get the user account by email with person data
      const userAccount = await UserAccount.select((ua) => {
        return [
          ua.email,
          ua.accountOf.select((p) => {
            return [p.givenName, p.familyName];
          }),
        ];
      })
        .where((ua) => {
          return ua.email.equals(accountResult.email);
        })
        .one();

      if (!userAccount) {
        console.log(`No user account found with email ${accountResult.email}`);
        return {
          error: `User with email "${accountResult.email}" does not exist`,
        };
      }

      // assign selected user as team leader
      const updatedTeam = await Team.update({
        teamLeader: {
          id: userAccount.accountOf.id,
        },
      }).for(team);

      // if the user is not a member of the team yet, add them as a member
      const isUserMember = team?.members?.some(
        (member) => member.id === userAccount.accountOf.id
      );

      if (!isUserMember) {
        await Team.update({
          members: {
            add: {
              id: userAccount.accountOf.id,
            },
          },
        }).for(team);
      }

      return {
        team,
        user: userAccount.accountOf,
      };
    } catch (error) {
      console.error('Error assigning user as team leader:', error);
      return {
        error: `Failed to assign user as team leader: ${
          error.message || error
        }`,
      };
    }
  }

  async getTeamOfUser() {
    // return team identifier from the user and members of the team
    const auth = this.request.linkedAuth;
    if (!auth) {
      console.log('Must be logged in to get team of user');
      return Auth.enforceSignedIn();
    }

    const user = auth.userAccount.accountOf as Person;
    const teams = await Team.select((t) => [t.members]).where((t) =>
      t.members.some((m) => m.equals({ id: user.id }))
    );
    return teams;

    //this method the same like above
    // getUserTeams() {
    //   const auth = this.request.linkedAuth;
    //   const user = auth.userAccount.accountOf as Player;
    //   const teams = Team.getLocalInstances().filter((team) =>
    //     team.members.some((member) => member.namedNode === user.namedNode),
    //   );

    //   return teams;
    // }

    //also getTeamOf(person)
  }

  /**
   *
   */
  async getAllAccounts(): Promise<AccountsResult[]> {
    const accounts = await UserAccount.select((a) => {
      return [
        a.email,
        a.accountOf.select((u) => {
          return [
            u.givenName,
            u.familyName,
            u.telephone,
            u.as(Player).currentTeam,
          ];
        }),
      ];
    });

    const results = await Promise.all(
      accounts.map(async (account) => {
        // get user teams
        const user = account.accountOf;
        const userTeams = await this.getUserTeams(user);
        const currentTeamId = user.currentTeam?.id;

        // get team identifier. If have name, use name. If not, use identifier
        // Example: 350, 351*, 352, Boulder Peace Walk
        const teamIdentifiers = userTeams
          .map((team) => {
            return team.id === currentTeamId
              ? team.name || team.identifier + '*'
              : team.name || team.identifier;
          })
          .join(', ');

        return {
          email: account.email,
          firstName: user.givenName,
          lastName: user.familyName,
          teamIdentifier: teamIdentifiers,
          userAccount: {
            id: account.id,
            accountOf: {
              id: user.id,
            },
          },
        };
      })
    );

    return results;
  }

  async getTeamOf(person: Person) {
    return await Team.select()
      .where((t) => t.members.some((m) => m.equals({ id: person.id })))
      .one();
  }

  async getCurrentTeamOf(player: UserData) {
    const auth = this.request.linkedAuth;
    if (!auth) {
      console.log('Must be logged in to get the current team');
      return Auth.enforceSignedIn() as any;
    }

    // get the player and their current team with members
    const existingPlayer = await Player.select((p) => {
      return [
        p.currentTeam.select((t) => {
          return [
            t.identifier,
            t.name,
            t.teamLeader,
            t.members.select((m) => {
              return [m.givenName, m.familyName];
            }),
          ];
        }),
      ];
    })
      .where((p) => {
        return p.equals(player);
      })
      .one();

    // filter out admin account from team members
    let filteredMembers = [];
    if (existingPlayer?.currentTeam?.members) {
      // find the accounts and persons of people who use ADMIN_EMAIL as their email
      const adminAccounts = await UserAccount.select((u) => [
        u.accountOf,
      ]).where((u) => {
        return u.email.equals(process.env.ADMIN_EMAIL);
      });

      // filter team members by excluding admin email
      filteredMembers = existingPlayer.currentTeam.members.filter((member) => {
        return !adminAccounts.some((admin) => admin.accountOf.id === member.id);
      });
    }

    return {
      team: {
        id: existingPlayer.currentTeam.id,
        identifier: existingPlayer.currentTeam.identifier,
        name: existingPlayer.currentTeam.name,
        teamLeader: existingPlayer.currentTeam.teamLeader,
      },
      members: filteredMembers,
    };
  }

  /**
   * Returns the first team where the current logged-in user is the team leader.
   * If the user is not logged in, it enforces authentication.
   * If the user leads no teams, returns null.
   *
   * @returns {Promise<TeamResult>} An object containing team identifier, name, and teamLeader, or null if none found.
   */
  async getTeamLeader(): Promise<TeamResult> {
    const auth = this.request.linkedAuth;
    if (!auth) {
      console.warn('Must be logged in to get the team leader');
      return Auth.enforceSignedIn() as any;
    }
    const user = auth.user;

    // get all teams where the current user is set as the teamLeader
    const teams = await Team.select((t) => {
      return [t.identifier, t.name, t.teamLeader];
    }).where((t) => {
      return t.teamLeader.equals({
        id: user.id,
      });
    });
    return teams.length > 0 ? teams[0] : null;
  }

  async isUserTeamLeaderOnCurrentTeam(): Promise<boolean> {
    const auth = this.request.linkedAuth;
    if (!auth) {
      console.warn('Must be logged in to check if user is team leader');
      return Auth.enforceSignedIn() as any;
    }

    const user = auth.user;

    // query the player's current team and check if the user is the team leader
    const player = await Player.select((p) => [
      p.currentTeam.select((t) => [t.teamLeader]),
    ])
      .where((p) => {
        return p.equals(user);
      })
      .one();

    if (!player?.currentTeam?.teamLeader) {
      return false;
    }

    // check if the teamLeader equals the current user
    return player.currentTeam.teamLeader.id === user.id;
  }

  // TODO: disable for now, because not used on FE
  // createTeamMeeting(form) {
  //   let team = this.getTeamLeader();

  //   if (team) {
  //     let address = new Place();
  //     let newMeeting = new Meeting();

  //     newMeeting.name = form.action;
  //     newMeeting.meetingType = form.meetingType;
  //     newMeeting.startDate = new Date(form.date);

  //     if (form.place) {
  //       if (form.place instanceof AdministrativeArea) {
  //         address.name = form.place.name;
  //         address.latitude = form.place.latitude;
  //         address.longitude = form.place.longitude;
  //         address.save();
  //       } else {
  //         address.name = form.place;
  //         address.save();
  //       }
  //     }

  //     newMeeting.location = address;
  //     newMeeting.save();

  //     if (newMeeting) {
  //       team.meetings.add(newMeeting);
  //     } else {
  //       console.error('newMeeting is undefined or not properly saved.');
  //       // Handle the issue as appropriate
  //     }

  //     return {newMeeting, team};
  //   }
  // }

  async getTeamMeeting() {
    let teamMeeting = await Meeting.selectAll();
    if (teamMeeting) {
      let place = await Place.selectAll();
      return { teamMeeting, place };
    }
  }

  async getTeamMembersByTeamId(teamIdentifier: string) {
    let teams = await Team.select((t) =>
      t.members.select((m) => {
        return [m.givenName, m.familyName];
      })
    ).where((t) => t.identifier.equals(teamIdentifier));
    if (teams.length > 0) {
      return teams[0];
    }
  }

  /**
   * Get team by identifier or id
   *
   * @param teamIdentifier
   * @returns
   */
  async getTeamById(teamIdentifier: string): Promise<QResult<Team>> {
    if (typeof teamIdentifier !== 'string') {
      console.warn('Team identifier must be a string:' + teamIdentifier);
      return;
    }

    const team = await Team.select((t) => {
      return [t.identifier, t.name, t.teamLeader, t.members];
    })
      .where((t) => {
        return t.identifier
          .equals(teamIdentifier)
          .or(t.equals({ id: teamIdentifier }));
      })
      .one();

    if (!team) {
      console.warn('Team not found:' + teamIdentifier);
      return;
    }

    return team;
  }

  static teamToGroupId(identifier: string) {
    // return existingTeam;
  }

  async createTeam(eventId?: string) {
    const auth = this.request.linkedAuth;
    // check if the user is authenticated as person and then create a team if not already exists
    if (!auth || !auth.userAccount) {
      console.warn('Must be logged in to create a team');
      return Auth.enforceSignedIn();
    }
    const account = auth.userAccount;
    const user = auth.user;
    const admin = process.env.ADMIN_EMAIL;

    const existingAccount = await UserAccount.select((u) => {
      return [u.email, u.accountOf];
    })
      .where((u) => {
        return u.equals(account);
      })
      .one();

    if (!existingAccount) {
      return {
        error: 'User not found',
      };
    }

    // if user as a admin, has ability to create unlimited teams
    // if not, user can only create one team
    if (admin !== existingAccount.email) {
      // check if the user is already team leader of a team, if so return an error instead.
      const existingTeam = await Team.select((t) => {
        return [t.identifier, t.teamLeader];
      })
        .where((t) => {
          return t.teamLeader.equals(user);
        })
        .one();

      if (existingTeam) {
        return {
          error: 'You can only create one team.',
        };
      }
    }

    // get event: use eventId if provided, otherwise default to peace-game-community
    let event = null;
    if (eventId) {
      event = await Event.getOne(eventId);
      if (!event) {
        return {
          error: `Event with identifier "${eventId}" not found`,
        };
      }
    } else {
      // no eventId: add team to default peace-game-community event
      event = await Event.getOne('peace-game-community');
    }

    // create a new team
    const newId = (await getNewIncrementalId(Team)).toString();
    const teamData: any = {
      __id: `${process.env.DATA_ROOT + '/teams/' + newId}`,
      identifier: newId,
      teamLeader: user,
      members: [{ id: user.id }],
    };

    // add event if we have one (from eventId or default peace-game-community)
    if (event) {
      teamData.attendsEvents = [{ id: event.id }];
    }

    try {
      const newTeam = await Team.create(teamData);

      if (!newTeam) {
        return {
          error: 'Error creating team ' + newId,
        };
      }

      // A newly created team becomes the leader's active team. Without this,
      // event-scoped pages such as Peace Game Debrief cannot resolve a team.
      await Player.update({
        currentTeam: {
          id: newTeam.id,
        },
      }).for(user);

      return { user, team: newTeam };
    } catch (err) {
      console.error('Error creating team:', err);
      return {
        error: `Failed to create team: ${
          err instanceof Error ? err.message : String(err)
        }`,
      };
    }
  }

  /**
   * Get statistics about teams
   * This include Teams and EventTeams
   *
   * @returns
   */
  async getTeamStatistics() {
    // const numTeams = Team.getLocalInstances().size;
    const numTeams = (await Team.select()).length;
    const lastTeamCreated = (await getNewIncrementalId(Team)) - 1;
    return { numTeams, lastTeamCreated };
  }

  // get all team identifier
  // TODO: review can we remove this and use ``getAllTeams`` instead?
  async getAllTeamsIdentifiers() {
    const teams = await Team.select((t) => {
      return [t.identifier];
    });
    return teams;
  }

  // get all teams
  async getAllTeams() {
    const teams = await Team.select((t) => {
      return [t.identifier, t.name];
    });

    return teams;
  }

  /**
   * Builds Team Progress for the requested or current team. Event action
   * metadata keeps zero-score actions visible and avoids client N+1 queries.
   */
  async getTeamParticipation(
    team?: TeamWithEvents
  ): Promise<Record<string, TeamParticipation>> {
    const auth = this.request.linkedAuth;
    if (!auth) {
      console.warn('Must be logged in to get team participation');
      return Auth.enforceSignedIn() as any;
    }

    let requestedTeam = team;
    if (!team) {
      const currentTeamResult = await this.getCurrentTeamOf(auth.user);
      if (!currentTeamResult) {
        console.warn('No current team found for user');
        return {};
      }

      requestedTeam = currentTeamResult.team as TeamWithEvents;
    }

    const targetTeam = (await Team.select((t) => {
      return [
        t.members,
        t.attendsEvents.select((e) => [
          e.identifier,
          e.name,
          e.actions.select((action) => ({
            name: action.name,
            identifier: action.identifier,
            category: action.category,
            image: (action.image as any).select((image) => ({
              contentUrl: image.contentUrl,
            })),
          })),
          e.isEventMode,
        ]),
      ];
    })
      .where((t) => {
        return t.equals(requestedTeam);
      })
      .one()) as unknown as TeamWithEvents;

    if (!targetTeam) {
      console.warn('Team not found or has no members');
      return {};
    }

    const teamMembers = new Set(
      (targetTeam.members || []).map((member) => member.id)
    );

    // early return if no team members
    if (teamMembers.size === 0) {
      console.warn('No team members found');
      return {};
    }

    // Query only this team's totals; scanning all actions/totals is expensive
    // and can incorrectly include participation belonging to another team.
    const actionScores = await ActionTotal.select((ts) => {
      return [
        ts.team,
        ts.creator.select((c) => {
          return [c.accountOf];
        }),
        ts.score,
        ts.action,
      ];
    }).where((ts) => {
      return ts.team.equals(targetTeam);
    });

    return calculateTeamParticipation(
      teamMembers,
      actionScores.map((actionScore) => ({
        creatorId: actionScore.creator?.accountOf?.id,
        actionId: actionScore.action?.id,
        score: actionScore.score,
      })),
      (targetTeam.attendsEvents || []).flatMap((event) => event.actions || [])
    );
  }

  /**
   * move team members to another team
   * all ActionTotal, ActionPlan, ActionDebrief, ActionSubmission, and PeaceGameDebrief data will be moved to the new team
   * and last a new team will update the current team
   */
  async moveTeamMembersToAnotherTeam(
    user: UserData,
    teamId: string,
    newTeamId: string
  ) {
    // TODO: should we query get the users here? or should we pass the user from parameter?
    const player = await Player.select((p) => {
      return [
        p.givenName,
        p.familyName,
        p.withoutAuthentication,
        p.currentTeam,
      ];
    })
      .where((p) => {
        return p.equals(user);
      })
      .one();

    if (!player) {
      console.warn(`User not found with id ${user.id}`);
      return;
    }

    const account = await UserAccount.select((u) => {
      return [u.accountOf];
    })
      .where((u) => {
        return u.accountOf.equals(player);
      })
      .one();

    if (!account) {
      console.warn(`User account not found for user with id ${player.id}`);
      return;
    }

    const team = await this.getTeamById(teamId);
    const newTeam = await this.getTeamById(newTeamId);

    if (!team || !newTeam) {
      console.log('Team not found');
      return {
        error: 'Team not found',
      };
    }

    const newTeamWithEvents = await Team.select((t) => {
      return [t.attendsEvents];
    })
      .where((t) => t.equals(newTeam))
      .one();
    const targetEvent = newTeamWithEvents?.attendsEvents?.[0];
    const targetEventUpdate = targetEvent?.id
      ? {
          event: {
            id: targetEvent.id,
          },
        }
      : {};

    // get ALL ActionTotals by user and team (user can have multiple for different actions)
    const actionScores = await ActionTotal.select((t) => {
      return [t.score, t.action, t.team, t.creator, t.event];
    }).where((t) => {
      return t.team.equals(team) && t.creator.equals(account);
    });

    // get ALL ActionPlans by user and team (user can have multiple for different actions)
    const actionPlans = await ActionPlan.select((a) => {
      return [a.team, a.creator, a.event];
    }).where((a) => {
      return a.team.equals(team) && a.creator.equals(account);
    });

    // get ALL ActionDebriefs by user and team (user can have multiple for different actions)
    const actionDebriefs = await ActionDebrief.select((a) => {
      return [a.team, a.creator, a.event];
    }).where((a) => {
      return a.team.equals(team) && a.creator.equals(account);
    });

    // get ALL ActionSubmissions by user and team
    const actionSubmissions = await ActionSubmission.select((g) => {
      return [g.team, g.agent, g.event];
    }).where((g) => {
      return g.team.equals(team) && g.agent.equals(player);
    });

    // get ALL PeaceGameDebriefs by user and team
    const peaceGameDebriefs = await PeaceGameDebrief.select((p) => {
      return [p.team, p.creator, p.event];
    }).where((p) => {
      return p.team.equals(team) && p.creator.equals(account);
    });

    // transfer ALL ActionTotals to new team
    if (actionScores && actionScores.length > 0) {
      console.log(
        `Transferring ${actionScores.length} ActionTotal(s) from team ${team.id} to ${newTeam.id}`
      );
      for (const actionScore of actionScores) {
        await ActionTotal.update({
          team: {
            id: newTeam.id,
          },
          ...targetEventUpdate,
        }).for(actionScore);
      }
    } else {
      console.log(
        `No action totals found for user ${player.id} and team ${team.id}`
      );
    }

    // transfer ALL ActionPlans to new team
    if (actionPlans && actionPlans.length > 0) {
      console.log(
        `Transferring ${actionPlans.length} ActionPlan(s) from team ${team.id} to ${newTeam.id}`
      );
      for (const actionPlan of actionPlans) {
        await ActionPlan.update({
          team: {
            id: newTeam.id,
          },
          ...targetEventUpdate,
        }).for(actionPlan);
      }
    } else {
      console.log(
        `No action plans found for user ${player.id} and team ${team.id}`
      );
    }

    // transfer ALL ActionDebriefs to new team
    if (actionDebriefs && actionDebriefs.length > 0) {
      console.log(
        `Transferring ${actionDebriefs.length} ActionDebrief(s) from team ${team.id} to ${newTeam.id}`
      );
      for (const actionDebrief of actionDebriefs) {
        await ActionDebrief.update({
          team: {
            id: newTeam.id,
          },
          ...targetEventUpdate,
        }).for(actionDebrief);
      }
    } else {
      console.log(
        `No action debriefs found for user ${player.id} and team ${team.id}`
      );
    }

    // transfer ALL ActionSubmissions to new team
    if (actionSubmissions && actionSubmissions.length > 0) {
      console.log(
        `Transferring ${actionSubmissions.length} ActionSubmission(s) from team ${team.id} to ${newTeam.id}`
      );
      for (const actionSubmission of actionSubmissions) {
        await ActionSubmission.update({
          team: {
            id: newTeam.id,
          },
          ...targetEventUpdate,
        }).for(actionSubmission);
      }
    } else {
      console.log(
        `No action submissions found for user ${player.id} and team ${team.id}`
      );
    }

    // transfer ALL PeaceGameDebriefs to new team
    if (peaceGameDebriefs && peaceGameDebriefs.length > 0) {
      console.log(
        `Transferring ${peaceGameDebriefs.length} PeaceGameDebrief(s) from team ${team.id} to ${newTeam.id}`
      );
      for (const peaceGameDebrief of peaceGameDebriefs) {
        await PeaceGameDebrief.update({
          team: {
            id: newTeam.id,
          },
          ...targetEventUpdate,
        }).for(peaceGameDebrief);
      }
    } else {
      console.log(
        `No peace game debriefs found for user ${player.id} and team ${team.id}`
      );
    }

    // set current team to player
    const updateUser = await Player.update({
      currentTeam: {
        id: newTeam.id,
      },
    }).for(player);

    // add user to new team members
    const addUserToNewTeam = await Team.update({
      members: {
        // @ts-ignore
        add: { id: player.id },
      },
    }).for(newTeam);

    // remove user from old team members
    const removeUserFromOldTeam = await Team.update({
      members: {
        remove: { id: player.id },
      },
    }).for(team);

    return {
      user: player,
      team: newTeam,
    };
  }

  async addUserToAction(userAccount: UserAccountData) {
    // get player
    const player = userAccount.accountOf;

    // deinfe action groups
    const actionGroups = [
      'action-1',
      'action-2',
      'action-3',
      'action-4',
      'action-5',
      'action-6',
      'action-7',
    ];

    const { withoutAuthentication } = await Player.select(
      (p) => p.withoutAuthentication
    ).for(player);

    return {
      player,
    };
  }

  /**
   * remove user, account, and team
   * this method currently use on remove offline members
   *
   * @param user
   * @param teamId
   * @returns
   */
  async removeTeamMate(user: UserData, teamId: string) {
    const team = await this.getTeamById(teamId);
    if (!team) {
      console.log('Team not found');
      return {
        error: 'Team not found',
      };
    }

    // remove user from team members
    const result = await Team.update({
      members: {
        // @ts-ignore
        remove: {
          id: user.id,
        },
      },
    }).for(team);
    // team.members.delete(player);
    // team.save();

    console.log(`user ${user.id} has been remove from team`, team.id);

    return true;
  }

  /**
   * Switch user's current team
   * @param teamId - The ID of the team to switch to
   * @returns Updated user data with new current team
   */
  async switchCurrentTeam(teamId: string) {
    const auth = this.request.linkedAuth;
    if (!auth || !auth.userAccount) {
      console.warn('Must be logged in to switch teams');
      return Auth.enforceSignedIn();
    }

    const userAccount = auth.userAccount;
    const user = userAccount.accountOf;

    // Get user's current team before switching
    const player = await Player.select((p) => {
      return [p.currentTeam];
    })
      .where((p) => {
        return p.equals(user);
      })
      .one();

    const previousTeamId = player?.currentTeam?.id;

    // Check if the target team exists and user is a member
    const userTeams = await this.getUserTeams(user);
    const targetTeam = userTeams.find((team) => team.id === teamId);

    if (!targetTeam) {
      return {
        error: {
          code: 'TEAM_NOT_FOUND',
          message: 'Team not found or you are not a member of this team',
          details: `Cannot switch to team ${teamId} - team not found or access denied`,
        },
      };
    }

    // Transfer ActionTotals if switching to a different team
    if (previousTeamId && previousTeamId !== teamId) {
      console.log(
        `User switching from team ${previousTeamId} to ${teamId}, transferring ActionTotals...`
      );
      // Transfer all ActionTotals, ActionPlans, ActionDebriefs to new team
      await this.moveTeamMembersToAnotherTeam(user, previousTeamId, teamId);
      // Note: moveTeamMembersToAnotherTeam already updates currentTeam and session

      return {
        user: user,
        team: targetTeam,
        updatedAuth: auth,
      };
    }

    // If no previous team or same team, just update currentTeam
    const updatedUser = await Player.update({
      currentTeam: {
        id: targetTeam.id,
      },
    }).for(user);

    // Synchronize with session
    const updatedAuth = await this.request.linkedAuth.updateSessionData({
      user: {
        ...user,
        currentTeam: targetTeam,
      },
    });

    return {
      user: updatedUser,
      team: targetTeam,
      updatedAuth,
    };
  }
}
