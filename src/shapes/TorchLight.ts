import { Shape } from '@_linked/core/shapes/Shape';
import { literalProperty, objectProperty } from '@_linked/core/shapes/SHACL';
import { xsd } from '@_linked/xsd/ontologies/xsd';
import { irlcg } from '../ontologies/lincd-irlcg.js';
import { linkedShape } from '../package.js';
import { Player } from './Player.js';

/**
 * Plan 003: A single lighting of the Peace Torch by a bearer (anonymous or
 * authenticated), with a relay chain pointer to the previous bearer.
 *
 * NOT a Oneness peace action — torch lighting is an atmospheric/relay event
 * with its own dedicated counter. Befriend submissions made from the torch UI
 * use ActionSubmission against the Oneness "Befriending the Other" Action;
 * this shape is for the lighting itself.
 *
 * Fields:
 *  - bearer: the Player (guest or real) who lit this torch
 *  - litAt: timestamp of the light event
 *  - receivedFrom: pointer to the previous bearer's TorchLight in the chain;
 *      null for cold-start lights (no active bearers when this one lit)
 *  - bearerCity / bearerCountry: geographic snapshot captured at light time
 *      so future bearers' geo-diversity-weighted pickReceivedFrom can score
 *      this entry without re-resolving the bearer's current location.
 *      Either may be missing if IP geolocation only resolved one field.
 *
 * Pass-to is derived from the reverse query (lights where receivedFrom = me),
 * not stored as a separate field.
 */
@linkedShape({
  description:
    'A single lighting of the Peace Torch with bearer + relay-chain pointer to previous bearer. Atmospheric/relay event — NOT a Oneness peace action.',
})
export class TorchLight extends Shape {
  static targetClass = irlcg.TorchLight;

  @objectProperty({
    path: irlcg.bearer,
    shape: Player,
    maxCount: 1,
    description: 'The Player (guest or authenticated) who lit this torch.',
  })
  get bearer(): Player {
    return undefined as any;
  }

  @literalProperty({
    path: irlcg.litAt,
    datatype: xsd.dateTime,
    maxCount: 1,
    description: 'Timestamp when this torch was lit.',
  })
  get litAt(): Date {
    return undefined as any;
  }

  @objectProperty({
    path: irlcg.receivedFrom,
    shape: TorchLight,
    maxCount: 1,
    description:
      'Pointer to the previous bearer’s TorchLight in the relay chain. Null for cold-start lights.',
  })
  get receivedFrom(): TorchLight {
    return undefined as any;
  }

  @literalProperty({
    path: irlcg.bearerCity,
    datatype: xsd.string,
    maxCount: 1,
    description:
      'Bearer’s city at the moment of lighting. Snapshot — may be missing if IP geolocation only resolved country.',
  })
  get bearerCity(): string {
    return '';
  }

  @literalProperty({
    path: irlcg.bearerCountry,
    datatype: xsd.string,
    maxCount: 1,
    description: 'Bearer’s country at the moment of lighting. Snapshot.',
  })
  get bearerCountry(): string {
    return '';
  }
}
