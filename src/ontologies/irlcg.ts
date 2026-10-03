import { Prefix } from '@_linked/core/utils/Prefix';
import { createNameSpace } from '@_linked/core/utils/NameSpace';

export const ontologyBaseUri = 'https://linked.cm/ont/irlcg/' as const;
export const legacyOntologyBaseUri = 'http://lincd.org/ont/irlcg/' as const;
export const dataFile = '../data/irlcg.json' as const;

Prefix.add('irlcg', ontologyBaseUri);

export const ns = createNameSpace(ontologyBaseUri);
export const legacy = createNameSpace(legacyOntologyBaseUri);
export const _self = ns('');

// Portable classes. Person and Organization deliberately remain Schema.org
// classes and Topic remains skos:Concept; aliases are not minted here.
export const Team = ns('Team');
export const Action = ns('Action');
export const ActionPlan = ns('ActionPlan');
export const Event = ns('Event');
export const Mission = ns('Mission');
export const Opportunity = ns('Opportunity');
export const RSVP = ns('RSVP');
export const CheckIn = ns('CheckIn');
export const CheckOut = ns('CheckOut');
export const Invite = ns('Invite');
export const Alliance = ns('Alliance');
export const Mentorship = ns('Mentorship');

export const portableClasses = {
  Team,
  Action,
  ActionPlan,
  Event,
  Mission,
  Opportunity,
  RSVP,
  CheckIn,
  CheckOut,
  Invite,
  Alliance,
  Mentorship,
} as const;

export const loadData = () =>
  import('../data/irlcg.json', { with: { type: 'json' } }).then(
    (data) => data.default,
  );

