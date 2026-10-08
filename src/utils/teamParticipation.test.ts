import { describe, expect, it } from 'vitest';
import { calculateTeamParticipation } from './teamParticipation.js';

const actions = [
  { id: 'action1', identifier: '1', name: 'Empowerment' },
  { id: 'action2', identifier: '2', name: 'Oneness' },
];

describe('calculateTeamParticipation', () => {
  it('counts each participating member once per action', () => {
    const result = calculateTeamParticipation(
      ['member1', 'member2', 'member3'],
      [
        { creatorId: 'member1', actionId: 'action1', score: 1 },
        { creatorId: 'member1', actionId: 'action1', score: 2 },
        { creatorId: 'member2', actionId: 'action1', score: 1 },
      ],
      actions
    );

    expect(result.action1.percentage).toBe(67);
  });

  it('ignores outsiders and non-positive scores', () => {
    const result = calculateTeamParticipation(
      ['member1', 'member2'],
      [
        { creatorId: 'outsider', actionId: 'action1', score: 1 },
        { creatorId: 'member1', actionId: 'action1', score: 0 },
        { creatorId: 'member2', actionId: 'action1', score: -1 },
      ],
      actions
    );

    expect(result.action1.percentage).toBe(0);
  });

  it('includes actions with no participation', () => {
    const result = calculateTeamParticipation(
      ['member1'],
      [{ creatorId: 'member1', actionId: 'action1', score: 1 }],
      actions
    );

    expect(result.action1.percentage).toBe(100);
    expect(result.action2.percentage).toBe(0);
  });

  it('preserves scored actions missing from the configured event', () => {
    const result = calculateTeamParticipation(
      ['member1'],
      [{ creatorId: 'member1', actionId: 'legacy-action', score: 1 }],
      actions
    );

    expect(result['legacy-action']).toEqual({
      action: { id: 'legacy-action' },
      percentage: 100,
    });
  });

  it('returns an empty record for a team without members', () => {
    expect(calculateTeamParticipation([], [], actions)).toEqual({});
  });
});
