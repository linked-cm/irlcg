---
'@linked.cm/irlcg': patch
---

Pass an explicit `name` to every `@linkedShape`.

Without it core derives the shape name from the class name, and a bundler renames the class when it
collides — which it does here, because these classes are named for the ontology terms they target
(`Team`, `Action`, `Event`, `Mission`, …). In a bundled consumer the shapes registered as `Team3`,
`Event3`, `Mission3` and so on, so their IRIs did not match the ones in the store.

It never raised an error: a read against a non-existent shape IRI comes back as an empty result set,
indistinguishable from "there is none". The names are now independent of bundling and reproduce the
IRIs consumers already hold, so this is a fix and not a migration.
