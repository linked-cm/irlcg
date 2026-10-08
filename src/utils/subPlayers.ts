export type SubPlayerAccount = {
  id: string;
  accountOf: {
    id: string;
    givenName?: string;
    familyName?: string;
  };
};

/**
 * Keeps one account per person. Prefer the active signed-in account when it is
 * available; otherwise use the account IRI as a deterministic fallback.
 */
export function selectUniqueSubPlayerAccounts<T extends SubPlayerAccount>(
  accounts: T[],
  preferredAccountId?: string
): T[] {
  const selectedByPerson = new Map<string, T>();

  for (const account of accounts) {
    const selected = selectedByPerson.get(account.accountOf.id);
    if (
      !selected ||
      account.id === preferredAccountId ||
      (selected.id !== preferredAccountId &&
        account.id.localeCompare(selected.id) < 0)
    ) {
      selectedByPerson.set(account.accountOf.id, account);
    }
  }

  return [...selectedByPerson.values()];
}

/**
 * Returns a stable selector order: the signed-in team leader first, followed
 * by the remaining team members alphabetically.
 */
export function sortSubPlayers<T extends SubPlayerAccount>(
  accounts: T[],
  leaderId: string,
  locale?: string
): T[] {
  const collator = new Intl.Collator(locale, { sensitivity: 'base' });

  return [...accounts].sort((a, b) => {
    if (a.accountOf.id === leaderId) return -1;
    if (b.accountOf.id === leaderId) return 1;

    const aName = `${a.accountOf.givenName ?? ''} ${
      a.accountOf.familyName ?? ''
    }`.trim();
    const bName = `${b.accountOf.givenName ?? ''} ${
      b.accountOf.familyName ?? ''
    }`.trim();

    return collator.compare(aName, bName) || a.id.localeCompare(b.id);
  });
}
