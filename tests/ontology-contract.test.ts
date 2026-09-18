import ontology from '../src/data/irlcg.json' with { type: 'json' };
import {
  ontologyBaseUri,
  portableClasses,
} from '../src/ontologies/irlcg';
import {
  irlcgPackageBaseUri,
  irlcgPackageName,
} from '../src/package';
import { describe, expect, it } from 'vitest';

const graph = ontology['@graph'] as Array<Record<string, unknown>>;
const byId = new Map(graph.map((entry) => [String(entry['@id']), entry]));

const localName = (value: unknown) => {
  const id =
    typeof value === 'object' && value && '@id' in value
      ? String((value as { '@id': unknown })['@id'])
      : '';
  return id;
};

describe('@_linked/irlcg ontology contract', () => {
  it('pins package and ontology identity', () => {
    expect(irlcgPackageName).toBe('@_linked/irlcg');
    expect(irlcgPackageBaseUri).toBe('https://linked.cm/');
    expect(ontologyBaseUri).toBe('https://linked.cm/ont/irlcg/');
  });

  it('declares every exported portable class exactly once', () => {
    const exported = Object.keys(portableClasses).sort();
    const declared = graph
      .filter(
        (entry) =>
          entry['@type'] === 'owl:Class' &&
          String(entry['@id']).startsWith('irlcg:'),
      )
      .map((entry) => String(entry['@id']).slice('irlcg:'.length))
      .sort();

    expect(declared).toEqual(exported);
    for (const term of exported) {
      expect(byId.get(`irlcg:${term}`)?.['rdfs:isDefinedBy']).toEqual({
        '@id': 'irlcg:',
      });
    }
  });

  it('uses standards as the superclass precedent', () => {
    expect(localName(byId.get('irlcg:Team')?.['rdfs:subClassOf'])).toBe(
      'schema:Organization',
    );
    expect(localName(byId.get('irlcg:Event')?.['rdfs:subClassOf'])).toBe(
      'schema:Event',
    );
    expect(localName(byId.get('irlcg:Action')?.['rdfs:subClassOf'])).toBe(
      'schema:Action',
    );
    expect(localName(byId.get('irlcg:ActionPlan')?.['rdfs:subClassOf'])).toBe(
      'schema:PlanAction',
    );
    expect(localName(byId.get('irlcg:RSVP')?.['rdfs:subClassOf'])).toBe(
      'schema:JoinAction',
    );
    expect(localName(byId.get('irlcg:CheckIn')?.['rdfs:subClassOf'])).toBe(
      'schema:CheckInAction',
    );
    expect(localName(byId.get('irlcg:CheckOut')?.['rdfs:subClassOf'])).toBe(
      'schema:CheckOutAction',
    );
    expect(localName(byId.get('irlcg:Invite')?.['rdfs:subClassOf'])).toBe(
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
    const legacy = graph.filter((entry) =>
      String(entry['@id']).startsWith('oldirlcg:'),
    );
    expect(legacy.length).toBeGreaterThan(0);
    for (const entry of legacy) {
      expect(entry['rdfs:subClassOf']).toBeTruthy();
      expect(entry['owl:equivalentClass']).toBeUndefined();
      expect(entry['owl:sameAs']).toBeUndefined();
    }
  });
});
