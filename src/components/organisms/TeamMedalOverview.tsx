import React, { useState, useEffect } from 'react';
import { PlayerMedalsCard } from '../molecules/PlayerMedalsCard.js';
import { Modal } from '@_linked/mui-base/components/Modal';
import { PlayerScoreOverview } from './PlayerScoreOverview.js';
import style from './TeamMedalOverview.module.css';
import { Person } from '@_linked/schema/shapes/Person';
import { useTranslate } from '@tolgee/react';
import { ShapeSet } from '@_linked/core/collections/ShapeSet';
import { QResult } from '@_linked/core/queries/SelectQuery';
import { Team } from '../../shapes/Team.js';
import { UserData } from '@_linked/auth/types/auth';
import { ActionTotal } from '../../shapes/ActionTotal.js';
import {
  BRONZE_MEDAL_NUMBER,
  GOLD_MEDAL_NUMBER,
  SILVER_MEDAL_NUMBER,
} from '../../utils/medal.js';

interface TeamMedalOverviewProps {
  members: any[];
  currentTeam?: QResult<Team>;
}

export const TeamMedalOverview = ({
  members,
  currentTeam,
}: TeamMedalOverviewProps) => {
  let { t } = useTranslate();
  const prefix = 'medalOverview';

  const [selectedMember, setSelectedMember] = useState<UserData | null>(null);
  const [medalTotalsMap, setMedalTotalsMap] = useState<
    Record<string, { [key: number]: number }>
  >({});
  const [actionTotalsData, setActionTotalsData] = useState<
    Record<string, any[]>
  >({});
  const [loading, setLoading] = useState(true);

  const selectMember = (member: UserData) => {
    setSelectedMember(member);
  };

  // fetch all medal data for all team members
  useEffect(() => {
    if (!members || members.length === 0 || !currentTeam) {
      setLoading(false);
      return;
    }

    // convert members to UserData format if needed
    const users: UserData[] = members.map((member) => ({
      id: member.id || member.uri || member,
    }));

    ActionTotal.getAllOfByUsers(users, currentTeam)
      .then((actionTotalsObj) => {
        const newMedalTotalsObj: Record<string, { [key: number]: number }> = {};

        // Store the raw topic scores data for PlayerScoreOverview
        setActionTotalsData(actionTotalsObj);

        users.forEach((user) => {
          const userActionTotals = actionTotalsObj[user.id] || [];

          // process all users, including those with no topic scores
          let numMedals = { 0: 0, 1: 0, 2: 0, 3: 0 };

          userActionTotals.forEach((actionTotal) => {
            numMedals[actionTotal.medal] += 1;
          });

          // add medal totals (even if all zeros for inactive members)
          newMedalTotalsObj[user.id] = numMedals;
        });

        setMedalTotalsMap(newMedalTotalsObj);
      })
      .catch((error) => {
        console.error('Error fetching medal data:', error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [members, currentTeam]);

  return (
    <div className={style.TeamMedalOverview}>
      <div className={style.Header}>
        {/*<Divider />*/}
        <h2 className={style.Title}>{t(prefix + '.teammates', 'Teammates')}</h2>
        {/*<Divider />*/}
      </div>
      <div className={style.Content}>
        {members.length > 0 &&
          members.map((teamMember) => {
            // ensure every member gets medal totals (fallback to zeros for inactive members)
            const medalTotals = medalTotalsMap[teamMember.id] || {
              0: 0,
              1: 0,
              2: 0,
              3: 0,
            };

            return (
              <PlayerMedalsCard
                of={teamMember}
                onClick={() => selectMember(teamMember)}
                key={teamMember.id}
                className={style.PlayerMedalsCard}
                currentTeam={currentTeam}
                medalTotals={medalTotals}
                loading={loading}
              />
            );
          })}
        {selectedMember && (
          <Modal
            isOpen={selectedMember && true}
            onClose={() => setSelectedMember(null)}
            renderContent={
              <PlayerScoreOverview
                of={selectedMember}
                currentTeam={currentTeam}
                actionTotals={actionTotalsData[selectedMember.id] || []}
              />
            }
          />
        )}
      </div>
    </div>
  );
};
