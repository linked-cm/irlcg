import React from 'react';
import style from './ActionCard.module.css';
import { linkedComponent } from '../../package.js';
import VCard from '../atoms/VCard.js';
import { useTranslate } from '@tolgee/react';
import { asset } from '@_linked/core/utils/LinkedFileStorage';
import { Action } from '../../shapes/Action.js';

const query = Action.select((action) => ({
  name: action.name,
  identifier: action.identifier,
  description: action.description,
  image: (action.image as any).select((img) => [img.contentUrl]),
}));

export const ActionCard = linkedComponent<
  typeof query,
  { cardTitle?: string; overlay?: boolean }
>(query, ({ id, name, description, image, cardTitle, overlay, ...props }) => {
  //create the translation function, use the common namespace
  let { t } = useTranslate();

  //with t(key,defaultValue) the key will show up on in the dev context app (hover text and hold Option) and can be added and translated in tolgee.
  let prefix = 'action' + id;
  const actionImage = image as { contentUrl?: string } | undefined;
  const imageURL = actionImage?.contentUrl
    ? asset(actionImage.contentUrl)
    : undefined;

  return (
    <div className={style.Root}>
      <VCard
        {...props}
        // Todo: change 'action' => prop cardTitle and pass the card title from the parent component
        title={t(
          'action-card.title',
          cardTitle ? cardTitle : 'Action' + id && id
        )}
        classNames={style.topicCard}
        subTitle={t(`${prefix}.name`, name)}
        image={imageURL}
        imageDescription={t(`${prefix}.description`, description)}
        description={t(`${prefix}.description`, description)}
      />
      {overlay ? overlay : null}
    </div>
  );
});

// registerPackageModule(module);
