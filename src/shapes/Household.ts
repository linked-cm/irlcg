import { Shape } from '@_linked/core/shapes/Shape';
import { ShapeSet } from '@_linked/core/collections/ShapeSet';

import { linkedShape } from '../package.js';
import { literalProperty, objectProperty } from '@_linked/core/shapes/SHACL';
import { irlcg } from '../ontologies/lincd-irlcg.js';

import { Accommodation } from '@_linked/schema/shapes/Accommodation';

@linkedShape({
  description:
    'Residential unit with ownership status and living arrangements (household, home, family, residence, dwelling)',
})
export class Household extends Shape {
  /**
   * indicates that instances of this shape need to have this rdf.type
   */
  static targetClass = irlcg.Household;
  static STATUS_OWNED: number = 0;
  static STATUS_RENTED: number = 1;

  /**
   * instances of this shape need to have exactly one value defined for the given property
   */
  @literalProperty({
    path: irlcg.ownership,
    required: true,
    maxCount: 1,
    in: [
      0, // Owned
      1, // Rented
    ],
    description: 'Housing tenure (0=owned, 1=rented)',
  })
  get ownership(): number {
    return 0;
  }

  @objectProperty({
    path: irlcg.accommodation,
    shape: Accommodation,
    description: 'Physical housing units associated with household',
  })
  get accommodations(): ShapeSet<Accommodation> {
    return undefined as any;
  }
}
