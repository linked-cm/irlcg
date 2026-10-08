import React from 'react';
import style from './VCard.module.css';
import { Button } from '@mui/base';
import cl from 'classnames';
import { asset } from '@_linked/core/utils/LinkedFileStorage';

function Card({
  image,
  imageDescription,
  title,
  subTitle,
  description,
  onClick,
  classNames,
}: {
  image?: string;
  imageDescription?: string;
  title?: React.ReactNode | string;
  subTitle?: React.ReactNode | string;
  description?: React.ReactNode | string;
  classNames?: string;
  onClick?: () => void;
}) {
  return (
    <div className={cl(style.Card, classNames)} onClick={onClick}>
      <div
        className={style.CardImage}
        style={{
          backgroundImage: `url(${asset(image || '/images/card_img.avif')})`,
        }}
        title={imageDescription || 'Card Image'}
      />
      <div className={style.CardContent}>
        <div className={style.CardDescription}>
          <h2>{title}</h2>
          <h4>{subTitle}</h4>
          <p>{description}</p>
        </div>
        <Button className={style.CardButton}>
          <img
            src={asset('/images/icons/ArrowIcon.svg')}
            alt="Card Button"
            width="34px"
          />
        </Button>
      </div>
    </div>
  );
}

export default Card;
