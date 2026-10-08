import React from 'react';
import Thumbnail from '../atoms/Thumbnail.js';
import { linkedComponent } from '../../package.js';
import { Action } from '../../shapes/Action.js';
import type { QResult } from '@_linked/core/queries/SelectQuery';
import type { ImageObject } from '@_linked/schema/shapes/ImageObject';
import { useTranslate } from '@tolgee/react';

interface ActionThumbnailProps {
  name: string;
  category?: string;
  identifier?: string;
  image?: QResult<ImageObject, { contentUrl?: string }>;
}
const query = Action.select((action) => ({
  name: action.name,
  category: action.category,
  identifier: action.identifier,
  /**
   * Temporary workaround for a core nested-projection alias bug.
   *
   * The explicit key prevents `contentUrl` from being returned as `image.image`.
   * After core fixes nested array projections, restore `[image.contentUrl]` and
   * verify Team Progress images before removing this workaround.
   */
  image: (action.image as any).select((image) => ({
    contentUrl: image.contentUrl,
  })),
}));
export const ActionThumbnail = linkedComponent<
  typeof query,
  ActionThumbnailProps
>(query, ({ name, category, identifier, image }) => {
  const { t } = useTranslate();
  const prefix = 'thumbnail';

  return (
    <Thumbnail
      name={t(prefix + '.action' + identifier, name)}
      category={category}
      image={image}
      identifier={identifier}
    />
  );
});

// registerPackageModule(module);
