import { linkedShape } from '../package.js';
import { objectProperty } from '@_linked/core/shapes/SHACL';
import { irlcg } from '../ontologies/lincd-irlcg.js';
import { AdministrativeArea } from '@_linked/schema/shapes/AdministrativeArea';
import { ThirdLevelAdministrativeArea } from './ThirdLevelAdministrativeArea.js';
import { schema } from '@_linked/schema/ontologies/schema';

@linkedShape({
  description:
    'A second-level administrative division like a county or district. Represents mid-level administrative areas with containment relationships to third-level areas. (county, district, department)',
})
export class SecondLevelAdministrativeArea extends AdministrativeArea {
  /**
   * indicates that instances of this shape need to have this rdf.type
   */
  static targetClass = irlcg.SecondLevelAdministrativeArea;

  @objectProperty({
    path: schema.containedInPlace,
    shape: ThirdLevelAdministrativeArea,
  })
  get containedInPlace(): ThirdLevelAdministrativeArea {
    return undefined as any;
  }
}
