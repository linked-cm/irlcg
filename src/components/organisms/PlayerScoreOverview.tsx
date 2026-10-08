import React from 'react';
import style from './PlayerScoreOverview.module.css';
import { PlayerScore, PlayerScoreCard } from '../molecules/PlayerScoreCard.js';
import { linkedComponent } from '../../package.js';
import { Person } from '@_linked/schema/shapes/Person';
import { Avatar } from '@linked.cm/profile/components/Avatar';
import { UserData } from '@_linked/auth/types/auth';
import { QResult } from '@_linked/core/queries/SelectQuery';
import { Team } from '../../shapes/Team.js';
import { useTranslate } from '@tolgee/react';

interface PlayerScoreOverviewProps {
  currentTeam?: QResult<Team>;
  actionTotals?: any[];
}

const query = Person.select((p) => ({
  givenName: p.givenName,
  familyName: p.familyName,
  // preload: p.preloadFor(Avatar),
}));

export const PlayerScoreOverview = linkedComponent<
  typeof query,
  PlayerScoreOverviewProps
>(query, ({ source, givenName, familyName, currentTeam, actionTotals }) => {
  const userForAvatar = source;
  const { t } = useTranslate();
  const prefix = 'playerScoreOverview';

  return (
    <div className={style.container}>
      <div className={style.title}>
        <Avatar
          of={userForAvatar}
          size="small"
          className={style.avatarPersonal}
          fallback={<span>&nbsp;</span>}
        />
        <div className={style.header}>
          {(givenName ? givenName + ' ' : '') + (familyName || '')}
        </div>
      </div>
      <div className={style.content}>
        <div className={style.container2}>
          {actionTotals && actionTotals.length > 0 ? (
            actionTotals
              .sort((a1, a2) => {
                // sort by action id
                const action1 = a1.action?.id || '';
                const action2 = a2.action?.id || '';
                return action1.localeCompare(action2);
              })
              .map((actionTotal) => {
                return (
                  <PlayerScore
                    key={actionTotal.id}
                    identifier={actionTotal.action?.identifier}
                    actionName={actionTotal.action?.name}
                    medal={actionTotal.medal}
                    points={actionTotal.score}
                  />
                );
              })
          ) : (
            <div className={style.noScores}>
              <p>
                {t(
                  prefix + '.noScores',
                  'No action taken yet. Start participating to see the progress!'
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
