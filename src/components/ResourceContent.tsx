import React from 'react';
import style from './ResourceContent.module.css';
import { linkedComponent } from '../package.js';
import { Resource } from '../shapes/Resource.js';
import { asset } from '@_linked/core/utils/LinkedFileStorage';

interface ResourceContentProps {
  of?: Resource;
  content?: React.ReactNode;
}

const query = Resource.select((resource) => ({
  name: resource.name,
  // Keep the nested key explicit until core preserves leaf-property keys when
  // lowering aliased nested projections.
  image: (resource.image as any).select((image) => ({
    contentUrl: image.contentUrl,
  })),
}));
export const ResourceContent = linkedComponent<
  typeof query,
  ResourceContentProps
>(query, ({ name, image, content }) => {
  const resourceImage = image as { contentUrl?: string } | undefined;

  return (
    <div className={style.ResourceContent}>
      <div className={style.bannerContainer}>
        {/* if the title is needed then just uncomment */}
        {/* <h1>{name}</h1> */}
        {resourceImage?.contentUrl && (
          <img
            src={asset(resourceImage.contentUrl)}
            alt={name}
            className={style.image}
          />
        )}
        {/* <ImageView of={image} /> */}
      </div>
      <div className={style.Content}>
        {content}
        {/* {content.map((item) => {
            const name = item.name;
            const description = item.description;
            return (
              <>
                <h3>{name}</h3>
                <p>{description}</p>
              </>
            );
          })} */}
      </div>
      {/* <Button className={style.button}>
          <img
            src="/images/icons/DownloadIcon.svg"
            alt="Button Icon"
            width="30px"
          />
          Download PDF
        </Button> */}
    </div>
  );
});

//register all components in this file
// registerPackageModule({ ResourceContent });
