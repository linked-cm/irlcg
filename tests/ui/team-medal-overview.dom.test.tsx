// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tolgee/react', () => ({
  useTranslate: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

vi.mock('../../src/components/molecules/PlayerMedalsCard.js', () => ({
  PlayerMedalsCard: ({
    onClick,
    of,
  }: {
    onClick?: () => void;
    of: { id: string; name?: string };
  }) =>
    React.createElement(
      'button',
      { type: 'button', onClick },
      of.name ?? of.id
    ),
}));

vi.mock('../../src/components/organisms/PlayerScoreOverview.js', () => ({
  PlayerScoreOverview: () => React.createElement('div', null, 'Score overview'),
}));

vi.mock('../../src/shapes/Team.js', () => ({ Team: {} }));
vi.mock('../../src/shapes/ActionTotal.js', () => ({
  ActionTotal: { getAllOfByUsers: vi.fn() },
}));

import { TeamMedalOverview } from '../../src/components/organisms/TeamMedalOverview.js';

afterEach(() => {
  cleanup();
});

describe('TeamMedalOverview', () => {
  it('opens a player score dialog and clears the selection when it closes', async () => {
    render(
      <TeamMedalOverview
        members={[{ id: 'member-1', name: 'Ada' }]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ada' }));

    const dialog = await screen.findByRole('dialog', { name: 'Player score' });
    expect(dialog.textContent).toContain('Scores for this player');
    expect(dialog.textContent).toContain('Score overview');

    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText('Score overview')).toBeNull();
  });
});
