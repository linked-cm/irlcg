---
'@linked.cm/irlcg': minor
---

Ship the ontology data as Turtle, so its class hierarchy reaches the store and the shape check.

Core 2.37 reads ontology data as Turtle only and skips JSON(-LD). The data was `src/data/irlcg.json`,
so none of its statements loaded: `irlcg:Event rdfs:subClassOf schema:Event` and the rest were
invisible, and every consumer's shape check reported each IRLCG shape as extending a class its own
class was not a subclass of. The same 76 statements are now `src/data/irlcg.ttl`, and the ontology
modules are generated from it (`linked generate-ontology`).

- Requires `@_linked/core` ^2.48.0 (was ^2.25.0) and `@_linked/schema` ^1.9.2.
- `ActionPlan` extends schema's `Action` shape, as its class (a `schema:PlanAction`) says.
- The `irlcg` namespace export keeps every name it had (`ontologyBaseUri`, `legacy`, `portableClasses`,
  `ns`, the terms) except `dataFile`, which is now `dataFiles`.
