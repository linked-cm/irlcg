---
"@linked.cm/irlcg": minor
---

Register the historical participation shapes when the package loads. Submissions, scores, meetings, and debriefs use `http://lincd.org/ont/irlcg/`. The portable classes stay on `https://linked.cm/ont/irlcg/`.

`Team`, `Action`, `ActionPlan`, and `Event` exist in both sets. The shape IRI is `https://linked.cm/shape/irlcg/{ClassName}`, so the historical class replaces the portable one for those four names. The values exported from `@linked.cm/irlcg` are still the portable classes. Import `src/shapes/Team` (and the matching Action, ActionPlan, and Event modules) for the historical class. Those paths are not in the package export map yet.

Screens and `src/backend.ts` are not package exports. See `README.md`.
