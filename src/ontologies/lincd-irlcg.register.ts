/**
 * Registers the PeaceGame ontology (`http://lincd.org/ont/irlcg/`).
 *
 * Kept out of `lincd-irlcg.ts` because registration needs that module's whole export namespace.
 */
import * as terms from './lincd-irlcg.js';
import { loadData, ns } from './lincd-irlcg.js';
import { linkedOntology } from '../package.js';

linkedOntology(terms, ns, 'lincd-irlcg', loadData, '../data/lincd-irlcg.json');
