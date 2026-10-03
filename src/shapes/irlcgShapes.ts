import { Shape } from '@_linked/core/shapes/Shape';
import { Action as SchemaAction } from '@_linked/schema/shapes/Action';
import { Event as SchemaEvent } from '@_linked/schema/shapes/Event';
import { JoinAction } from '@_linked/schema/shapes/JoinAction';
import { Organization as SchemaOrganization } from '@_linked/schema/shapes/Organization';
import * as irlcg from '../ontologies/irlcg.js';
import { linkedShape } from '../package.js';

@linkedShape({
  description:
    'Portable base profile for a group coordinating real-world participation. Applications add domain properties without redefining the IRLCG class.',
})
export class Team extends SchemaOrganization {
  static targetClass = irlcg.Team;
}

@linkedShape({
  description:
    'Portable base profile for an action definition or activity referenced by real-world participation experiences.',
})
export class Action extends SchemaAction {
  static targetClass = irlcg.Action;
}

@linkedShape({
  description:
    'Portable base profile for a participant plan or intention. Application-specific walkthrough fields belong to an application profile.',
})
export class ActionPlan extends Shape {
  static targetClass = irlcg.ActionPlan;
}

@linkedShape({
  description:
    'Portable base profile for a scheduled occasion in which real-world or hybrid participation occurs.',
})
export class Event extends SchemaEvent {
  static targetClass = irlcg.Event;
}

@linkedShape({
  description:
    'Portable base profile for a goal or commitment evaluated from linked participation facts.',
})
export class Mission extends Shape {
  static targetClass = irlcg.Mission;
}

@linkedShape({
  description:
    'Portable base profile for a public call for participation. Ranking and matching policy are not part of this Shape.',
})
export class Opportunity extends Shape {
  static targetClass = irlcg.Opportunity;
}

@linkedShape({
  description:
    'Portable base profile for a response or commitment to participate in an Event or Mission.',
})
export class RSVP extends JoinAction {
  static targetClass = irlcg.RSVP;
}

@linkedShape({
  description:
    'Portable raw arrival observation. It never creates credited time or impact by itself.',
})
export class CheckIn extends SchemaAction {
  static targetClass = irlcg.CheckIn;
}

@linkedShape({
  description:
    'Portable raw departure observation. It never creates credited time or impact by itself.',
})
export class CheckOut extends SchemaAction {
  static targetClass = irlcg.CheckOut;
}

@linkedShape({
  description:
    'Portable invitation fact. Recognition and downstream attribution remain application policy.',
})
export class Invite extends SchemaAction {
  static targetClass = irlcg.Invite;
}

@linkedShape({
  description:
    'Portable base profile for a consensual reified alliance between participants.',
})
export class Alliance extends Shape {
  static targetClass = irlcg.Alliance;
}

@linkedShape({
  description:
    'Portable base profile for a consensual directional mentorship relationship.',
})
export class Mentorship extends Shape {
  static targetClass = irlcg.Mentorship;
}
