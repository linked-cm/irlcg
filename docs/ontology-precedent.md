# Ontology precedent and ownership

## Governing test

An IRLCG term is admitted only when it represents portable participation
semantics, at least two applications can reasonably consume the same contract,
and no established ontology expresses the required identity cleanly.

| Concept | Canonical precedent | IRLCG decision |
|---|---|---|
| Person / player identity | `schema:Person` | Reuse directly. “Player” is a role or application projection, not a new person class. |
| Organization | `schema:Organization`; W3C ORG for structure | Reuse directly. Do not mint `irlcg:Organization`. |
| Team | `schema:Organization` | Retain `irlcg:Team` as a portable participation-specific subclass. |
| Event | `schema:Event` | Retain `irlcg:Event` as a participation-specific subclass. |
| Action | `schema:Action` | Retain a participation-specific subclass used across games and Serve. |
| Action plan | `schema:PlanAction` | Retain a portable participation-plan class; application walkthrough fields stay local. |
| Mission | no sufficiently precise standard identity | Retain as a portable criteria-goal. |
| Opportunity | Schema.org can describe offers/demands but not this participation call cleanly | Retain the public participation call; ranking stays private policy. |
| RSVP | `schema:JoinAction` | Retain a participation-commitment subclass. |
| Check-in / check-out | `schema:CheckInAction` / `schema:CheckOutAction` | Retain raw participation-observation subclasses. They never create credited hours alone. |
| Invitation | `schema:InviteAction` | Retain a participation-invitation subclass; attribution stays elsewhere. |
| Topic / cause | SKOS `Concept` / `ConceptScheme` | Reuse directly. Do not mint `irlcg:Topic`. |
| Provenance / verification | PROV-O | Reuse directly in owning domain packages. |
| Quantities / units | QUDT or OM | Reuse when measurement Shapes are introduced. |
| Alliance / mentorship | no stable existing reified relationship contract used by the applications | Retain minimal relationship identities; consent, lifecycle, and policy stay in application profiles. |

## Explicit exclusions

- `ActionSubmission`, `ActionOption`, `ActionTotal`, score configuration,
  medals, debriefs, meetings, and Peace Game progression remain owned by the
  Peace Game migration.
- Serve Causes, impact attribution, gratitude, verified service, tasks,
  scheduling policy, and organizer UI remain Serve-owned.
- Providers, services, UI components, and algorithms are not ontology assets.

## Legacy namespace

Historical terms use `http://lincd.org/ont/irlcg/`. They are migration inputs,
not aliases silently treated as identical.

- Use `owl:equivalentClass` or `owl:equivalentProperty` only after proving
  identical meaning.
- Use `rdfs:subClassOf` for a historical application profile that narrows a
  portable class.
- Use `owl:sameAs` only for individuals.
- Use an explicit transform when predicates, cardinalities, or meanings
  changed. `ActionSubmission` requires such a Peace Game-owned transform and
  is deliberately absent from this package.
