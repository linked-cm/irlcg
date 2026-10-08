import React from 'react';
import style from './ResourceCard.module.css';
import { linkedComponent } from '../../package.js';
import HCard from '../atoms/HCard.js';
import { Resource } from '../../shapes/Resource.js';
import { useTranslate } from '@tolgee/react';

const query = Resource.select((resource) => ({
  name: resource.name,
  description: resource.description,
  // Keep the nested key explicit until core preserves leaf-property keys when
  // lowering aliased nested projections.
  image: (resource.image as any).select((image) => ({
    contentUrl: image.contentUrl,
  })),
  identifier: resource.identifier,
}));
export const ResourceCard = linkedComponent<
  typeof query,
  { onClick: () => void }
>(query, ({ name, description, image, identifier, onClick }) => {
  const { t } = useTranslate();
  const prefix = 'resources';
  const resourceImage = image as { contentUrl?: string } | undefined;

  return (
    <HCard
      name={t(prefix + '.name.' + identifier, name)}
      description={t(prefix + '.desc.' + identifier, description)}
      image={resourceImage?.contentUrl}
      onClick={onClick}
    />
  );
});
// registerPackageModule(module);
