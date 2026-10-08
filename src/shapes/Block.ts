import { linkedShape } from '../package.js';
import { objectProperty } from '@_linked/core/shapes/SHACL';
import { irlcg } from '../ontologies/lincd-irlcg.js';
import { Neighbourhood } from './Neighbourhood.js';
import { Place } from '@_linked/schema/shapes/Place';
import { schema } from '@_linked/schema/ontologies/schema';

@linkedShape({
  description:
    'A city block or neighborhood subdivision. Represents urban areas with containment relationships to neighborhoods and place properties. (block, district, area)',
})
export class Block extends Place {
  /**
   * indicates that instances of this shape need to have this rdf.type
   */
  static targetClass = irlcg.Block;

  @objectProperty({
    path: schema.containedInPlace,
    shape: Neighbourhood,
    description: 'The neighborhood this block is part of',
  })
  get containedInPlace(): Neighbourhood {
    return undefined as any;
  }
}
