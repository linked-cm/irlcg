import { readFileSync } from 'node:fs';
import { Parser } from 'n3';
import {
  ontologyBaseUri,
  portableClasses,
} from '../src/ontologies/irlcgTerms';
import {
  irlcgPackageBaseUri,
  irlcgPackageName,
} from '../src/package';
import { describe, expect, it } from 'vitest';

// The ontology data as Turtle, read the way core reads it. Each subject becomes an entry keyed by its
// prefixed name, with each predicate's objects (prefixed where a prefix applies) — the same view the
// JSON-LD gave this test before the data moved to Turtle.
const PREFIXES: Record<string, string> = {
  irlcg: 'https://linked.cm/ont/irlcg/',
  oldirlcg: 'http://lincd.org/ont/irlcg/',
  schema: 'http://schema.org/',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  owl: 'http://www.w3.org/2002/07/owl#',
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
};
const short = (iri: string) => {
  for (const [p, base] of Object.entries(PREFIXES)) if (iri.startsWith(base)) return `${p}:${iri.slice(base.length)}`;
  return iri;
};
const quads = new Parser().parse(readFileSync(new URL('../src/data/irlcg.ttl', import.meta.url), 'utf8'));
const byId = new Map<string, Record<string, string[]>>();
for (const q of quads) {
  const subject = short(q.subject.value);
  const entry = byId.get(subject) ?? {};
  const predicate = q.predicate.value === PREFIXES.rdf + 'type' ? '@type' : short(q.predicate.value);
  (entry[predicate] ??= []).push(q.object.termType === 'NamedNode' ? short(q.object.value) : q.object.value);
  byId.set(subject, entry);
}
type Entry = { id: string } & Record<string, string[] | string | undefined>;
const graph: Entry[] = [...byId.entries()].map(([id, entry]) => ({ id, ...entry }));
const superOf = (id: string) => byId.get(id)?.['rdfs:subClassOf']?.[0];

describe('@_linked/irlcg ontology contract', () => {
  it('pins package and ontology identity', () => {
    expect(irlcgPackageName).toBe('@_linked/irlcg');
    expect(irlcgPackageBaseUri).toBe('https://linked.cm/');
    expect(ontologyBaseUri).toBe('https://linked.cm/ont/irlcg/');
  });

  it('declares every exported portable class exactly once', () => {
    const exported = Object.keys(portableClasses).sort();
    const declared = graph
      .filter((entry) => (entry['@type'] as string[] | undefined)?.includes('owl:Class') && entry.id.startsWith('irlcg:'))
      .map((entry) => entry.id.slice('irlcg:'.length))
      .sort();

    expect(declared).toEqual(exported);
    for (const term of exported) {
      expect(byId.get(`irlcg:${term}`)?.['rdfs:isDefinedBy']).toEqual(['irlcg:']);
    }
  });

  it('uses standards as the superclass precedent', () => {
    expect(superOf('irlcg:Team')).toBe(
      'schema:Organization',
    );
    expect(superOf('irlcg:Event')).toBe(
      'schema:Event',
    );
    expect(superOf('irlcg:Action')).toBe(
      'schema:Action',
    );
    expect(superOf('irlcg:ActionPlan')).toBe(
      'schema:PlanAction',
    );
    expect(superOf('irlcg:RSVP')).toBe(
      'schema:JoinAction',
    );
    expect(superOf('irlcg:CheckIn')).toBe(
      'schema:CheckInAction',
    );
    expect(superOf('irlcg:CheckOut')).toBe(
      'schema:CheckOutAction',
    );
    expect(superOf('irlcg:Invite')).toBe(
      'schema:InviteAction',
    );
  });

  it('does not promote application-owned or standards-owned aliases', () => {
    for (const excluded of [
      'ActionSubmission',
      'ActionOption',
      'ActionTotal',
      'Topic',
      'Player',
      'Organization',
      'VerifiedHours',
    ]) {
      expect(byId.has(`irlcg:${excluded}`)).toBe(false);
      expect(excluded in portableClasses).toBe(false);
    }
  });

  it('maps legacy application profiles conservatively', () => {
    const legacy = graph.filter((entry) => entry.id.startsWith('oldirlcg:'));
    expect(legacy.length).toBeGreaterThan(0);
    for (const entry of legacy) {
      expect(entry['rdfs:subClassOf']).toBeTruthy();
      expect(entry['owl:equivalentClass']).toBeUndefined();
      expect(entry['owl:sameAs']).toBeUndefined();
    }
  });
});
