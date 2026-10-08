import React, { useState } from 'react';
import style from './HCard.module.css';
import { Button } from '@_linked/primitives/components/Button';
import cl from 'classnames';
import { ImageView } from '@_linked/schema/components/ImageView';
import { asset } from '@_linked/core/utils/LinkedFileStorage';
import { ImageObject } from '@_linked/schema/shapes/ImageObject';
import { QResult } from '@_linked/core/queries/SelectQuery';

//This props probably can be modified in the future
interface HCardProps {
  name: string;
  buttonText?: string;
  bottomSection?: boolean;
  description?: string;
  image?: ImageObject | QResult<ImageObject> | string; // image can be a string or ImageObject
  onClick?: () => void;
}

function HCard({
  name,
  buttonText,
  bottomSection,
  description,
  image,
  onClick,
}: HCardProps) {
  // render image based on the type of image prop
  const renderImage = () => {
    if (typeof image === 'string') {
      return <img src={asset(image)} alt={name} className={style.image} />;
    } else if (image instanceof ImageObject) {
      return <ImageView of={image} alt={name} className={style.image} />;
    }
    return null;
  };

  return (
    <div
      className={cl(style.MainCard, bottomSection && style.withFooter)}
      onClick={onClick}
    >
      <div className={style.Card}>
        <div className={style.CardImage}>
          {renderImage()}
          {/* <ImageView of={image} /> */}
        </div>
        <div className={style.HCardContent}>
          <div
            className={cl(
              style.HCardDescription,
              description && style.withDescription
            )}
          >
            <h3>{name}</h3>
            {description ? <p>{description}</p> : null}
          </div>
          <Button type="button" variant="ghost" className={style.HCardButton}>
            <img src={asset('/images/icons/ArrowIcon.svg')} alt="Card Button" />
            {buttonText ? <p>{buttonText}</p> : null}
          </Button>
        </div>
      </div>
      {bottomSection ? <BottomSection /> : null}
    </div>
  );
}

const BottomSection = () => {
  const [isCompleted, setIsCompleted] = useState(false);

  return (
    <div
      className={style.BottomSection}
      onClick={() => setIsCompleted((prevState) => !prevState)}
    >
      {isCompleted ? (
        <div className={style.Completed}>
          <div className={style.StatusSection}>
            <img
              src={asset('/images/icons/MdCheckCircleOutline.svg')}
              alt="Button Icon"
              width="28px"
            />
            <p>Completed</p>
          </div>
          <div className={style.EditSection}>
            <img
              src={asset('/images/icons/MdEditIcon.svg')}
              alt="Button Icon"
              width="18px"
            />
            <p>Edit</p>
          </div>
        </div>
      ) : (
        <div className={style.Complete}>
          <img
            src={asset('/images/icons/MdCheckCircleOutline.svg')}
            alt="Button Icon"
            width="22px"
          />
          <p>Complete</p>
        </div>
      )}
    </div>
  );
};

export default HCard;
