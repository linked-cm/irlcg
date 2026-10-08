// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const submit = vi.hoisted(() => vi.fn());
const getOrCreateFor = vi.hoisted(() =>
  vi.fn(async () => ({ id: 'total-1', score: 0 }))
);
const getActionSubmissionByAction = vi.hoisted(() =>
  vi.fn(async () => ({ customActionTemplates: [], actionSubmissions: [] }))
);

vi.mock('react-confetti', () => ({
  default: () => null,
}));

vi.mock('@tolgee/react', () => ({
  useTranslate: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

vi.mock('@_linked/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    userAccount: { id: 'account-1', accountOf: { id: 'user-1' } },
    user: { id: 'user-1' },
  }),
}));

vi.mock('../../src/shapes/EventTeam.js', () => ({ EventTeam: {} }));
vi.mock('../../src/shapes/Team.js', () => ({
  Team: { getIsEventMode: () => true },
}));
vi.mock('../../src/shapes/ActionTotal.js', () => ({
  ActionTotal: { getOrCreateFor },
}));
vi.mock('../../src/shapes/ActionSubmission.js', () => ({
  ActionSubmission: { getActionSubmissionByAction, submit },
}));
vi.mock('../../src/shapes/ActionOption.js', () => ({
  ActionOption: { create: vi.fn() },
}));
vi.mock('../../src/components/SubmitAsSubPlayer.js', () => ({
  SubmitAsSubPlayer: () => null,
}));

import { NumberActionInput } from '../../src/components/NumberActionInput.js';

afterEach(() => {
  cleanup();
  submit.mockReset();
  getOrCreateFor.mockClear();
  getActionSubmissionByAction.mockClear();
});

function renderInput(id: string) {
  render(
    <NumberActionInput
      action={{ id, identifier: id, name: 'Empowerment' } as any}
      actionOptions={[
        {
          id: `${id}-opt`,
          name: 'Count trees',
          identifier: 'trees',
          points: 1,
          isBonus: false,
        } as any,
      ]}
      onScoreUpdated={vi.fn()}
      teamChange={{ id: `team-${id}` }}
      currentTeam={{} as any}
    />
  );
}

describe('score dialogs', () => {
  it('shows the completed-game dialog', async () => {
    submit.mockResolvedValue({
      actionTotal: { id: 'total-done', score: 10, medal: 1 },
      user: { id: 'user-1' },
      justFinishedGame: true,
      actions: [],
    });
    renderInput('action-done');

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    const dialog = await screen.findByRole('dialog', { name: 'Congratulations!' });
    expect(dialog.textContent).toContain(
      'You have completed this game successfully!'
    );
    expect(dialog.querySelector('source')?.getAttribute('src')).toContain(
      'Fire_Orange'
    );

    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the score-submitted dialog and clears it on close', async () => {
    submit.mockResolvedValue({
      actionTotal: { id: 'total-score', score: 2, medal: 0 },
      user: { id: 'user-1' },
      justFinishedGame: false,
      actions: [],
    });
    renderInput('action-score');

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    const dialog = await screen.findByRole('dialog', {
      name: 'Score submitted successfully!',
    });
    expect(dialog.textContent).toContain('You have earned 2 Actions');
    expect(dialog.querySelector('source')?.getAttribute('src')).toContain(
      'double-check'
    );

    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
