import { Shape } from '@_linked/core/shapes/Shape';

import { linkedShape } from '../package.js';
import { literalProperty } from '@_linked/core/shapes/SHACL';
import { irlcg } from '../ontologies/lincd-irlcg.js';
import { AdministrativeArea } from '@_linked/schema/shapes/AdministrativeArea';

@linkedShape({
  description:
    'A third-level administrative division like a municipality or city. Represents local administrative areas with administrative area properties and governance relationships. (municipality, city, township)',
})
export class ThirdLevelAdministrativeArea extends AdministrativeArea {
  /**
   * indicates that instances of this shape need to have this rdf.type
   */
  static targetClass = irlcg.ThirdLevelAdministrativeArea;
}
