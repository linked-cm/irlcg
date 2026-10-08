import type { UserAccountData } from '@_linked/auth/types/auth';
import type { QResult } from '@_linked/core/queries/SelectQuery';
import { literalProperty, objectProperty } from '@_linked/core/shapes/SHACL';
import { Thing } from '@_linked/schema/shapes/Thing';
import { Server } from '@_linked/server-utils/utils/Server';
import { sioc } from '@_linked/sioc/ontologies/sioc';
import { UserAccount } from '@_linked/sioc/shapes/UserAccount';
import { xsd } from '@_linked/xsd/ontologies/xsd';
import { irlcg } from '../ontologies/lincd-irlcg.js';
import { linkedShape } from '../package.js';
import { Action } from './Action.js';

export interface AudioHistorySaveInput {
  action: QResult<Action>;
  programKey: string;
  language: string;
  activeTrackKey?: string | null;
  currentTimeSeconds?: number;
  heardTracksJson?: string;
  clientUpdatedAt?: Date | string | null;
}

export type AudioHistoryResult = QResult<
  AudioHistory,
  {
    creator: UserAccountData;
    action: QResult<Action>;
    programKey: string;
    language: string;
    activeTrackKey?: string;
    currentTimeSeconds: number;
    heardTracksJson: string;
    updatedAt: Date;
  }
>;

@linkedShape({
  description:
    'A user-scoped audio playback history record containing resume state and heard-track flags for one action/program/language combination.',
})
export class AudioHistory extends Thing {
  static targetClass = irlcg.AudioHistory;

  @objectProperty({
    path: sioc.has_creator,
    maxCount: 1,
    description: 'Account that owns this audio history record.',
    shape: UserAccount,
  })
  get creator(): UserAccount {
    return undefined as any;
  }

  @objectProperty({
    path: irlcg.action,
    shape: Action,
    maxCount: 1,
    description: 'Action this audio history belongs to.',
  })
  get action(): Action {
    return undefined as any;
  }

  @literalProperty({
    path: irlcg.programKey,
    maxCount: 1,
    description: 'Stable program identifier for the playlist.',
  })
  get programKey(): string {
    return '';
  }

  @literalProperty({
    path: irlcg.language,
    maxCount: 1,
    description: 'Language variant this history applies to.',
  })
  get language(): string {
    return '';
  }

  @literalProperty({
    path: irlcg.activeTrackKey,
    maxCount: 1,
    description: 'Track key to resume from.',
  })
  get activeTrackKey(): string {
    return '';
  }

  @literalProperty({
    path: irlcg.currentTimeSeconds,
    datatype: xsd.integer,
    maxCount: 1,
    description: 'Playback position in seconds for the active track.',
  })
  get currentTimeSeconds(): number {
    return 0;
  }

  @literalProperty({
    path: irlcg.heardTracksJson,
    maxCount: 1,
    description:
      'Serialized heard-track completion map keyed by stable trackKey.',
  })
  get heardTracksJson(): string {
    return '';
  }

  @literalProperty({
    path: irlcg.updatedAt,
    datatype: xsd.dateTime,
    maxCount: 1,
    description: 'Server-authored timestamp for the last merged update.',
  })
  get updatedAt(): Date {
    return undefined as any;
  }

  /**
   * Load the canonical history record for one action/program/language scope.
   */
  static loadAudioHistory(
    action: QResult<Action>,
    programKey: string,
    language: string
  ): Promise<AudioHistoryResult> {
    return Server.call(this, 'loadAudioHistory', action, programKey, language);
  }

  /**
   * Merge a client history snapshot into the persisted record.
   */
  static saveAudioHistory(
    payload: AudioHistorySaveInput
  ): Promise<AudioHistoryResult> {
    return Server.call(this, 'saveAudioHistory', payload);
  }

  /**
   * Return all audio-history records owned by one account.
   */
  static getAllOf(creator: UserAccountData): Promise<AudioHistoryResult[]> {
    return Server.call(this, 'getAllOf', creator);
  }
}
