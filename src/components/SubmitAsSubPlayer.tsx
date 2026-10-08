import React, { useEffect, useState, ChangeEvent } from 'react';
import style from './SubmitAsSubPlayer.module.css';
import { Player } from '../shapes/Player.js';
import { useAuth } from '@_linked/auth/hooks/useAuth';
import { UserAccountData, UserData } from '@_linked/auth/types/auth';

interface SubmitAsSubPlayerProps {
  selectedSubPlayer: UserAccountData;
  onSubPlayerSelected: (playerData: UserAccountData) => void;
  teamId?: string;
}

export const SubmitAsSubPlayer = ({
  selectedSubPlayer,
  onSubPlayerSelected,
  teamId,
}: SubmitAsSubPlayerProps) => {
  const auth = useAuth();
  const loggedInPlayer = auth.user;
  const loggedInAccount = auth.userAccount;

  const [subPlayers, setSubPlayers] = useState([]);

  const handleSelectionChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const selectedAccountId = event.target.value;

    // find the complete player data from our subPlayers array
    const selectedPlayerData = subPlayers.find(
      (player) => player.id === selectedAccountId
    );

    if (selectedPlayerData) {
      onSubPlayerSelected(selectedPlayerData);
    }
  };

  useEffect(() => {
    let active = true;
    setSubPlayers([]);

    Player.getSubPlayers().then((subPlayers) => {
      if (active && subPlayers) {
        setSubPlayers(subPlayers);
      }
    });

    return () => {
      active = false;
    };
  }, [loggedInAccount.id, loggedInPlayer.id, teamId]);

  return (
    <>
      {subPlayers && subPlayers.length > 0 && (
        <div className={style.Root}>
          <select
            className={style.select}
            onChange={handleSelectionChange}
            value={selectedSubPlayer?.id}
            style={{ textTransform: 'capitalize' }}
          >
            {subPlayers.map((playerAccount) => (
              <option key={playerAccount.id} value={playerAccount.id}>
                {playerAccount.accountOf.givenName}{' '}
                {playerAccount.accountOf.familyName}{' '}
                {playerAccount.accountOf.id === loggedInPlayer.id && '(me)'}
              </option>
            ))}
          </select>
          <div className={style.arrow}>
            <svg
              height="20"
              width="20"
              viewBox="0 0 20 20"
              aria-hidden="true"
              focusable="false"
              className="css-tj5bde-Svg"
            >
              <path d="M4.516 7.548c0.436-0.446 1.043-0.481 1.576 0l3.908 3.747 3.908-3.747c0.533-0.481 1.141-0.446 1.574 0 0.436 0.445 0.408 1.197 0 1.615-0.406 0.418-4.695 4.502-4.695 4.502-0.217 0.223-0.502 0.335-0.787 0.335s-0.57-0.112-0.789-0.335c0 0-4.287-4.084-4.695-4.502s-0.436-1.17 0-1.615z"></path>
            </svg>
          </div>
        </div>
      )}
    </>
  );
};
