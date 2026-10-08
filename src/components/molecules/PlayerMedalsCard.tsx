import TeamBadge from '../atoms/TeamBadge.js';
import React, { useEffect, useState } from 'react';
import { linkedComponent } from '../../package.js';
import { Person } from '@linked.cm/profile/shapes/Person';
import style from './PlayerMedalsCard.module.css';
import { Avatar } from '@linked.cm/profile/components/Avatar';
import { ActionTotal } from '../../shapes/ActionTotal.js';
import {
  BRONZE_MEDAL_NUMBER,
  GOLD_MEDAL_NUMBER,
  SILVER_MEDAL_NUMBER,
} from '../../utils/medal.js';
import { cl } from '@_linked/react/utils/ClassNames';
import { asset } from '@_linked/core/utils/LinkedFileStorage';
import { QResult } from '@_linked/core/queries/SelectQuery';
import { Team } from '../../shapes/Team.js';

interface HouseholdCardProps {
  onClick?: () => void;
  className?: string;
  currentTeam?: QResult<Team>;
  medalTotals?: { [key: number]: number }; // pre-calculated medal totals to avoid individual queries
  loading?: boolean;
}

const query = Person.select((p) => ({
  givenName: p.givenName,
  familyName: p.familyName,
}));
export const PlayerMedalsCard = linkedComponent<
  typeof query,
  HouseholdCardProps
>(
  query,
  ({
    onClick,
    className,
    id,
    givenName,
    familyName,
    currentTeam,
    medalTotals,
    loading,
  }) => {
    const user = { id };
    let [internalMedalTotals, setInternalMedalTotals] = useState<{
      [key: number]: number;
    }>({});

    // use provided medalTotals if available, otherwise fetch individually (fallback)
    useEffect(() => {
      if (medalTotals) {
        // use pre-calculated medal totals from parent
        setInternalMedalTotals(medalTotals);
      } else if (!loading && currentTeam) {
        // fallback: fetch individually if not provided by parent
        ActionTotal.getAllOfByUser(user, currentTeam).then((actionTotals) => {
          let numMedals = { 0: 0, 1: 0, 2: 0, 3: 0 };
          if (actionTotals && actionTotals.length > 0) {
            actionTotals.forEach((actionTotal) => {
              numMedals[actionTotal.medal] += 1;
            });
          }
          // always set medal totals (even if all zeros for inactive members)
          setInternalMedalTotals(numMedals);
        });
      } else if (!medalTotals && !currentTeam) {
        // no data available, show zeros
        setInternalMedalTotals({ 0: 0, 1: 0, 2: 0, 3: 0 });
      }
    }, [medalTotals, loading, currentTeam]);

    // always provide fallback to zeros if no medal data exists
    const displayMedalTotals = medalTotals ||
      internalMedalTotals || { 0: 0, 1: 0, 2: 0, 3: 0 };

    return (
      <div className={cl(style.PlayerMedalsCard, className)} onClick={onClick}>
        <div className={style.CardHeader}>
          <Avatar
            of={user}
            size="small"
            className={style.avatarPersonal}
            fallback={<span>&nbsp;</span>}
          />
          <h4>
            {(givenName ? givenName + ' ' : '') + ' ' + (familyName || '')}
          </h4>
        </div>
        <div className={style.CardContent}>
          <TeamBadge
            medalImage={asset('/images/medals/generic-bronze.webp')}
            medalNumber={displayMedalTotals[BRONZE_MEDAL_NUMBER] || 0}
            medalDescription="Bronze"
          />
          <TeamBadge
            medalImage={asset('/images/medals/generic-silver.webp')}
            medalNumber={displayMedalTotals[SILVER_MEDAL_NUMBER] || 0}
            medalDescription="Silver"
          />
          <TeamBadge
            medalImage={asset('/images/medals/generic-gold.webp')}
            medalNumber={displayMedalTotals[GOLD_MEDAL_NUMBER] || 0}
            medalDescription="Gold"
          />
        </div>
      </div>
    );
  }
);
