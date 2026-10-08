import { useTranslate } from '@tolgee/react';
import { useAuth } from '@_linked/auth/hooks/useAuth';
import { UserAccountData } from '@_linked/auth/types/auth';
import { Button } from '@_linked/primitives/components/Button';
import { Dialog } from '@_linked/primitives/components/Dialog';
import { QResult } from '@_linked/core/queries/SelectQuery';
import cl from 'classnames';
import { asset } from '@_linked/core/utils/LinkedFileStorage';
import React, { useCallback, useEffect, useState } from 'react';
import type { ActionOptionResult } from '../shapes/ActionOption.js';
import { EventTeam } from '../shapes/EventTeam.js';
import type {
  ActionsQuantityMap,
  SubmitSuccessResult,
} from '../shapes/ActionSubmission.js';
import { Team, type TeamWithEvents } from '../shapes/Team.js';
import { withRetry } from '../utils/helper.js';
import { BonusActionInput } from './BonusActionInput.js';
import style from './RadioActionInput.module.css';
import { SubmitAsSubPlayer } from './SubmitAsSubPlayer.js';
import type { ActionResult } from '../shapes/Action.js';
import { ActionTotal } from '../shapes/ActionTotal.js';
import { ActionSubmission } from '../shapes/ActionSubmission.js';

const loadedactionTotal = new Map<string, Promise<any>>();

interface RadioActionInputProps {
  action: ActionResult;
  actionOptions: ActionOptionResult[];
  onScoreUpdated: (newScore: any) => void;
  teamChange: any;
  currentTeam: TeamWithEvents;
  isTeamLeader?: boolean; // Optional prop to avoid duplicate API calls
}

export const RadioActionInput = ({
  action,
  actionOptions,
  onScoreUpdated,
  teamChange,
  currentTeam,
  isTeamLeader: propIsTeamLeader,
}: RadioActionInputProps) => {
  const auth = useAuth();
  const user = auth.user;
  const account = auth.userAccount;
  const { t } = useTranslate();

  const isEventMode = Team.getIsEventMode(currentTeam);

  const [bonusQuantity, setBonusQuantity] = useState<number>();
  const [selectedTemplateURI, setSelectedTemplateURI] = useState(null);
  const [previousTemplateURI, setPreviousTemplateURI] = useState(null);
  const [finishedGameModal, setFinishedGameModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedSubPlayer, setSelectedSubPlayer] =
    useState<UserAccountData>(account);
  const [submittedPointsMessage, setSubmittedPointsMessage] = useState('');
  const [submitCounter, setSubmitCounter] = useState<number>(0);

  const [selectedBonusAction, setSelectedBonusAction] =
    useState<ActionOptionResult>(null);
  const [previousBonusActions, setPreviousBonusActions] = useState<
    ActionOptionResult[]
  >([]);

  // Use prop from parent (ShareActionDetails) to avoid duplicate API calls
  // Default to false if not provided
  const isTeamLeader = propIsTeamLeader ?? false;

  useEffect(() => {
    setSelectedSubPlayer(account);
  }, [account.id, teamChange?.id]);

  useEffect(() => {
    const getActionTotal = async () => {
      // Get event from currentTeam if in event mode
      const event = currentTeam?.attendsEvents?.[0];
      // Include event ID in cache key to prevent collisions when same user+team+action has different events
      const key = `${selectedSubPlayer.id}-${teamChange.id}-${
        action.identifier
      }${event?.id ? `-${event.id}` : ''}`;
      if (!loadedactionTotal.has(key)) {
        loadedactionTotal.set(
          key,
          ActionTotal.getOrCreateFor(
            action,
            selectedSubPlayer,
            currentTeam,
            event ? { id: event.id } : undefined
          )
        );
      }
      const actionTotal = await loadedactionTotal.get(key);
      if (onScoreUpdated) {
        onScoreUpdated(actionTotal);
      }
    };
    getActionTotal();
  }, [selectedSubPlayer, teamChange]);

  // TODO: should we refactor this after use query?
  useEffect(() => {
    // to fetch game options by topic and sub player
    // and convert `UserAccountData` to `UserData` format
    const subPlayer = {
      id: selectedSubPlayer.accountOf.id,
    };
    ActionSubmission.getActionSubmissionByAction(action, subPlayer).then(
      (response) => {
        //collect all the custom bonus actions previousy submitted,
        //collect them by node to avoid dupplicates
        setPreviousBonusActions(response?.customActionTemplates);

        // Set the previously selected radio option (non-bonus) so it shows as checked
        const nonBonusSubmission = response?.actionSubmissions?.find(
          (as) => as.option && !as.option.isBonus
        );
        if (nonBonusSubmission?.option?.id) {
          setSelectedTemplateURI(nonBonusSubmission.option.id);
          setPreviousTemplateURI(nonBonusSubmission.option.id);
        }
      }
    );
  }, [selectedSubPlayer, teamChange, submitCounter]);

  const onBonusTemplateSelected = (template: ActionOptionResult) => {
    setSelectedBonusAction(template);
  };

  const selectTemplate = (event) => {
    const selectedTemplateURI = event.target.value;
    setSelectedTemplateURI(selectedTemplateURI);
  };

  const submitAction = useCallback(async () => {
    setLoading(true);
    let actionQuantityMap: ActionsQuantityMap = new Map();

    let template;
    let previousTemplate = previousTemplateURI
      ? actionOptions.find((t) => t.id === previousTemplateURI)
      : null;

    if (!selectedTemplateURI && !selectedBonusAction) {
      setLoading(false);
      return;
    }

    if (selectedTemplateURI) {
      template = actionOptions.find((t) => t.id === selectedTemplateURI);
      actionQuantityMap.set(template, 1);
    }
    if (selectedBonusAction && bonusQuantity) {
      //make sure the bonus quantity is not greater than 10 each submit
      let updatedBonusQuantity =
        +bonusQuantity > 0 && +bonusQuantity > 10 ? 10 : +bonusQuantity;

      // For custom templates, use selectedBonusAction directly
      // For regular templates, try to find in actionOptions first
      let bonusTemplate = actionOptions.find(
        (t) => t.id === selectedBonusAction.id
      );

      // If not found (custom template), use selectedBonusAction directly
      if (!bonusTemplate) {
        bonusTemplate = selectedBonusAction;
      }

      actionQuantityMap.set(bonusTemplate, updatedBonusQuantity);
    }

    try {
      const result = await withRetry(() =>
        ActionSubmission.submit(
          action,
          actionQuantityMap,
          true,
          selectedSubPlayer
        )
      );
      if (onScoreUpdated && result && 'actionTotal' in result) {
        const successResult = result as SubmitSuccessResult;

        // update the cache with the new action total
        const event = currentTeam?.attendsEvents?.[0];
        const key = `${selectedSubPlayer.id}-${teamChange.id}-${
          action.identifier
        }${event?.id ? `-${event.id}` : ''}`;
        loadedactionTotal.set(key, Promise.resolve(result.actionTotal));

        onScoreUpdated(result.actionTotal);
        setSubmitCounter(submitCounter + 1);

        if (successResult.justFinishedGame) {
          setFinishedGameModal(successResult.justFinishedGame);
        } else {
          let pointsEarnedForRadio;
          if (
            selectedTemplateURI &&
            selectedTemplateURI !== previousTemplateURI
          ) {
            pointsEarnedForRadio =
              template.points - (previousTemplate?.points || 0);
          } else {
            pointsEarnedForRadio = 0;
          }
          // limit bonus quantity to be <= 10 for modal's text
          let restrictedBonusQuantity =
            +bonusQuantity > 0 && bonusQuantity > 10 ? 10 : bonusQuantity;
          // Calculate bonus points safely
          let bonusPoints = 0;
          if (selectedBonusAction && restrictedBonusQuantity) {
            // For custom templates, use selectedBonusAction directly
            // For regular templates, try to find in actionOptions first
            let bonusTemplate = actionOptions.find(
              (t) => t.id === selectedBonusAction.id
            );

            // If not found (custom template), use selectedBonusAction directly
            if (!bonusTemplate) {
              bonusTemplate = selectedBonusAction;
            }

            // Ensure points is a valid number, default to 1 if undefined
            const validPoints =
              typeof bonusTemplate.points === 'number' &&
              !isNaN(bonusTemplate.points)
                ? bonusTemplate.points
                : 1;
            bonusPoints = validPoints * restrictedBonusQuantity;
          }

          let totalNewPoints = pointsEarnedForRadio + bonusPoints;
          const num = Math.abs(totalNewPoints);

          const youHave = t('word.youHave', 'You have');
          const removed = t('word.removed', 'removed');
          const earned = t('word.earned', 'earned');
          const actionLabel =
            num === 1
              ? t('word.action', 'Action')
              : t('word.actions', 'Actions');
          const forText = t('word.for', 'for');

          setSubmittedPointsMessage(
            `${youHave} ${
              totalNewPoints < 0 ? removed : earned
            } ${num} ${actionLabel} ${
              successResult.user.id === user.id
                ? ''
                : `${forText} ${successResult.user?.givenName} ${successResult.user?.familyName}`
            }`
          );
          setTimeout(() => {
            setSubmittedPointsMessage('');
          }, 4000);
        }
      }
    } catch (error) {
      console.error('Error submitting action:', error);
      alert(
        t(
          'radioActionInput.submitErrorMessage',
          'With so many Peace Actions being submitted I got a little flustered. Bear with us and kindly resubmit your action(s) again in a few moments.'
        )
      );
    } finally {
      setLoading(false);
      setBonusQuantity(0);
      setPreviousTemplateURI(selectedTemplateURI);
      setSelectedBonusAction(null);
    }
  }, [
    selectedBonusAction,
    previousTemplateURI,
    bonusQuantity,
    selectedTemplateURI,
  ]);

  const subPlayerHandler = (playerData: UserAccountData) => {
    setSelectedSubPlayer(playerData);
  };

  const renderForms = () => {
    return actionOptions
      .filter((t) => !t.isBonus)
      .map((actionOption, index) => {
        let isChecked = selectedTemplateURI === actionOption.id;

        return (
          <div
            key={actionOption.id}
            className={cl(style.item, isChecked ? style.isChecked : null)}
          >
            <label className={style.label}>
              <input
                type="radio"
                key={actionOption.id}
                value={actionOption.id}
                checked={isChecked}
                onChange={(event) => selectTemplate(event)}
                className={cl(style.checkbox)}
                aria-label={t('radioActionInput.selectTemplate', 'Select')}
              />
              <span>
                {t(actionOption.identifier + '.name', actionOption.name)}
              </span>
            </label>
          </div>
        );
      });
  };

  return (
    <div
      className={style.wrapper}
      aria-label={t('radioActionInput.wrapper', 'Radio Action Input')}
    >
      {isTeamLeader && (
        <SubmitAsSubPlayer
          onSubPlayerSelected={subPlayerHandler}
          selectedSubPlayer={selectedSubPlayer}
          teamId={teamChange?.id}
          aria-label={t(
            'radioActionInput.submitAsSubPlayer',
            'Submit as sub player'
          )}
        />
      )}

      {renderForms()}
      {!isEventMode && (
        <BonusActionInput
          actionOptions={actionOptions}
          onSelected={onBonusTemplateSelected}
          selected={selectedBonusAction}
          previousBonusActions={previousBonusActions}
          quantity={bonusQuantity}
          onQuantityChanged={(quantity) => {
            setBonusQuantity(parseInt(quantity.toString()));
          }}
          key={submitCounter}
          aria-label={t(
            'radioActionInput.bonusActionInput',
            'Bonus action input'
          )}
        />
      )}
      <br />

      <Dialog.Root
        open={finishedGameModal}
        onOpenChange={(open) => {
          if (!open) setFinishedGameModal(false);
        }}
      >
        <Dialog.Content className={style.modalForm}>
          <video autoPlay loop muted playsInline>
            <source src={asset('/images/Fire_Orange.mp4')} type="video/mp4" />
            <source src={asset('/images/Fire_Orange.webm')} type="video/webm" />
          </video>
          <Dialog.Title>
            {t('radioActionInput.congratulations', 'Congratulations!')}
          </Dialog.Title>
          <Dialog.Description>
            {t(
              'radioActionInput.completedGame',
              'You have completed this game successfully!'
            )}
          </Dialog.Description>
        </Dialog.Content>
      </Dialog.Root>
      <Dialog.Root
        open={!!submittedPointsMessage}
        onOpenChange={(open) => {
          if (!open) setSubmittedPointsMessage('');
        }}
      >
        <Dialog.Content className={style.modalForm}>
          <video autoPlay loop muted playsInline>
            <source src={asset('/images/double-check.mp4')} type="video/mp4" />
            <source
              src={asset('/images/double-check.webm')}
              type="video/webm"
            />
          </video>
          <Dialog.Title>
            {t(
              'radioActionInput.scoreSubmitted',
              'Actions submitted successfully!'
            )}
          </Dialog.Title>
          <Dialog.Description>{submittedPointsMessage}</Dialog.Description>
        </Dialog.Content>
      </Dialog.Root>
      <Button
        type="button"
        variant="outline"
        onClick={submitAction}
        className={style.center}
        disabled={loading}
        aria-label={t('word.submitButton', 'Submit')}
      >
        {loading ? (
          <span>{t('word.submitting', 'Submitting...')}</span>
        ) : (
          <span>{t('word.submit', 'Submit')}</span>
        )}
      </Button>
    </div>
  );
};
//register all components in this file
// registerPackageModule({ RadioActionInput });
