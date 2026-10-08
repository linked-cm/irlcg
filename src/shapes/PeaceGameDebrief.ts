import { linkedShape } from '../package.js';
import { Thing } from '@_linked/schema/shapes/Thing';
import { irlcg } from '../ontologies/lincd-irlcg.js';
import { sioc } from '@_linked/sioc/ontologies/sioc';
import {
  disallowProperty,
  literalProperty,
  objectProperty,
} from '@_linked/core/shapes/SHACL';
import { UserAccount } from '@_linked/sioc/shapes/UserAccount';
import { Server } from '@_linked/server-utils/utils/Server';
import { Team } from './Team.js';
import { UserAccountData } from '@_linked/auth/types/auth';
import { QResult } from '@_linked/core/queries/SelectQuery';
import { Action } from './Action.js';
import { Event } from './Event.js';

export type PeaceGameDebriefResult = QResult<
  PeaceGameDebrief,
  {
    creator: UserAccountData;
    team: QResult<Team>;
    action?: QResult<Action>;
    event?: QResult<Event>;
    empowermentDebrief1: string;
    onenessDebrief1: string;
    unityDebrief1: string;
    cooperationDebrief1: string;
    abundanceDebrief1: string;
    loveDebrief1: string;
    faithDebrief1: string;
    faithDebrief2: string;
    faithDebrief3: string;
    faithDebrief4: string;
    faithDebrief5: string;
    faithDebrief6: string;
  }
>;

@linkedShape({
  description:
    'A comprehensive debrief covering all game actions and themes. Represents overall game reflection with creator, team, action relationships and multi-action insights. (game debrief, final review, summary)',
})
export class PeaceGameDebrief extends Thing {
  static targetClass = irlcg.PeaceGameDebrief;

  @objectProperty({
    path: sioc.has_creator,
    minCount: 1,
    maxCount: 1,
    description: 'Player who wrote the debrief for themselves.',
    shape: UserAccount,
  })
  get creator(): UserAccount {
    return undefined as any;
  }

  @objectProperty({
    path: irlcg.team,
    shape: Team,
    minCount: 1,
    maxCount: 1,
    description: 'Team context for this debrief',
  })
  get team(): Team {
    return undefined as any;
  }

  @objectProperty({
    path: irlcg.action,
    shape: Action,
    maxCount: 1,
    description:
      'Optional primary action context. The overall Peace Game Debrief covers all actions.',
  })
  get action(): Action {
    return undefined as any;
  }

  @objectProperty({
    path: irlcg.event,
    description:
      'Event context for this peace game debrief. Links to the Event this debrief belongs to.',
    maxCount: 1,
    required: false,
    shape: Event,
  })
  get event(): Event {
    return undefined as any;
  }

  @literalProperty({
    path: irlcg.empowermentDebrief1,
    maxCount: 1,
  })
  get empowermentDebrief1(): string {
    return '';
  }

  @literalProperty({
    path: irlcg.onenessDebrief1,
    maxCount: 1,
    description: 'Debrief response related to oneness topic.',
  })
  get onenessDebrief1(): string {
    return '';
  }

  @literalProperty({
    path: irlcg.unityDebrief1,
    maxCount: 1,
  })
  get unityDebrief1(): string {
    return '';
  }

  @literalProperty({
    path: irlcg.cooperationDebrief1,
    maxCount: 1,
    description: 'Debrief response related to cooperation topic.',
  })
  get cooperationDebrief1(): string {
    return '';
  }

  @literalProperty({
    path: irlcg.abundanceDebrief1,
    maxCount: 1,
    description: 'Debrief response related to abundance topic.',
  })
  get abundanceDebrief1(): string {
    return '';
  }

  @literalProperty({
    path: irlcg.loveDebrief1,
    maxCount: 1,
    description: 'Debrief response related to love topic.',
  })
  get loveDebrief1(): string {
    return '';
  }

  @literalProperty({
    path: irlcg.faithDebrief1,
    maxCount: 1,
    description: 'Debrief response related to faith topic.',
  })
  get faithDebrief1(): string {
    return '';
  }

  @literalProperty({
    path: irlcg.faithDebrief2,
    maxCount: 1,
    description: 'Debrief response related to faith topic.',
  })
  get faithDebrief2(): string {
    return '';
  }

  @literalProperty({
    path: irlcg.faithDebrief3,
    maxCount: 1,
    description: 'Debrief response related to faith topic.',
  })
  get faithDebrief3(): string {
    return '';
  }

  @literalProperty({
    path: irlcg.faithDebrief4,
    maxCount: 1,
    description: 'Debrief response related to faith topic.',
  })
  get faithDebrief4(): string {
    return '';
  }

  @literalProperty({
    path: irlcg.faithDebrief5,
    maxCount: 1,
    description: 'Debrief response related to faith topic.',
  })
  get faithDebrief5(): string {
    return '';
  }

  @literalProperty({
    path: irlcg.faithDebrief6,
    maxCount: 1,
    description: 'Debrief response related to faith topic.',
  })
  get faithDebrief6(): string {
    return '';
  }

  static loadPeaceGameDebrief(): Promise<PeaceGameDebriefResult | null> {
    return Server.call(this, 'loadPeaceGameDebrief');
  }

  static getAllOf(creator: UserAccountData): Promise<PeaceGameDebriefResult[]> {
    return Server.call(this, 'getAllOf', {
      userAccount: creator,
    });
  }

  // ── Disallowed inherited properties from Thing ──────────────────────
  // PeaceGameDebrief uses only its own custom debrief properties

  @disallowProperty
  get name(): any {
    return undefined;
  }

  @disallowProperty
  get alternateName(): any {
    return undefined;
  }

  @disallowProperty
  get description(): any {
    return undefined;
  }

  @disallowProperty
  get disambiguatingDescription(): any {
    return undefined;
  }

  @disallowProperty
  get identifier(): any {
    return undefined;
  }

  @disallowProperty
  get image(): any {
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
}
