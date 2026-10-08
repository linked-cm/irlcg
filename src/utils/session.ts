import {
  QResult,
  QueryResponseToResultType,
} from '@_linked/core/queries/SelectQuery';
import {
  UserData,
  AuthSession,
  UserAccountData,
} from '@_linked/auth/types/auth';
import { Player } from '../shapes/Player.js';
import { ImageObject } from '@_linked/schema/shapes/ImageObject';
import { Team } from '../shapes/Team.js';
import { ProfilePicture } from '@linked.cm/profile/shapes/ProfilePicture';

// export const userDataQuery = Player.query((player) => {
//   return [
//     player.profilePicture.cropped.contentUrl,
//     player.withoutAuthentication,
//     player.currentTeam.select((team) => {
//       [team.identifier, team.name];
//     }),
//   ];
// });
//
// type QueryResponseType = GetQueryResponseType<typeof userDataQuery>;
// // type ResultType = QueryResponseToResultType<QueryResponseType, Player>;
// //TODO: FIX result types so we can just use the line above
// type ResultType = QResult<Player,{
//   profilePicture?: QResult<ProfilePicture,{
//     cropped: QResult<ImageObject, {
//       contentUrl: string;
//     }>;
//   }>,
//   profileSetupCompleted: boolean, // should we have this here since we already have on profile-pics?
//   withoutAuthentication: boolean,
//   currentTeam?: QResult<Team, {
//     identifier: string;
//     name: string;
//   }>
// }>
//
// export type IRLCG_UserData = UserData & ResultType;
// export type IRLCG_UserAccountData = UserAccountData<IRLCG_UserData>;
// export type IRLCG_Session = AuthSession<IRLCG_UserAccountData, IRLCG_UserData>;
