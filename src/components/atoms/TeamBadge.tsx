import React from 'react';
import style from './TeamBadge.module.css';
import { useTranslate } from '@tolgee/react';

interface TeamBadgeProps {
  medalImage: string;
  medalNumber: number | string;
  medalDescription: string;
}

const TeamBadge = ({
  medalImage,
  medalNumber,
  medalDescription,
}: TeamBadgeProps) => {
  const { t } = useTranslate();

  return (
    <div className={style.container}>
      <div className={style.title}>
        <img src={medalImage} alt="medal" />
        <h1>{medalNumber}</h1>
      </div>
      <div className={style.description}>
        <p>{t('medal.' + medalDescription, medalDescription)}</p>
      </div>
    </div>
  );
};

export default TeamBadge;
