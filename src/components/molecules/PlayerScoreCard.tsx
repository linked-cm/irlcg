import React from 'react';
import style from './PlayerScoreCard.module.css';
import { linkedComponent } from '../../package.js';
import { ActionTotal } from '../../shapes/ActionTotal.js';
import { useTranslate } from '@tolgee/react';
import { getMedalType } from '../../utils/medal.js';
import { asset } from '@_linked/core/utils/LinkedFileStorage';

const query = ActionTotal.select((t) => ({
  identifier: t.action.identifier,
  actionName: t.action.name,
  //TODO: allow select on single QShape, then: action: t.action.select(action => [action.name,action.identifier]),
  medal: t.medal,
  points: t.score,
}));
export const PlayerScoreCard = linkedComponent(
  query,
  ({ identifier, actionName, medal, points }) => {
    let { t } = useTranslate('common');
    let isMedal =
      getMedalType(medal) === 'bronze' ||
      getMedalType(medal) === 'silver' ||
      getMedalType(medal) === 'gold';
    let image: string;
    if (isMedal) {
      image = `/images/medals/${actionName.name.toLowerCase()}-${getMedalType(
        medal
      )}.webp`;
    }

    return (
      <div className={style.PlayerScoreCard}>
        <div className={style.text}>
          <p>{t('word.action', 'Action') + ' ' + identifier}</p>
          <h2>{actionName.name}</h2>
        </div>
        {isMedal ? (
          <img src={asset(image)} className={style.image}></img>
        ) : (
          <video autoPlay loop muted playsInline className={style.image}>
            <source src={asset('/images/Fire_Orange.mp4')} type="video/mp4" />
            <source src={asset('/images/Fire_Orange.webm')} type="video/webm" />
          </video>
        )}
        <p>
          {points}{' '}
          {points === 1
            ? t('word.action', 'action')
            : t('word.actions', 'actions')}
        </p>
      </div>
    );
  }
);

// this component copy from `PlayerScoreCard` without linkedComponent
export const PlayerScore = ({ identifier, actionName, medal, points }) => {
  let { t } = useTranslate('common');
  let isMedal =
    getMedalType(medal) === 'bronze' ||
    getMedalType(medal) === 'silver' ||
    getMedalType(medal) === 'gold';
  let image: string;
  if (isMedal) {
    image = `/images/medals/${actionName?.toLowerCase()}-${getMedalType(
      medal
    )}.webp`;
  }

  return (
    <div className={style.PlayerScoreCard}>
      <div className={style.text}>
        <p>{t('word.action', 'Action') + ' ' + identifier}</p>
        <h2>{actionName}</h2>
      </div>
      <div style={{ minWidth: '100px' }}>
        {isMedal ? (
          <img src={asset(image)} className={style.image}></img>
        ) : (
          <video autoPlay loop muted playsInline className={style.image}>
            <source src={asset('/images/Fire_Orange.mp4')} type="video/mp4" />
            <source src={asset('/images/Fire_Orange.webm')} type="video/webm" />
          </video>
        )}
      </div>
      <p>
        {points}{' '}
        {points === 1
          ? t('word.action', 'action')
          : t('word.actions', 'actions')}
      </p>
    </div>
  );
};
