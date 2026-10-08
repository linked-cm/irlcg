import { ShapeProvider } from '@_linked/server-utils/utils/ShapeProvider';
import type {
  EnforceSignedIn,
  UserAccountData,
} from '@_linked/auth/types/auth';
import { Player } from './Player.js';
import { Auth } from '@_linked/auth/utils/auth';
import { UserAccount } from '@_linked/sioc/shapes/UserAccount';
import {
  selectUniqueSubPlayerAccounts,
  sortSubPlayers,
} from '../utils/subPlayers.js';

export class PlayerProvider extends ShapeProvider {
  public shape = Player;

  async loadById(id: string) {
    let resource = await Player.select((p) => [p.identifier])
      .where((p) => p.identifier.equals(id))
      .one();
    return resource;
  }

  /**
   * Get all sub-players or members for the current team user
   * @returns An array of UserAccountData for each sub-player
   */
  async getSubPlayers(): Promise<UserAccountData[] | EnforceSignedIn> {
    const auth = this.request.linkedAuth;

    if (!auth) {
      return Auth.enforceSignedIn();
    }

    const user = auth.user;
    const existingPlayer = await Player.select((p) => {
      return [
        p.currentTeam.select((t) => {
          return [
            t.teamLeader,
            t.members.select((m) => {
              return [m.givenName, m.familyName];
            }),
          ];
        }),
      ];
    })
      .where((p) => {
        return p.currentTeam.teamLeader.equals(user);
      })
      .one();

    if (!existingPlayer) {
      return [];
    }

    const currentTeam = existingPlayer?.currentTeam;
    // Linked cardinality can return a single member as an object.
    const members = Array.isArray(currentTeam?.members)
      ? currentTeam.members
      : currentTeam?.members
      ? [currentTeam.members]
      : [];
    if (members.length === 0) {
      return [];
    }

    // Fetch every member account in one query instead of issuing one query per
    // member. Members without an account are naturally absent from the result.
    const accountResults = await UserAccount.select((account) => [
      account.accountOf.select((person) => [
        person.givenName,
        person.familyName,
      ]),
    ]).where((account) => account.accountOf.oneOf(members));
    const membersWithAccounts = Array.isArray(accountResults)
      ? accountResults
      : accountResults
      ? [accountResults]
      : [];

    // RDF membership has no stable order. Keep the leader first to match the
    // Team page, then return the other selectable accounts alphabetically.
    return sortSubPlayers(
      selectUniqueSubPlayerAccounts(membersWithAccounts, auth.userAccount?.id),
      user.id
    );
  }
}
