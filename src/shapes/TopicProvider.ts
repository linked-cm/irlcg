import { ShapeProvider } from '@_linked/server-utils/utils/ShapeProvider';
import { cached } from '../utils/cached.js';
import { ActionTemplate } from './ActionTemplate.js';
import { Topic, type TopicResult } from './Topic.js';

export class TopicProvider extends ShapeProvider {
  public shape = Topic;

  async getTopic(identifier: string): Promise<TopicResult | { error: string }> {
    // make sure identifier is valid
    if (!identifier) {
      return {
        error: `Invalid topic identifier: ${identifier}`,
      };
    }

    return cached(
      async () => {
        const topic = await Topic.select((t) => {
          return [
            t.identifier,
            t.name,
            t.description,
            t.actionTemplates.as(ActionTemplate).select((at) => {
              return [
                at.identifier,
                at.name,
                at.points,
                at.isBonus,
                at.isCustom,
                at.description,
              ];
            }),
            t.scoreConfiguration,
            (t.image as any).select((img) => {
              return [img.contentUrl];
            }),
          ];
        })
          .where((t) => {
            return t.identifier.equals(identifier.toUpperCase());
          })
          .one();

        if (!topic) {
          return {
            error: `Topic ${identifier} not found`,
          };
        }

        return topic;
      },
      ['getTopic', identifier],
      10 * 60 * 1000 // cache for 10 minutes
    );
  }

  /**
   * Get main topics (topic1-7) with caching
   * Excludes event and other special topics
   */
  async getTopics() {
    return cached(
      async () => {
        const topics = await Topic.select((t) => {
          return [
            t.identifier,
            t.name,
            t.description,
            t.actionTemplates,
            t.scoreConfiguration,
            (t.image as any).select((img) => {
              return [img.contentUrl];
            }),
          ];
        });

        // filter to only main topics (topic1-7)
        const mainTopics = topics.filter((t: any) => {
          // get last part of ID after last slash
          const id = t.id.split('/').pop();
          return (
            id &&
            [
              'topic1',
              'topic2',
              'topic3',
              'topic4',
              'topic5',
              'topic6',
              'topic7',
            ].includes(id)
          );
        });

        return mainTopics;
      },
      ['getTopics'],
      10 * 60 * 1000 // cache for 10 minutes
    );
  }
}
