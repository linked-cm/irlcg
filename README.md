# `@_linked/irlcg`

`@_linked/irlcg` is the small, reusable ontology package for portable
in-real-life participation mechanics.

It is not a migration of the historical `lincd-irlcg` application package.
The old package mixed Peace Game scoring, screens, providers, meeting flows,
and domain Shapes with a mostly empty ontology artifact. This package contains
only:

- the canonical `https://linked.cm/ont/irlcg/` JSON-LD ontology;
- TypeScript term exports registered through LINKED;
- minimal base Shapes for cross-application participation contracts;
- explicit, conservative legacy migration metadata.

Person, Organization, general Event/Action semantics, topics, provenance, and
measurements continue to come from established standards. Applications extend
these base contracts in their own packages.

See [Ontology precedent and ownership](./docs/ontology-precedent.md).
