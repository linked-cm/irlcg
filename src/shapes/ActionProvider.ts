import { ShapeProvider } from '@_linked/server-utils/utils/ShapeProvider';
import { cached } from '../utils/cached.js';
import { ActionOption } from './ActionOption.js';
import { Action, type ActionResult } from './Action.js';

export class ActionProvider extends ShapeProvider {
  public shape = Action;

  async getAction(
    identifier: string
  ): Promise<ActionResult | { error: string }> {
    // make sure identifier is valid
    if (!identifier) {
      return {
        error: `Invalid action identifier: ${identifier}`,
      };
    }

    return cached(
      async () => {
        const action = await Action.select((a) => {
          return [
            a.identifier,
            a.name,
            a.description,
            a.route,
            a.actionOptions.as(ActionOption).select((at) => {
              return [
                at.identifier,
                at.name,
                at.points,
                at.isBonus,
                at.isCustom,
                at.description,
              ];
            }),
            a.scoreConfiguration,
            (a.image as any).select((img) => {
              return [img.contentUrl];
            }),
          ];
        })
          .where((t) => {
            return t.identifier.equals(identifier.toUpperCase());
          })
          .one();

        if (!action) {
          return {
            error: `Action ${identifier} not found`,
          };
        }

        // RDF multi-value properties are unordered. Sort the backend result
        // rather than using nested orderBy, which requires a subject-bound query.
        const result = action as ActionResult;
        result.actionOptions.sort((left, right) =>
          String(left.identifier || left.id).localeCompare(
            String(right.identifier || right.id),
            undefined,
            { numeric: true }
          )
        );

        return result;
      },
      ['getAction', identifier],
      10 * 60 * 1000 // cache for 10 minutes
    );
  }

  /**
   * Get main actions (action1-7) with caching
   * Excludes event and other special actions
   */
  async getActions() {
    return cached(
      async () => {
        const actions = await Action.select((a) => {
          return [
            a.identifier,
            a.name,
            a.description,
            a.route,
            a.actionOptions,
            a.scoreConfiguration,
            (a.image as any).select((img) => {
              return [img.contentUrl];
            }),
          ];
        });

        // filter to only main actions (action1-7)
        const mainActions = (actions as ActionResult[]).filter((action) => {
          // get last part of ID after last slash
          const id = action.id.split('/').pop();
          return (
            id &&
            [
              'action1',
              'action2',
              'action3',
              'action4',
              'action5',
              'action6',
              'action7',
            ].includes(id)
          );
        });

        // RDF result order is not guaranteed, so keep the Peace Action cards
        // in their intended numeric order before returning them to the client.
        mainActions.sort((left, right) =>
          String(left.identifier || left.id).localeCompare(
            String(right.identifier || right.id),
            undefined,
            { numeric: true }
          )
        );

        return mainActions;
      },
      ['getActions'],
      10 * 60 * 1000 // cache for 10 minutes
    );
  }
}
