import { describe, expect, it } from 'vitest';
import { selectUniqueSubPlayerAccounts, sortSubPlayers } from './subPlayers.js';

const accounts = [
  {
    id: 'account-zara',
    accountOf: {
      id: 'person-zara',
      givenName: 'Zara',
      familyName: 'Zulu',
    },
  },
  {
    id: 'account-leader',
    accountOf: {
      id: 'person-leader',
      givenName: 'Morgan',
      familyName: 'Leader',
    },
  },
  {
    id: 'account-alex',
    accountOf: {
      id: 'person-alex',
      givenName: 'alex',
      familyName: 'Alpha',
    },
  },
];

describe('sortSubPlayers', () => {
  it('puts the leader first and sorts other players by name', () => {
    expect(
      sortSubPlayers(accounts, 'person-leader', 'en').map(
        (account) => account.id
      )
    ).toEqual(['account-leader', 'account-alex', 'account-zara']);
  });

  it('does not mutate the query result', () => {
    const originalOrder = accounts.map((account) => account.id);

    sortSubPlayers(accounts, 'person-leader');

    expect(accounts.map((account) => account.id)).toEqual(originalOrder);
  });

  it('uses the account id as a stable fallback for missing names', () => {
    const unnamed = [
      { id: 'account-b', accountOf: { id: 'person-b' } },
      { id: 'account-a', accountOf: { id: 'person-a' } },
    ];

    expect(
      sortSubPlayers(unnamed, 'person-leader').map((account) => account.id)
    ).toEqual(['account-a', 'account-b']);
  });
});

describe('selectUniqueSubPlayerAccounts', () => {
  it('keeps one deterministic account per person', () => {
    const duplicateAccounts = [
      accounts[0],
      {
        id: 'account-zara-2',
        accountOf: {
          id: 'person-zara',
          givenName: 'Zara',
          familyName: 'Zulu',
        },
      },
    ];

    expect(
      selectUniqueSubPlayerAccounts(duplicateAccounts).map(
        (account) => account.id
      )
    ).toEqual(['account-zara']);
  });

  it('prefers the active signed-in account', () => {
    const duplicateAccounts = [
      accounts[1],
      {
        id: 'account-leader-active',
        accountOf: {
          id: 'person-leader',
          givenName: 'Morgan',
          familyName: 'Leader',
        },
      },
    ];

    expect(
      selectUniqueSubPlayerAccounts(
        duplicateAccounts,
        'account-leader-active'
      ).map((account) => account.id)
    ).toEqual(['account-leader-active']);
  });
});
