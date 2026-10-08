import type { UserAccountData } from '@_linked/auth/types/auth';
import { Auth } from '@_linked/auth/utils/auth';
import type { QResult } from '@_linked/core/queries/SelectQuery';
import { ShapeProvider } from '@_linked/server-utils/utils/ShapeProvider';
import {
  AudioHistory,
  AudioHistoryResult,
  AudioHistorySaveInput,
} from './AudioHistory.js';
import { Action } from './Action.js';

type HeardTrackEntry = {
  completedAt?: string;
};

type HeardTracksMap = Record<string, HeardTrackEntry>;
type MergedAudioHistoryState = {
  activeTrackKey: string | null;
  currentTimeSeconds: number;
  heardTracksJson: string;
  updatedAt: Date;
};

const PROGRAM_TRACK_KEYS: Record<string, string[]> = {
  'empowerment-audio': [
    'empowerment-01',
    'empowerment-02',
    'empowerment-03',
    'empowerment-04',
    'empowerment-05',
    'empowerment-06',
    'empowerment-07',
    'empowerment-08',
    'empowerment-09',
  ],
};

export class AudioHistoryProvider extends ShapeProvider {
  public shape = AudioHistory;

  /**
   * Load or create the canonical history record for the signed-in account.
   */
  async loadAudioHistory(
    action: QResult<Action>,
    programKey: string,
    language: string
  ): Promise<AudioHistoryResult> {
    const auth = this.request.linkedAuth;
    const userAccount = auth?.userAccount;

    if (!auth || !userAccount) {
      return Auth.enforceSignedIn() as any;
    }

    if (!action || !programKey || !language) {
      throw new Error('No provided action, programKey, or language.');
    }

    const records = await this.findByScope(
      userAccount,
      action,
      programKey,
      language
    );
    const canonical = await this.ensureCanonicalRecord(
      records,
      userAccount,
      action,
      programKey,
      language
    );

    return canonical;
  }

  /**
   * Merge a client snapshot into the canonical signed-in history record.
   */
  async saveAudioHistory(
    payload: AudioHistorySaveInput
  ): Promise<AudioHistoryResult> {
    const auth = this.request.linkedAuth;
    const userAccount = auth?.userAccount;

    if (!auth || !userAccount) {
      return Auth.enforceSignedIn() as any;
    }

    const { action, programKey, language } = payload;
    if (!action || !programKey || !language) {
      throw new Error('No provided action, programKey, or language.');
    }

    const records = await this.findByScope(
      userAccount,
      action,
      programKey,
      language
    );
    const canonical = await this.ensureCanonicalRecord(
      records,
      userAccount,
      action,
      programKey,
      language
    );

    const merged = this.mergeAudioHistory(canonical, payload, programKey);
    const updatedRecord = await AudioHistory.update({
      activeTrackKey: merged.activeTrackKey || null,
      currentTimeSeconds: merged.currentTimeSeconds,
      heardTracksJson: merged.heardTracksJson,
      updatedAt: merged.updatedAt,
    }).for(canonical);

    return updatedRecord as AudioHistoryResult;
  }

  /**
   * Return all audio-history records owned by one account.
   */
  async getAllOf(creator: UserAccountData): Promise<AudioHistoryResult[]> {
    if (!creator) {
      return [];
    }

    return (await AudioHistory.select((a) => {
      return [
        a.creator,
        a.action,
        a.programKey,
        a.language,
        a.activeTrackKey,
        a.currentTimeSeconds,
        a.heardTracksJson,
        a.updatedAt,
      ];
    }).where((a) =>
      a.creator.equals({ id: creator.id })
    )) as AudioHistoryResult[];
  }

  /**
   * Find all records for one creator/action/program/language scope.
   */
  private async findByScope(
    userAccount: UserAccountData,
    action: QResult<Action>,
    programKey: string,
    language: string
  ): Promise<AudioHistoryResult[]> {
    return (await AudioHistory.select((a) => {
      return [
        a.creator,
        a.action,
        a.programKey,
        a.language,
        a.activeTrackKey,
        a.currentTimeSeconds,
        a.heardTracksJson,
        a.updatedAt,
      ];
    }).where((a) => {
      return a.creator
        .equals({ id: userAccount.id })
        .and(a.action.equals({ id: action.id }))
        .and(a.programKey.equals(programKey))
        .and(a.language.equals(language));
    })) as AudioHistoryResult[];
  }

  /**
   * Create the scoped record when missing and collapse duplicates into one canonical item.
   */
  private async ensureCanonicalRecord(
    records: AudioHistoryResult[],
    userAccount: UserAccountData,
    action: QResult<Action>,
    programKey: string,
    language: string
  ): Promise<AudioHistoryResult> {
    if (records.length === 0) {
      await AudioHistory.create({
        creator: userAccount,
        action: { id: action.id },
        programKey,
        language,
        currentTimeSeconds: 0,
        heardTracksJson: '{}',
        updatedAt: new Date(),
      } as any);

      const createdRecords = await this.findByScope(
        userAccount,
        action,
        programKey,
        language
      );
      return this.ensureCanonicalRecord(
        createdRecords,
        userAccount,
        action,
        programKey,
        language
      );
    }

    const sortedRecords = [...records].sort((left, right) =>
      left.id.localeCompare(right.id)
    );
    const canonical = sortedRecords[0];
    const duplicates = sortedRecords.slice(1);

    if (duplicates.length === 0) {
      return canonical;
    }

    const merged = duplicates.reduce<MergedAudioHistoryState>(
      (current, duplicate) =>
        this.mergePersistedRecords(current, duplicate, canonical.programKey),
      {
        activeTrackKey: this.normalizeTrackKey(
          canonical.programKey,
          canonical.activeTrackKey
        ),
        currentTimeSeconds: this.normalizeCurrentTime(
          canonical.currentTimeSeconds
        ),
        heardTracksJson: canonical.heardTracksJson || '{}',
        updatedAt: canonical.updatedAt || new Date(),
      }
    );

    const updatedCanonical = await AudioHistory.update({
      activeTrackKey: merged.activeTrackKey || null,
      currentTimeSeconds: merged.currentTimeSeconds,
      heardTracksJson: merged.heardTracksJson,
      updatedAt: merged.updatedAt,
    }).for(canonical);

    await Promise.all(
      duplicates.map((duplicate) => AudioHistory.delete({ id: duplicate.id }))
    );

    return updatedCanonical as AudioHistoryResult;
  }

  /**
   * Merge one persisted duplicate into the canonical payload shape.
   */
  private mergePersistedRecords(
    canonical: MergedAudioHistoryState,
    duplicate: AudioHistoryResult,
    programKey: string
  ): MergedAudioHistoryState {
    const mergedHeardTracks = this.mergeHeardTracks(
      canonical.heardTracksJson,
      duplicate.heardTracksJson,
      programKey
    );

    const canonicalTimestamp = this.parseDate(canonical.updatedAt);
    const duplicateTimestamp = this.parseDate(duplicate.updatedAt);
    const duplicateIsNewer =
      duplicateTimestamp !== null &&
      (canonicalTimestamp === null || duplicateTimestamp > canonicalTimestamp);

    return {
      activeTrackKey: duplicateIsNewer
        ? this.normalizeTrackKey(programKey, duplicate.activeTrackKey)
        : this.normalizeTrackKey(programKey, canonical.activeTrackKey),
      currentTimeSeconds: duplicateIsNewer
        ? this.normalizeCurrentTime(duplicate.currentTimeSeconds)
        : this.normalizeCurrentTime(canonical.currentTimeSeconds),
      heardTracksJson: JSON.stringify(mergedHeardTracks),
      updatedAt:
        canonicalTimestamp && duplicateTimestamp
          ? canonicalTimestamp > duplicateTimestamp
            ? canonical.updatedAt
            : duplicate.updatedAt
          : canonical.updatedAt || duplicate.updatedAt || new Date(),
    };
  }

  /**
   * Merge incoming client state into the persisted record.
   */
  private mergeAudioHistory(
    existing: AudioHistoryResult,
    payload: AudioHistorySaveInput,
    programKey: string
  ) {
    const serverTimestamp = this.parseDate(existing.updatedAt);
    const clientTimestamp = this.parseDate(payload.clientUpdatedAt);
    const clientIsNewer =
      clientTimestamp !== null &&
      (serverTimestamp === null || clientTimestamp > serverTimestamp);

    const mergedHeardTracks = this.mergeHeardTracks(
      existing.heardTracksJson,
      payload.heardTracksJson ?? '{}',
      programKey
    );

    return {
      activeTrackKey: clientIsNewer
        ? this.normalizeTrackKey(programKey, payload.activeTrackKey)
        : this.normalizeTrackKey(programKey, existing.activeTrackKey),
      currentTimeSeconds: clientIsNewer
        ? this.normalizeCurrentTime(payload.currentTimeSeconds)
        : this.normalizeCurrentTime(existing.currentTimeSeconds),
      heardTracksJson: JSON.stringify(mergedHeardTracks),
      updatedAt: new Date(),
    };
  }

  /**
   * Merge heard-track payloads and keep the earliest valid completion time per track.
   */
  private mergeHeardTracks(
    serverJson: string,
    incomingJson: string,
    programKey: string
  ): HeardTracksMap {
    const serverMap = this.normalizeHeardTracks(programKey, serverJson);
    const incomingMap = this.normalizeHeardTracks(programKey, incomingJson);
    const mergedKeys = new Set([
      ...Object.keys(serverMap),
      ...Object.keys(incomingMap),
    ]);
    const merged: HeardTracksMap = {};

    for (const trackKey of mergedKeys) {
      const serverEntry = serverMap[trackKey];
      const incomingEntry = incomingMap[trackKey];
      const serverCompletedAt = this.parseDate(serverEntry?.completedAt);
      const incomingCompletedAt = this.parseDate(incomingEntry?.completedAt);

      if (serverCompletedAt && incomingCompletedAt) {
        merged[trackKey] = {
          completedAt:
            serverCompletedAt <= incomingCompletedAt
              ? serverCompletedAt.toISOString()
              : incomingCompletedAt.toISOString(),
        };
        continue;
      }

      if (serverCompletedAt) {
        merged[trackKey] = { completedAt: serverCompletedAt.toISOString() };
        continue;
      }

      if (incomingCompletedAt) {
        merged[trackKey] = { completedAt: incomingCompletedAt.toISOString() };
        continue;
      }

      if (serverEntry) {
        merged[trackKey] = serverEntry;
        continue;
      }

      if (incomingEntry) {
        merged[trackKey] = incomingEntry;
      }
    }

    return merged;
  }

  /**
   * Parse heard-track JSON and discard keys outside the known playlist.
   */
  private normalizeHeardTracks(
    programKey: string,
    json: string
  ): HeardTracksMap {
    try {
      const parsed = JSON.parse(json || '{}') as HeardTracksMap;
      const allowedTrackKeys = new Set(PROGRAM_TRACK_KEYS[programKey] || []);
      const normalized: HeardTracksMap = {};

      for (const [trackKey, entry] of Object.entries(parsed || {})) {
        if (!allowedTrackKeys.has(trackKey)) {
          continue;
        }

        normalized[trackKey] = entry && typeof entry === 'object' ? entry : {};
      }

      return normalized;
    } catch (_error) {
      return {};
    }
  }

  /**
   * Accept only track keys that belong to the requested program.
   */
  private normalizeTrackKey(programKey: string, trackKey?: string | null) {
    const allowedTrackKeys = new Set(PROGRAM_TRACK_KEYS[programKey] || []);
    return trackKey && allowedTrackKeys.has(trackKey) ? trackKey : null;
  }

  /**
   * Normalize client playback time to a safe persisted integer.
   */
  private normalizeCurrentTime(currentTimeSeconds?: number) {
    return Math.max(0, Math.floor(currentTimeSeconds ?? 0));
  }

  /**
   * Parse Date objects or ISO-like strings and reject invalid timestamps.
   */
  private parseDate(value?: Date | string | null) {
    if (!value) {
      return null;
    }

    const parsed =
      value instanceof Date
        ? value
        : new Date(typeof value === 'string' ? value : '');

    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
}
