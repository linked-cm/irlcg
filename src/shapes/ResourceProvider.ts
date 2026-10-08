import { ShapeProvider } from '@_linked/server-utils/utils/ShapeProvider';
import { Resource, type ResourceResult } from './Resource.js';
export class ResourceProvider extends ShapeProvider {
  public shape = Resource;

  /**
   * Load a resource by its identifier.
   *
   * @param id - The identifier of the resource to load.
   * @returns The resource.
   */
  async loadById(id: string) {
    // Load the main resource
    let resource = await Resource.select((r) => {
      return [
        r.identifier,
        r.name,
        r.description,
        (r.image as any).select((img) => {
          return [img.contentUrl];
        }),
        r.parentItem,
        r.childItems,
      ];
    })
      .where((r) => {
        return r.identifier.equals(id);
      })
      .one();

    if (!resource) {
      throw new Error(`Resource with identifier ${id} not found`);
    }

    // load the child items of the resource
    const childItems = await Resource.select((r) => {
      return [
        r.identifier,
        r.name,
        r.description,
        (r.image as any).select((img) => {
          return [img.contentUrl];
        }),
        r.parentItem,
      ];
    }).where((r) => {
      return r.parentItem.equals(resource as any);
    });

    // add the child items to the resource
    (resource as any).childItems = childItems;

    return resource;
  }

  /**
   * Get all resources
   *
   * @returns A list of resources.
   */
  async getResources() {
    const resources = await Resource.select((r) => {
      return [
        r.identifier,
        r.name,
        r.description,
        (r.image as any).select((img) => {
          return [img.contentUrl];
        }),
        r.parentItem,
        r.childItems,
      ];
    });

    // For each resource, load its child items
    for (const resource of resources) {
      const childItems = await Resource.select((r) => {
        return [
          r.identifier,
          r.name,
          r.description,
          (r.image as any).select((img) => {
            return [img.contentUrl];
          }),
          r.parentItem,
        ];
      }).where((r) => {
        return r.parentItem.equals(resource as any);
      });

      (resource as any).childItems = childItems;
    }

    return resources;
  }
}
