import React from 'react';
import style from './Thumbnail.module.css';
import { cl } from '@_linked/react/utils/ClassNames';
import { useStyles } from '@_linked/react/utils/Hooks';
import type { QResult } from '@_linked/core/queries/SelectQuery';
import { asset } from '@_linked/core/utils/LinkedFileStorage';
import type { ImageObject } from '@_linked/schema/shapes/ImageObject';

interface Thumbnail {
  topicWithBadges?: boolean;
  name: string;
  category?: string;
  progress?: string;
  image?: QResult<ImageObject, { contentUrl?: string }>;
  identifier: string;
  className?: string;
}

function Thumbnail({
  topicWithBadges,
  name,
  category,
  progress,
  image,
  identifier,
  ...restProps
}: Thumbnail) {
  // restProps receive additional styles-related props
  // such as margin/padding from parent component
  restProps = useStyles(restProps, style.Thumbnail);
  const imageUrl = image?.contentUrl ? asset(image.contentUrl) : undefined;

  return (
    <div {...restProps}>
      <div className={style.ThumbnailImage}>
        <img src={imageUrl} alt={name} />
      </div>
      <div className={style.ThumbnailContent}>
        <div
          className={cl(
            style.ContentHeader,
            topicWithBadges && style.withBadges
          )}
        >
          {topicWithBadges ? (
            <>
              <h5>{name}</h5>
              <div className={style.ContentIcon}>
                <img
                  src={asset('/images/icons/PlanIcon1.svg')}
                  alt="Card Icon"
                  width="20px"
                />
                <img
                  src={asset('/images/icons/PlanIcon2.svg')}
                  alt="Card Icon"
                  width="20px"
                />
              </div>
            </>
          ) : (
            <h3 className={style.SmallTitle}>{name}</h3>
          )}
        </div>
        <div className={style.ContentAction}>
          {progress && <h3>{progress}</h3>}
          {category && <h3 className={style.Category}>{category}</h3>}
          {identifier && <h5>Action {identifier}</h5>}
        </div>
      </div>
    </div>
  );
}

export default Thumbnail;
