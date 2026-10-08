import { linkedShape } from '../package.js';
import { objectProperty } from '@_linked/core/shapes/SHACL';
import { irlcg } from '../ontologies/lincd-irlcg.js';
import { AdministrativeArea } from '@_linked/schema/shapes/AdministrativeArea';
import { SecondLevelAdministrativeArea } from './SecondLevelAdministrativeArea.js';
import { schema } from '@_linked/schema/ontologies/schema';

@linkedShape({
  description:
    'A first-level administrative division like a state or province. Represents major administrative areas with containment relationships to second-level areas. (state, province, region)',
})
export class FirstLevelAdministrativeArea extends AdministrativeArea {
  /**
   * indicates that instances of this shape need to have this rdf.type
   */
  static targetClass = irlcg.FirstLevelAdministrativeArea;

  @objectProperty({
    path: schema.containedInPlace,
    shape: SecondLevelAdministrativeArea,
  })
  get containedInPlace(): SecondLevelAdministrativeArea {
    return undefined as any;
  }
}
