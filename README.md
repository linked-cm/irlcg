# `@linked.cm/irlcg`

`@linked.cm/irlcg` publishes the portable participation ontology and also
registers the historical participation shapes.

The portable contract stays on `https://linked.cm/ont/irlcg/`:

- the JSON-LD ontology;
- TypeScript term exports registered through LINKED;
- minimal base Shapes for cross-application participation contracts;
- explicit, conservative legacy migration metadata.

Importing the package also registers the historical shapes on
`http://lincd.org/ont/irlcg/`: submissions, scores, meetings, debriefs, and
the rest of that module. `Team`, `Action`, `ActionPlan`, and `Event` exist in
both sets. A shape IRI is `https://linked.cm/shape/irlcg/{ClassName}`, so the
historical class replaces the portable one for those four names.

```ts
import { Team, Action, Event } from '@linked.cm/irlcg';
```

That import is the portable classes. The class registered for those four
names is the historical one. The historical modules are not in the package
export map. `linked build` emits them, and `shapes/index` registers them.

Screens in `src/components` are covered by tests. They are not package
exports. The bonus-action field needs `Combobox` from a primitives release
newer than 1.6.0. Server providers in `src/backend.ts` are not a package
export; adding that file to the build does not typecheck.

Person, Organization, general Event/Action semantics, topics, provenance, and
measurements continue to come from established standards.

See [Ontology precedent and ownership](./docs/ontology-precedent.md).
