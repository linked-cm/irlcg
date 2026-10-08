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
import { RadioActionInput } from '../../src/components/RadioActionInput.js';
import { SequentialActionInput } from '../../src/components/SequentialActionInput.js';

afterEach(() => {
  cleanup();
  submit.mockReset();
});

function expectOutline(button: HTMLElement) {
  expect(button.className.split(/\s+/)).toContain('outline');
  expect(button.getAttribute('type')).toBe('button');
}

describe('submission buttons', () => {
  it('renders the number submit button as an outline button and disables it while submitting', async () => {
    submit.mockImplementation(() => new Promise(() => {}));
    render(
      <NumberActionInput
        action={{ id: 'n1', identifier: 'n1', name: 'Empowerment' } as any}
        actionOptions={[]}
        onScoreUpdated={vi.fn()}
        teamChange={{ id: 'team-n1' }}
        currentTeam={{} as any}
      />
    );

    const button = screen.getByRole('button', { name: 'Submit' });
    expectOutline(button);
    expect((button as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(button);

    expect(await screen.findByText('Submitting...')).toBeTruthy();
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.className.split(/\s+/)).toContain('disabled');
  });

  it('labels the radio submit button and disables it while submitting', async () => {
    submit.mockImplementation(() => new Promise(() => {}));
    render(
      <RadioActionInput
        action={{ id: 'r1', identifier: 'r1', name: 'Oneness' } as any}
        actionOptions={[
          {
            id: 'radio-opt',
            name: 'Listen',
            identifier: 'listen',
            points: 1,
            isBonus: false,
          } as any,
        ]}
        onScoreUpdated={vi.fn()}
        teamChange={{ id: 'team-r1' }}
        currentTeam={{} as any}
      />
    );

    const button = screen.getByRole('button', { name: 'Submit' });
    expectOutline(button);
    fireEvent.click(screen.getByRole('radio', { name: 'Select' }));
    fireEvent.click(button);

    expect(await screen.findByText('Submitting...')).toBeTruthy();
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.getAttribute('aria-label')).toBe('Submit');
  });

  it('labels the sequential submit button and disables it while submitting', async () => {
    submit.mockImplementation(() => new Promise(() => {}));
    render(
      <SequentialActionInput
        actionTotal={{ id: 'total-seq' } as any}
        actionOptions={[
          {
            id: 'seq-opt',
            name: 'Step one',
            identifier: 'step',
            points: 1,
          } as any,
        ]}
        onSubmitted={vi.fn()}
      />
    );

    const button = screen.getByRole('button', { name: 'Submit Button' });
    expectOutline(button);
    fireEvent.click(button);

    expect(await screen.findByText('Submitting...')).toBeTruthy();
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.getAttribute('aria-label')).toBe('Submit Button');
  });
});
