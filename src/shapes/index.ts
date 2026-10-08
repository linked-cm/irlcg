/**
 * Registers every shape this package defines, and the ontology they use, and nothing else.
 *
 * A shape registers when its module is evaluated, so this module exists to be imported for that
 * side effect alone: `import '@linked.cm/irlcg/shapes/index';`. It has no exports.
 */
import '../ontologies/irlcg.register.js';
import '../ontologies/lincd-irlcg.register.js';
import './irlcgShapes.js';
import './ActionDebrief.js';
import './AudioHistory.js';
import './ActionPlan.js';
import './ActionTemplate.js';
import './Block.js';
import './EventTeam.js';
import './FirstLevelAdministrativeArea.js';
import './GameAction.js';
import './Household.js';
import './Meeting.js';
import './Neighbourhood.js';
import './PeaceGameDebrief.js';
import './Player.js';
import './Resource.js';
import './score_config/OnceScoreAlgorithm.js';
import './score_config/ScoreConfiguration.js';
import './score_config/ThresholdScoreAlgorithm.js';
import './SecondLevelAdministrativeArea.js';
import './Team.js';
import './ThirdLevelAdministrativeArea.js';
import './Topic.js';
import './TopicScore.js';
import './Action.js';
import './ActionOption.js';
import './ActionTotal.js';
import './ActionSubmission.js';
import './Event.js';
import './TorchLight.js';
