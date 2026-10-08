import { linkedShape } from '../package.js';
import { objectProperty } from '@_linked/core/shapes/SHACL';
import { irlcg } from '../ontologies/lincd-irlcg.js';
import { FirstLevelAdministrativeArea } from './FirstLevelAdministrativeArea.js';
import { Place } from '@_linked/schema/shapes/Place';
import { schema } from '@_linked/schema/ontologies/schema';

@linkedShape({
  description:
    'A neighborhood or local community area. Represents residential districts with containment relationships to administrative areas and place properties. (neighborhood, community, district)',
})
export class Neighbourhood extends Place {
  /**
   * indicates that instances of this shape need to have this rdf.type
   */
  static targetClass = irlcg.Neighbourhood;

  @objectProperty({
    path: schema.containedInPlace,
    shape: FirstLevelAdministrativeArea,
    description: 'Parent administrative area (state, province, region)',
  })
  get containedInPlace(): FirstLevelAdministrativeArea {
    return undefined as any;
  }
}
