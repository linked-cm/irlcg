# AGENTS.md — @linked.cm/irlcg

Staged in the **linked-cm** org (npm scope `@linked.cm`) pending René's review; moves to linked-fw (`@_linked/irlcg`) only after approval.

Extracted from `serve-earth/serve-community` `packages/irlcg` with its history (2026-10-03). Consumers: Serve, `@serve.earth/schedule`.

## Do not change without a migration

- The ontology namespace `https://linked.cm/ont/irlcg/` and `linkedPackage('@_linked/irlcg', { baseUri: 'https://linked.cm/' })` in `src/package.ts` — they decide the class and shape IRIs. The npm name is independent of them.

## Rules

- Ontology and portable base Shapes only — no app scoring, screens or providers (see README and `docs/ontology-precedent.md`).
- `ontologies/irlcg.ts` never imports itself; `ontologies/irlcg.register.ts` registers it. `shapes/index.ts` holds only side-effect imports.
- ESM-only; every export resolves to `lib/esm`. Releases go through changesets (`npx changeset`).
