/**
 * Registers every shape this package defines, and the ontology they use, and nothing else.
 *
 * A shape registers when its module is evaluated, so this module exists to be imported for that
 * side effect alone: `import '@linked.cm/irlcg/shapes/index';`. It has no exports.
 */
import '../ontologies/irlcg.register.js';
import './irlcgShapes.js';
