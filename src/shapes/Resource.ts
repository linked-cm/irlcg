import { disallowProperty } from '@_linked/core/shapes/SHACL';
import { linkedShape } from '../package.js';
import { irlcg } from '../ontologies/lincd-irlcg.js';
import { Thing } from '@_linked/schema/shapes/Thing';
import { Server } from '@_linked/server-utils/utils/Server';
import { Answer } from '@_linked/schema/shapes/Answer';
import { QResult } from '@_linked/core/queries/SelectQuery';
import { ImageObject } from '@_linked/schema/shapes/ImageObject';
import { Comment } from '@_linked/schema/shapes/Comment';

export type ResourceResult = QResult<
  Resource,
  {
    identifier: string;
    name: string;
    description: string;
    image: QResult<ImageObject, { contentUrl: string }>;
    parentItem: QResult<Comment>;
    childItems: QResult<Comment>[];
  }
>;
@linkedShape({
  description:
    'Educational content that players can read to learn about the game. Represents learning materials with answer properties and content relationships. (material, guide, content)',
})
export class Resource extends Answer {
  /**
   * indicates that instances of this shape need to have this rdf.type
   */
  static targetClass = irlcg.Resource;

  static loadById(id: string): Promise<ResourceResult> {
    return Server.call(this, 'loadById', id);
  }

  static getResources(): Promise<ResourceResult[]> {
    return Server.call(this, 'getResources');
  }

  // ── Disallowed inherited properties from Thing ──────────────────────
  // Keep: name, description, identifier, image (used in ResourceCard)
  // Keep from Comment: parentItem, childItem, childItems (tree structure)

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
