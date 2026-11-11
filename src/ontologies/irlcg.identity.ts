/**
 * The package's own facts about the IRLCG ontology that are not terms in its data — kept beside the
 * generated modules (`irlcg.ts`, `irlcg.data.ts`, `irlcg.register.ts`), which `linked
 * generate-ontology` rewrites from `src/data/irlcg.ttl` and which must not be edited by hand.
 */
import { createNameSpace } from '@_linked/core/utils/NameSpace';
import * as terms from './irlcg.js';
import { ns } from './irlcg.data.js';

export { dataFiles, loadData, ns } from './irlcg.data.js';

export const ontologyBaseUri = 'https://linked.cm/ont/irlcg/' as const;
export const legacyOntologyBaseUri = 'http://lincd.org/ont/irlcg/' as const;

/** The pre-2026 namespace. Its classes are deprecated subclasses of the current ones (see the data). */
export const legacy = createNameSpace(legacyOntologyBaseUri);
export const _self = ns('');

// Portable classes. Person and Organization deliberately remain Schema.org
// classes and Topic remains skos:Concept; aliases are not minted here.
export const portableClasses = {
  Team: terms.Team,
  Action: terms.Action,
  ActionPlan: terms.ActionPlan,
  Event: terms.Event,
  Mission: terms.Mission,
  Opportunity: terms.Opportunity,
  RSVP: terms.RSVP,
  CheckIn: terms.CheckIn,
  CheckOut: terms.CheckOut,
  Invite: terms.Invite,
  Alliance: terms.Alliance,
  Mentorship: terms.Mentorship,
} as const;
