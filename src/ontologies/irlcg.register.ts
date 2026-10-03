/**
 * Registers this ontology.
 *
 * Kept out of `irlcg.ts` because registration needs that module's whole export namespace, and a
 * module cannot import itself once a bundler is involved: Rollup treats a static self-reference as a
 * circular import and elides it, so the binding is undefined at runtime. From a sibling module the
 * same import is ordinary and survives (the pattern linked-fw adopted on 2026-09-24).
 */
import * as terms from './irlcg.js';
import { dataFile, loadData, ns } from './irlcg.js';
import { linkedOntology } from '../package.js';

linkedOntology(terms, ns, 'irlcg', loadData, dataFile);
