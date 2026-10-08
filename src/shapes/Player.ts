import { schema } from '@_linked/schema/ontologies/schema';
import { Server } from '@_linked/server-utils/utils/Server';
import { Boolean } from '@_linked/xsd/shapes/Boolean';

import {
  disallowProperty,
  literalProperty,
  objectProperty,
} from '@_linked/core/shapes/SHACL';
import { Person } from '@linked.cm/profile/shapes/Person';
import { irlcg } from '../ontologies/lincd-irlcg.js';
import { linkedShape } from '../package.js';
import { Team } from './Team.js';

@linkedShape({
  description:
    "A person who plays this app. Has current team, profile picture and address. Can be ranked by the number of actions they've taken (gamer, participant, user).",
})
export class Player extends Person {
  static targetClass = schema.Person;

  @objectProperty({
    path: irlcg.currentTeam,
    shape: Team,
    maxCount: 1,
    description:
      'A player can be a member of multiple teams, this represents the current team they are playing under. They are still a valid member of the other teams. Use Team.members for checking membership.',
  })
  get currentTeam(): Team {
    return undefined as any;
  }

  @literalProperty({
    path: irlcg.withoutAuthentication,
    datatype: Boolean.targetClass,
    maxCount: 1,
    description: "Player's user account has not been authenticated yet.",
  })
  get withoutAuthentication(): boolean {
    return false;
  }

  /**
   * Peace Flame (plan 003): denormalized flag indicating this Player has submitted
   * at least one ActionSubmission. Set true on the first submission; never unset.
   * Powers `ActionTotalProvider.getTotalPlayers()` — specifically for the case of
   * GUEST Players (withoutAuthentication = true) created by anonymous Peace Torch
   * visitors. Registered Players are counted regardless of this flag, so it really
   * only matters for the guest path. Lighting the Peace Torch alone does NOT flip
   * this flag; only ActionSubmissions do (e.g. a Befriend report from the torch UI).
   */
  @literalProperty({
    path: irlcg.hasTakenAction,
    datatype: Boolean.targetClass,
    maxCount: 1,
    description: 'True once the Player has made at least one ActionSubmission.',
  })
  get hasTakenAction(): boolean {
    return false;
  }

  @literalProperty({
    path: irlcg.attendance,
    maxCount: 1,
    in: ['inPerson', 'home'],
    description: 'Way the player will attend events, in person or from home',
  })
  get attendance(): string {
    return '';
  }

  static getSubPlayers() {
    return Server.call(this, 'getSubPlayers');
  }

  @disallowProperty
  get name(): any {
    return undefined;
  }

  @disallowProperty
  get gender(): any {
    return undefined;
  }

  @disallowProperty
  get isMarried(): any {
    return undefined;
  }

  @disallowProperty
  get birthDate(): any {
    return undefined;
  }

  @disallowProperty
  get birthPlace(): any {
    return undefined;
  }

  @disallowProperty
  get knows(): any {
    return undefined;
  }

  @disallowProperty
  get jobTitle(): any {
    return undefined;
  }

  @disallowProperty
  get honorificPrefix(): any {
    return undefined;
  }

  @disallowProperty
  get alternateName(): any {
    return undefined;
  }

  @disallowProperty
  get disambiguatingDescription(): any {
    return undefined;
  }

  @disallowProperty
  get url(): any {
    return undefined;
  }

  @disallowProperty
  get additionalType(): any {
    return undefined;
  }

  @disallowProperty
  get skills(): any {
    return undefined;
  }

  @disallowProperty
  get hasOccupation(): any {
    return undefined;
  }

  @disallowProperty
  get homeLocation(): any {
    return undefined;
  }

  @disallowProperty
  get areaServed(): any {
    return undefined;
  }

  @disallowProperty
  get description(): any {
    return undefined;
  }

  @disallowProperty
  get profilePicture2(): any {
    return undefined;
  }

  @disallowProperty
  get profilePicture3(): any {
    return undefined;
  }

  @disallowProperty
  get profilePicture4(): any {
    return undefined;
  }

  @disallowProperty
  get profilePicture5(): any {
    return undefined;
  }

  @disallowProperty
  get profilePicture6(): any {
    return undefined;
  }

  @disallowProperty
  get smokingHabit(): any {
    return undefined;
  }

  @disallowProperty
  get drinkFrequency(): any {
    return undefined;
  }

  @disallowProperty
  get fourTwentyFriendly(): any {
    return undefined;
  }

  @disallowProperty
  get languagePreference(): any {
    return undefined;
  }

  @disallowProperty
  get workoutFrequency(): any {
    return undefined;
  }

  @disallowProperty
  get passions(): any {
    return undefined;
  }

  @disallowProperty
  get beliefs(): any {
    return undefined;
  }

  @disallowProperty
  get systemIdeologies(): any {
    return undefined;
  }

  @disallowProperty
  get coreValues(): any {
    return undefined;
  }

  @disallowProperty
  get spiritualPractices(): any {
    return undefined;
  }

  @disallowProperty
  get sacredTexts(): any {
    return undefined;
  }

  @disallowProperty
  get mayanAstrology(): any {
    return undefined;
  }

  @disallowProperty
  get chineseZodiac(): any {
    return undefined;
  }

  @disallowProperty
  get myersBriggsPersonalityType(): any {
    return undefined;
  }

  @disallowProperty
  get loveLanguage1(): any {
    return undefined;
  }

  @disallowProperty
  get loveLanguage2(): any {
    return undefined;
  }

  @disallowProperty
  get loveLanguage3(): any {
    return undefined;
  }

  @disallowProperty
  get loveLanguage4(): any {
    return undefined;
  }

  @disallowProperty
  get loveLanguage5(): any {
    return undefined;
  }

  @disallowProperty
  get spiritualJourney(): any {
    return undefined;
  }

  @disallowProperty
  get image(): any {
    return undefined;
  }

  // static isInCertainMode(userAuthObject:UserData,teamName: string) {
  //   //e.g. trial mode
  //   console.warn('TODO: re-implement isInCertainMode. Need to use query to get current team and then team.isEventTeam()');
  //   // return (userAuthObject?.currentTeam as any)?.id.includes(teamName);
  // }
  //
  // // check current mode user who signup from event registration
  // static isEventMode(user:IRLCG_UserData): boolean {
  //   //TODO: fix type error
  //   return (user.currentTeam as any)?.id.includes('event-teams') || false;
  // }
  // isEventMode(): boolean {
  //   return false;
  // }
  // isInCertainMode(teamName: string): boolean {
  //   return false;
  // }
}
