# @linked.cm/irlcg

## 0.2.0

### Minor Changes

- [#7](https://github.com/linked-cm/irlcg/pull/7) [`f91c2e1`](https://github.com/linked-cm/irlcg/commit/f91c2e14433b4918ace55be1c0dc3a07bb3aca29) Thanks [@carlenmy](https://github.com/carlenmy)! - Ship the ontology data as Turtle, so its class hierarchy reaches the store and the shape check.
  
  Core 2.37 reads ontology data as Turtle only and skips JSON(-LD). The data was `src/data/irlcg.json`,
  so none of its statements loaded: `irlcg:Event rdfs:subClassOf schema:Event` and the rest were
  invisible, and every consumer's shape check reported each IRLCG shape as extending a class its own
  class was not a subclass of. The same 76 statements are now `src/data/irlcg.ttl`, and the ontology
  modules are generated from it (`linked generate-ontology`).
  
  - Requires `@_linked/core` ^2.48.0 (was ^2.25.0) and `@_linked/schema` ^1.9.2.
  - `ActionPlan` extends schema's `Action` shape, as its class (a `schema:PlanAction`) says.
  - The `irlcg` namespace export keeps every name it had (`ontologyBaseUri`, `legacy`, `portableClasses`,
    `ns`, the terms) except `dataFile`, which is now `dataFiles`.

### Patch Changes

- [#7](https://github.com/linked-cm/irlcg/pull/7) [`a592307`](https://github.com/linked-cm/irlcg/commit/a592307c5ef208c0fc2b896075a6c113d95d00eb) Thanks [@carlenmy](https://github.com/carlenmy)! - Pass an explicit `name` to every `@linkedShape`.
  
  Without it core derives the shape name from the class name, and a bundler renames the class when it
  collides — which it does here, because these classes are named for the ontology terms they target
  (`Team`, `Action`, `Event`, `Mission`, …). In a bundled consumer the shapes registered as `Team3`,
  `Event3`, `Mission3` and so on, so their IRIs did not match the ones in the store.
  
  It never raised an error: a read against a non-existent shape IRI comes back as an empty result set,
  indistinguishable from "there is none". The names are now independent of bundling and reproduce the
  IRIs consumers already hold, so this is a fix and not a migration.

## 0.1.1

### Patch Changes

- [`44d2cdd`](https://github.com/linked-cm/irlcg/commit/44d2cddd8ef17d4850fccd1a9760ecdc14a8a461) Thanks [@carlenmy](https://github.com/carlenmy)! - Licensed under MIT (copyright Serve Earth); the LICENSE file now ships in the package.
