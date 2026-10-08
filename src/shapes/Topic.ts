import { ImageObject } from '@_linked/schema/shapes/ImageObject';
import { Thing } from '@_linked/schema/shapes/Thing';
import { Server } from '@_linked/server-utils/utils/Server';

import { ShapeSet } from '@_linked/core/collections/ShapeSet';
import { QResult } from '@_linked/core/queries/SelectQuery';
import {
  disallowProperty,
  literalProperty,
  objectProperty,
} from '@_linked/core/shapes/SHACL';
import { irlcg } from '../ontologies/lincd-irlcg.js';
import { linkedShape } from '../package.js';
import { ActionTemplate, type ActionTemplateResult } from './ActionTemplate.js';
import { ScoreConfiguration } from './score_config/ScoreConfiguration.js';

export type TopicResult = QResult<
  Topic,
  {
    id: string;
    identifier: string;
    name: string;
    description: string;
    actionTemplates: ActionTemplateResult[];
    scoreConfiguration: QResult<ScoreConfiguration>;
    image: QResult<ImageObject, { contentUrl: string }>;
  }
>;

@linkedShape({
  description:
    'A game topic representing a theme or category for actions. Also called "Action". Represents topics with score configurations, categories, and action template relationships. (action, step, task)',
})
export class Topic extends Thing {
  /**
   * indicates that instances of this shape need to have this rdf.type
   */
  static targetClass = irlcg.Topic;

  @objectProperty({
    path: irlcg.scoreConfiguration,
    shape: ScoreConfiguration,
    maxCount: 1,
    description: 'How actions are counted for this topic.',
  })
  get scoreConfiguration(): ScoreConfiguration {
    return undefined as any;
  }

  @objectProperty({
    path: irlcg.hasInstance,
    shape: Topic,
  })
  get topicInstances(): ShapeSet<Topic> {
    return undefined as any;
  }

  @literalProperty({
    path: irlcg.category,
    maxCount: 1,
    description: 'A collection of related topics forming a broader theme.',
  })
  get category(): string {
    return '';
  }

  @objectProperty({
    path: irlcg.actionTemplate,
    shape: ActionTemplate,
    description: 'Action templates associated with this topic.',
  })
  get actionTemplates(): ShapeSet<ActionTemplate> {
    return undefined as any;
  }

  /**
   * Get a topic by its identifier.
   * @param identifier The identifier of the topic.
   * @returns The topic result if found, or an error object.
   */
  static getTopic(
    identifier: string
  ): Promise<TopicResult | { error: string }> {
    return Server.call(this, 'getTopic', identifier);
  }

  /**
   * Get main topics (topic1-7) excluding event and special topics.
   * @returns A list of main topics.
   */
  static getTopics(): Promise<Topic[]> {
    return Server.call(this, 'getTopics');
  }

  // ── Disallowed inherited properties from Thing ──────────────────────
  // Keep: name, description, identifier, image (used in TopicProvider queries)

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
