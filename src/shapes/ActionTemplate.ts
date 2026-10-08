import { Thing } from '@_linked/schema/shapes/Thing';
import { xsd } from '@_linked/xsd/ontologies/xsd';
import { Boolean } from '@_linked/xsd/shapes/Boolean';
import { XSDDate } from '@_linked/xsd/shapes/XSDDate';
import { ShapeSet } from '@_linked/core/collections/ShapeSet';

import { QResult } from '@_linked/core/queries/SelectQuery';
import {
  disallowProperty,
  literalProperty,
  objectProperty,
} from '@_linked/core/shapes/SHACL';
import { irlcg } from '../ontologies/lincd-irlcg.js';
import { linkedShape } from '../package.js';
import { Resource } from './Resource.js';

export type ActionTemplateResult = QResult<
  ActionTemplate,
  {
    identifier?: string; // optional because of custom templates. see BonusActionInput.tsx
    isBonus: boolean;
    isCustom: boolean;
    name: string;
    points: number;
    description: string;
  }
>;
@linkedShape({
  description:
    'A template defining specific action options players can choose from. Represents action details with time estimates, costs, materials, resources, and action values. (template, option, choice)',
})
export class ActionTemplate extends Thing {
  /**
   * indicates that instances of this shape need to have this rdf.type
   */
  static targetClass = irlcg.ActionTemplate;

  /**
   * instances of this shape need to have exactly one value defined for the given property
   */
  @literalProperty({
    path: irlcg.estimatedTimeMin,
    datatype: xsd.duration,
    maxCount: 1,
    description: 'Estimated time to complete an action in minutes',
  })
  get estimatedTimeMin(): number {
    return 0;
  }

  @literalProperty({
    path: irlcg.estimatedTimeMax,
    datatype: xsd.duration,
    maxCount: 1,
    description: 'Estimated maximum time to complete an action in minutes',
  })
  get estimatedTimeMax(): number {
    return 0;
  }

  @literalProperty({
    path: irlcg.priority,
    datatype: Boolean.targetClass,
    maxCount: 1,
    description: 'High priority action flag',
  })
  get priority(): boolean {
    return false;
  }

  @literalProperty({
    path: irlcg.cycleDuration,
    datatype: xsd.duration,
    maxCount: 1,
    description: 'Recurring cycle length in days',
  })
  get cycleDuration(): number {
    return 0;
  }

  @literalProperty({
    path: irlcg.cycleSetTime,
    description: 'When recurring cycle was established',
  })
  get cycleSetTime(): XSDDate {
    return undefined as any;
  }

  @literalProperty({
    path: irlcg.timeDescription,
    datatype: xsd.string,
    description: 'Human-readable time requirements explanation',
  })
  get timeDescription(): string {
    return '';
  }

  @literalProperty({
    path: irlcg.estimatedCost,
    datatype: xsd.integer,
    description: 'Expected monetary cost in dollars',
  })
  get estimatedCost(): number {
    return 0;
  }

  @literalProperty({
    path: irlcg.estimatedCo2Reduction,
    datatype: xsd.integer,
    description: 'CO2 reduction in kg',
  })
  get estimatedCo2Reduction(): number {
    return 0;
  }

  @objectProperty({
    path: irlcg.material,
    shape: Thing,
    description: 'Physical items required to compleate the action.',
  })
  get materials(): ShapeSet<Thing> {
    return undefined as any;
  }

  @objectProperty({
    path: irlcg.resource,
    shape: Resource,
    description:
      'Information resources, guides, local businesses, purchaese links etc.',
  })
  get resources(): ShapeSet<Resource> {
    return undefined as any;
  }

  // @objectProperty({
  //   path: irlcg.steps,
  //   shape: StepSet,
  // })
  // get steps(): ShapeSet<StepSet> {
  //   return StepSet.getSetOf(this.getAll(irlcg.steps));
  // }

  @literalProperty({
    path: irlcg.points,
    datatype: xsd.integer,
    description: 'Legacy: point value (system now counts actions instead)',
    maxCount: 1,
  })
  get points(): number {
    return 0;
  }

  @literalProperty({
    path: irlcg.isBonus,
    datatype: Boolean.targetClass,
    maxCount: 1,
    description:
      'Flag for an Optional extra action beyond required actions for topic.',
  })
  get isBonus(): boolean {
    return false;
  }

  @literalProperty({
    path: irlcg.isCustom,
    datatype: Boolean.targetClass,
    maxCount: 1,
    description: 'User-created vs system template for an action under a topic.',
  })
  get isCustom(): boolean {
    return false;
  }

  // ── Disallowed inherited properties from Thing ──────────────────────
  // Keep: name, description, identifier, image (used in UI and queries)

  @disallowProperty
  get alternateName(): any {
    return undefined;
  }

  @disallowProperty
  get disambiguatingDescription(): any {
    return undefined;
  }

  @disallowProperty
  get url(): any {
    return undefined;
  }

  @disallowProperty
  get additionalType(): any {
    return undefined;
  }
}
