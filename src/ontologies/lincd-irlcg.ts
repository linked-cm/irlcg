import { createNameSpace } from '@_linked/core/utils/NameSpace';

/**
 * Load the data of this ontology into memory, thus adding the properties of the entities of this ontology to the local graph.
 */
export var loadData = () => {
  // Native ESM requires an import attribute for JSON modules (Node 22 throws
  // ERR_IMPORT_ATTRIBUTE_MISSING without it). TypeScript's CommonJS build
  // lowers this to require(), where the attribute is not needed.
  // @ts-ignore -- supported by the ESM runtime and removed by the CJS emit.
  return import('../data/lincd-irlcg.json', { with: { type: 'json' } }).then(
    (data) => data.default
  );
};

/**
 * The namespace of this ontology, which can be used to create NamedNodes with URI's not listed in this file
 */
export var ns = createNameSpace('http://lincd.org/ont/irlcg/');

/**
 * The NamedNode of the ontology itself
 */
export var _self = ns('');

//A list of all the entities (Classes & Properties) of this ontology, each exported as a NamedNode
//Classes
export var ExampleClass = ns('ExampleClass');
export var Report = ns('Report');
export var Action = ns('Action');
export var ActionDebrief = ns('ActionDebrief');
export var PeaceGameDebrief = ns('PeaceGameDebrief');
export var ActionTemplate = ns('ActionTemplate'); // TODO: remove, already replace by ActionOption
export var Topic = ns('Topic'); // TODO: remove, already replace by Action
export var Resource = ns('Resource');
export var StepSet = ns('StepSet');
export var Household = ns('Household');
export var Block = ns('Block');
export var Neighbourhood = ns('Neighbourhood');
export var FirstLevelAdministrativeArea = ns('FirstLevelAdministrativeArea');
export var SecondLevelAdministrativeArea = ns('SecondLevelAdministrativeArea');
export var ThirdLevelAdministrativeArea = ns('ThirdLevelAdministrativeArea');
export var GameAction = ns('GameAction'); // TODO: remove, already replace by `ActionSubmission`
export var EventTeam = ns('EventTeam');
export var ActionOption = ns('ActionOption');
export var ActionTotal = ns('ActionTotal');
export var ActionSubmission = ns('ActionSubmission');
export var Team = ns('Team');
export var Event = ns('Event');
export var AudioHistory = ns('AudioHistory');
// Peace Flame (plan 003)
export var TorchLight = ns('TorchLight');

//Properties
export var exampleProperty = ns('exampleProperty');
export var actionTemplate = ns('actionTemplate'); // TODO: remove, already replace by `actionOption`
export var estimatedTimeMin = ns('estimatedTimeMin');
export var estimatedTimeMax = ns('estimatedTimeMax');
export var priority = ns('priority');
export var cycleDuration = ns('cycleDuration');
export var cycleSetTime = ns('cycleSetTime');
export var timeDescription = ns('timeDescription');
export var estimatedCost = ns('estimatedCost');
export var estimatedCo2Reduction = ns('estimatedCo2Reduction');
export var material = ns('material');
export var accountingGroup = ns('accountingGroup');
export var applicableTo = ns('applicableTo');
export var steps = ns('steps');
export var reportingForm = ns('reportingForm');
export var completedBefore = ns('completedBefore');
export var report = ns('report');
export var name = ns('name');
export var url = ns('url');
export var ownership = ns('ownership');
export var accommodation = ns('accommodation');
export var containedInPlace = ns('containedInPlace');
export var resource = ns('resource');
export var category = ns('category');
export var description = ns('description');
export var topic = ns('topic'); // TODO: remove, already replace by `action`
export var planGrowingEdge = ns('planGrowingEdge');
export var planIntentionStatement = ns('planIntentionStatement');
export var planTeamSupport = ns('planTeamSupport');
export var scheduledTime1 = ns('scheduledTime1');
export var scheduledTime2 = ns('scheduledTime2');
export var scheduledTime3 = ns('scheduledTime3');
export var scheduledTime4 = ns('scheduledTime4');
export var scheduledTime5 = ns('scheduledTime5');
export var scheduledTime6 = ns('scheduledTime6');
export var scheduledTime7 = ns('scheduledTime7');
export var scheduledTimeEnd1 = ns('scheduledTimeEnd1');
export var scheduledTimeEnd2 = ns('scheduledTimeEnd2');
export var scheduledTimeEnd3 = ns('scheduledTimeEnd3');
export var scheduledTimeEnd4 = ns('scheduledTimeEnd4');
export var scheduledTimeEnd5 = ns('scheduledTimeEnd5');
export var scheduledTimeEnd6 = ns('scheduledTimeEnd6');
export var scheduledTimeEnd7 = ns('scheduledTimeEnd7');
export var debriefDescription = ns('debriefDescription');
export var debriefLearnings = ns('debriefLearnings');
export var debriefProblems = ns('debriefProblems');
export var teamLeaderMessage = ns('teamLeaderMessage');
export var nextMeetingDate = ns('nextMeetingDate');
export var quantity = ns('quantity');
export var TopicScore = ns('TopicScore'); // TODO: remove, already replace by `ActionTotal`
export var medal = ns('medal');
export var score = ns('score');
export var points = ns('points');
export var ScoreConfiguration = ns('ScoreConfiguration');
export var scoreConfiguration = ns('scoreConfiguration');
export var ThresholdScoreAlgorithm = ns('ThresholdScoreAlgorithm');
export var OnceScoreAlgorithm = ns('OnceScoreAlgorithm');
export var bronzeMinScore = ns('bronzeMinScore');
export var silverMinScore = ns('silverMinScore');
export var goldMinScore = ns('goldMinScore');
export var disabled = ns('disabled');
export var ActionPlan = ns('ActionPlan');
export var debriefplanGrowingEdge = ns('debriefplanGrowingEdge');
export var debriefactionsTaken = ns('debriefactionsTaken');
export var cardTitle = ns('cardTitle');
export var intendedMedal = ns('intendedMedal');
export var goldTemplate = ns('goldTemplate');
export var silverTemplate = ns('silverTemplate');
export var bronzeTemplate = ns('bronzeTemplate');
export var teamLeader = ns('teamLeader');
export var Meeting = ns('Meeting');
export var meetinSchedule = ns('meetingSchedule');
export var meetingType = ns('meetingType');
export var currentTeam = ns('currentTeam');
export var team = ns('team');
export var withoutAuthentication = ns('withoutAuthentication');
export var isBonus = ns('isBonus');
export var isCustom = ns('isCustom');
export var empowermentDebrief1 = ns('empowermentDebrief1');
export var onenessDebrief1 = ns('onenessDebrief1');
export var unityDebrief1 = ns('unityDebrief1');
export var cooperationDebrief1 = ns('cooperationDebrief1');
export var abundanceDebrief1 = ns('abundanceDebrief1');
export var loveDebrief1 = ns('loveDebrief1');
export var faithDebrief1 = ns('faithDebrief1');
export var faithDebrief2 = ns('faithDebrief2');
export var faithDebrief3 = ns('faithDebrief3');
export var faithDebrief4 = ns('faithDebrief4');
export var faithDebrief5 = ns('faithDebrief5');
export var faithDebrief6 = ns('faithDebrief6');
export var startDate = ns('startDate');
export var endDate = ns('endDate');
export var attendance = ns('attendance');
export var hasImage = ns('hasImage');
export var hasInstance = ns('hasInstance');
export var eventLogo = ns('eventLogo');
export var showPeacegameLogo = ns('showPeacegameLogo');
export var attendanceInPerson = ns('attendanceInPerson');
export var attendanceHome = ns('attendanceHome');
export var action = ns('action');
export var actionOption = ns('actionOption');
export var option = ns('option');
export var event = ns('event');
export var route = ns('route');
export var defaultTeam = ns('defaultTeam');
export var attendsEvents = ns('attendsEvents');
export var isEventMode = ns('isEventMode');
export var allowTeamSelection = ns('allowTeamSelection');
export var pinned = ns('pinned');
export var purpleTheme = ns('purpleTheme');
export var programKey = ns('programKey');
export var language = ns('language');
export var activeTrackKey = ns('activeTrackKey');
export var currentTimeSeconds = ns('currentTimeSeconds');
export var heardTracksJson = ns('heardTracksJson');
export var updatedAt = ns('updatedAt');
// Peace Flame (plan 003) — anonymous-action claim flow
export var hasTakenAction = ns('hasTakenAction');
export var bearer = ns('bearer');
export var litAt = ns('litAt');
export var receivedFrom = ns('receivedFrom');
export var bearerCity = ns('bearerCity');
export var bearerCountry = ns('bearerCountry');

//An extra grouping object so all the entities can be accessed from the prefix/name
export const irlcg = {
  //Classes
  EventTeam,
  Report,
  Action,
  ActionPlan,
  ActionDebrief,
  PeaceGameDebrief,
  ActionTemplate,
  meetinSchedule,
  Meeting,
  actionTemplate,
  Topic,
  Resource,
  StepSet,
  Household,
  Block,
  Neighbourhood,
  FirstLevelAdministrativeArea,
  SecondLevelAdministrativeArea,
  ThirdLevelAdministrativeArea,
  GameAction,
  TopicScore,
  ActionOption,
  ActionTotal,
  ActionSubmission,
  Team,
  Event,
  AudioHistory,
  TorchLight,
  //Properties
  bronzeMinScore,
  meetingType,
  silverMinScore,
  goldMinScore,
  medal,
  score,
  scoreConfiguration,
  points,
  goldTemplate,
  silverTemplate,
  bronzeTemplate,
  exampleProperty,
  estimatedTimeMin,
  estimatedTimeMax,
  priority,
  cycleDuration,
  cycleSetTime,
  timeDescription,
  estimatedCost,
  estimatedCo2Reduction,
  material,
  accountingGroup,
  applicableTo,
  steps,
  reportingForm,
  completedBefore,
  report,
  intendedMedal,
  name,
  url,
  ownership,
  accommodation,
  containedInPlace,
  resource,
  category,
  cardTitle,
  description,
  topic,
  planGrowingEdge,
  planIntentionStatement,
  planTeamSupport,
  ScoreConfiguration,
  scheduledTime1,
  scheduledTime2,
  scheduledTime3,
  scheduledTime4,
  scheduledTime5,
  scheduledTime6,
  scheduledTime7,
  scheduledTimeEnd1,
  scheduledTimeEnd2,
  scheduledTimeEnd3,
  scheduledTimeEnd4,
  scheduledTimeEnd5,
  scheduledTimeEnd6,
  scheduledTimeEnd7,
  startDate,
  endDate,
  debriefplanGrowingEdge,
  debriefactionsTaken,
  debriefDescription,
  debriefLearnings,
  debriefProblems,
  teamLeaderMessage,
  teamLeader,
  nextMeetingDate,
  quantity,
  ThresholdScoreAlgorithm,
  OnceScoreAlgorithm,
  disabled,
  isBonus,
  isCustom,
  currentTeam,
  team,
  withoutAuthentication,
  empowermentDebrief1,
  onenessDebrief1,
  unityDebrief1,
  cooperationDebrief1,
  abundanceDebrief1,
  loveDebrief1,
  faithDebrief1,
  faithDebrief2,
  faithDebrief3,
  faithDebrief4,
  faithDebrief5,
  faithDebrief6,
  attendance,
  hasImage,
  hasInstance,
  eventLogo,
  showPeacegameLogo,
  attendanceInPerson,
  attendanceHome,
  action,
  actionOption,
  option,
  event,
  route,
  defaultTeam,
  attendsEvents,
  isEventMode,
  allowTeamSelection,
  pinned,
  purpleTheme,
  programKey,
  language,
  activeTrackKey,
  currentTimeSeconds,
  heardTracksJson,
  updatedAt,
  hasTakenAction,
  bearer,
  litAt,
  receivedFrom,
  bearerCity,
  bearerCountry,
};
