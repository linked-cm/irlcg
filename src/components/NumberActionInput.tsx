import { useTranslate } from '@tolgee/react';
import { useAuth } from '@_linked/auth/hooks/useAuth';
import { UserAccountData, UserData } from '@_linked/auth/types/auth';
import { Button } from '@_linked/primitives/components/Button';
import { Dialog } from '@_linked/primitives/components/Dialog';
import { QResult } from '@_linked/core/queries/SelectQuery';
import { asset } from '@_linked/core/utils/LinkedFileStorage';
import React, { useEffect, useState } from 'react';
import Confetti from 'react-confetti';
import type { ActionOptionResult } from '../shapes/ActionOption.js';
import { EventTeam } from '../shapes/EventTeam.js';
import { Team, type TeamWithEvents } from '../shapes/Team.js';
import { withRetry } from '../utils/helper.js';
import { BonusActionInput } from './BonusActionInput.js';
import style from './NumberActionInput.module.css';
import { SubmitAsSubPlayer } from './SubmitAsSubPlayer.js';
import type { ActionResult } from '../shapes/Action.js';
import { ActionTotal } from '../shapes/ActionTotal.js';
import {
  type ActionsQuantityMap,
  ActionSubmission,
  type SubmitResponse,
  type SubmitSuccessResult,
} from '../shapes/ActionSubmission.js';

const loadedactionTotal = new Map<string, Promise<any>>();
const MAX_ACTION_QUANTITY = 10;

interface NumberActionInputProps {
  action: ActionResult;
  actionOptions: ActionOptionResult[];
  onScoreUpdated: (newScore: any) => void;
  teamChange: any;
  withImageUpload?: boolean;
  currentTeam: TeamWithEvents;
  isTeamLeader?: boolean; // Optional prop to avoid duplicate API calls
}

export const NumberActionInput = ({
  action,
  actionOptions,
  onScoreUpdated,
  teamChange,
  withImageUpload,
  currentTeam,
  isTeamLeader: propIsTeamLeader,
}: NumberActionInputProps) => {
  const auth = useAuth();
  const account = auth.userAccount;
  const user = auth.user;
  const isEventMode = Team.getIsEventMode(currentTeam);

  const [medalScore, setMedalScore] = useState<number>(null);
  const [scorePreview, setScorePreview] = useState<number>();
  const [bonusQuantity, setBonusQuantity] = useState<number>();
  const [formData, setFormData] = useState([]);
  const [finishedGameModal, setFinishedGameModal] = useState(false);
  const [submittedPointsMessage, setSubmittedPointsMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedSubPlayer, setSelectedSubPlayer] =
    useState<UserAccountData>(account);
  const [previousBonusActions, setPreviousBonusActions] = useState<
    ActionOptionResult[]
  >([]);
  const [selectedBonusAction, setSelectedBonusAction] =
    useState<ActionOptionResult>(null);
  const [submitCounter, setSubmitCounter] = useState<number>(0);
  const [actionTotal, setActionTotal] = useState<ActionTotal>(null);
  const [quantityLimitWarnings, setQuantityLimitWarnings] = useState<
    Record<number, boolean>
  >({});

  // Use prop from parent (ShareActionDetails) to avoid duplicate API calls
  // Default to false if not provided
  const isTeamLeader = propIsTeamLeader ?? false;

  useEffect(() => {
    setSelectedSubPlayer(account);
  }, [account.id, teamChange?.id]);

  useEffect(() => {
    // Wait for team to be available (e.g. after Query resolves) so we don't throw or create with undefined team
    if (!teamChange?.id || !currentTeam) {
      return;
    }
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
            { id: action.id },
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
      if (actionTotal) {
        setMedalScore(actionTotal.score);
        setActionTotal(actionTotal);
      }
    };
    getActionTotal();
  }, [
    selectedSubPlayer,
    teamChange,
    currentTeam,
    action.id,
    action.identifier,
  ]);

  useEffect(() => {
    // and convert `UserAccountData` to `UserData` format
    const subPlayer = {
      id: selectedSubPlayer.accountOf.id,
    };
    ActionSubmission.getActionSubmissionByAction(action, subPlayer).then(
      (response) => {
        //collect all the custom bonus actions previousy submitted
        setPreviousBonusActions(response?.customActionTemplates);

        // NumberActionInput: keep form empty - existing score shows via medalScore from ActionTotal.
        // Only RadioActionInput pre-populates the selected option. This avoids mismatch when
        // ActionTotal has score but getActionSubmissionByAction returns empty/different data.
        const nonBonusOptions = actionOptions.filter(
          (t) => !(t as any).isBonus
        );
        const initialFormData = nonBonusOptions.map((actionOption) => ({
          templateUri: actionOption.id,
          value: '',
          point: actionOption.points,
        }));
        setFormData(initialFormData);
      }
    );
  }, [selectedSubPlayer, teamChange, submitCounter, actionOptions]);

  const parseValue = (value: any): number => {
    if (typeof value === 'number') {
      return value;
    } else if (typeof value === 'string') {
      const parsedValue = parseFloat(value);
      return isNaN(parsedValue) ? 0 : parsedValue;
    } else {
      return 0;
    }
  };

  const parseQuantityInput = (value: string): string => {
    if (!/^\d*$/.test(value)) {
      return '';
    }
    if (value === '') {
      return '';
    }
    return Math.min(parseInt(value, 10), MAX_ACTION_QUANTITY).toString();
  };

  const handleFormChange = (formId, templateUri, value, point) => {
    setFormData((prevData) => {
      const newData = [...prevData];
      newData[formId] = {
        ...newData[formId],
        templateUri: templateUri,
        value: value,
        point: point,
      };
      return newData;
    });
  };

  const renderForms = () => {
    return actionOptions
      .filter((t) => !(t as any).isBonus)
      .map((actionOption, index) => {
        const inputId = `number-action-input-${actionOption.id}-${index}`;
        return (
          <React.Fragment key={actionOption.id}>
            <div className={style.ActionTemplate}>
              <input
                type={'text'}
                id={inputId}
                className={style.TextField}
                value={formData[index]?.value || ''}
                onChange={(e) => {
                  const rawValue = e.target.value;
                  const isOverLimit =
                    /^\d+$/.test(rawValue) &&
                    parseInt(rawValue, 10) > MAX_ACTION_QUANTITY;
                  setQuantityLimitWarnings((warnings) => ({
                    ...warnings,
                    [index]: isOverLimit,
                  }));

                  const quantity = parseQuantityInput(rawValue);
                  if (quantity || rawValue === '') {
                    handleFormChange(
                      index,
                      actionOption.id,
                      quantity,
                      actionOption.points
                    );
                  }
                }}
                aria-label={actionOption.name}
                max={MAX_ACTION_QUANTITY}
                pattern="\d*"
                inputMode="numeric"
              />
              <label htmlFor={inputId}>
                {t(
                  (actionOption as any).identifier + '.name',
                  actionOption.name
                )}
              </label>
            </div>
            {quantityLimitWarnings[index] && (
              <div className={style.limitHint}>
                {t(
                  'numberActionInput.submitLimitHint',
                  'Max 10 at a time. You can submit again for more actions.'
                )}
              </div>
            )}
          </React.Fragment>
        );
      });
  };

  const submitAction = async () => {
    setLoading(true);
    let actionQuantityMap: ActionsQuantityMap = new Map();

    formData.forEach((data) => {
      const quantity = Math.min(parseValue(data?.value), MAX_ACTION_QUANTITY);
      if (data?.value && quantity > 0) {
        const template = actionOptions.find((t) => t.id === data.templateUri);
        if (template) actionQuantityMap.set(template, quantity);
      }
    });
    const previousScore = Number(actionTotal?.score || 0);
    if (selectedBonusAction) {
      // for custom templates, use selectedBonusAction directly
      // for regular templates, try to find in actionOptions first
      let template = actionOptions.find((t) => t.id === selectedBonusAction.id);

      // if not found (custom template), use selectedBonusAction directly
      if (!template) {
        template = selectedBonusAction;
      }
      const updatedBonusQuantity =
        +bonusQuantity > 0 && +bonusQuantity > MAX_ACTION_QUANTITY
          ? MAX_ACTION_QUANTITY
          : +bonusQuantity;
      if (updatedBonusQuantity > 0) {
        actionQuantityMap.set(template, updatedBonusQuantity);
      }
    }

    try {
      const result: SubmitResponse = await withRetry(() =>
        ActionSubmission.submit(
          action,
          actionQuantityMap,
          false,
          selectedSubPlayer
        )
      );
      if (result && 'error' in result) {
        alert(result.error);
        return;
      }

      // submit success
      if (onScoreUpdated && result && 'actionTotal' in result) {
        const successResult = result as SubmitSuccessResult;
        console.log(
          `Received updated action total: ${successResult.actionTotal.id} - score: ${successResult.actionTotal.score} - medal ${successResult.actionTotal.medal}`
        );

        // update the cache with the new action total
        const event = currentTeam?.attendsEvents?.[0];
        const key = `${selectedSubPlayer.id}-${teamChange.id}-${
          action.identifier
        }${event?.id ? `-${event.id}` : ''}`;
        loadedactionTotal.set(key, Promise.resolve(successResult.actionTotal));

        onScoreUpdated(successResult.actionTotal);
        setMedalScore(successResult.actionTotal.score);
        setActionTotal(successResult.actionTotal as any);
        setSubmitCounter(submitCounter + 1);

        if (successResult.justFinishedGame) {
          setFinishedGameModal(successResult.justFinishedGame);
        } else {
          const nextScore = Number(
            successResult.actionTotal?.score || previousScore
          );
          const scoreDelta = nextScore - previousScore;
          const youHave = t('numberActionInput.youHave', 'You have');
          const removed = t('numberActionInput.removed', 'removed');
          const earned = t('numberActionInput.earned', 'earned');
          const num = Math.abs(Number.isFinite(scoreDelta) ? scoreDelta : 0);
          const actionLabel =
            num === 1
              ? t('word.action', 'Action')
              : t('numberActionInput.points', 'Actions');
          const forText = t('numberActionInput.for', 'for');

          setSubmittedPointsMessage(
            `${youHave} ${
              scoreDelta < 0 ? removed : earned
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
      setFormData([]);
      setScorePreview(undefined);
      setQuantityLimitWarnings({});
      setSelectedBonusAction(null);
      setBonusQuantity(undefined);
    } catch (error) {
      console.error('Error submitting action:', error);
      alert(
        t(
          'numberActionInput.submitErrorMessage',
          'With so many Peace Actions being submitted I got a little flustered. Bear with us and kindly resubmit your action(s) again in a few moments.'
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const subPlayerHandler = (playerData: UserAccountData) => {
    setSelectedSubPlayer(playerData);
  };

  let { t } = useTranslate();

  const onBonusTemplateSelected = (template: ActionOptionResult) => {
    setSelectedBonusAction(template);
  };

  const updateScorePreview = async () => {
    let total = formData.reduce((acc, formData) => {
      if (formData && formData.value && formData.point != null) {
        const quantity = parseValue(formData.value);
        const limitedQuantity = Math.min(quantity, MAX_ACTION_QUANTITY);
        const points = parseValue(formData.point);
        const formTotal = limitedQuantity * points;
        return acc + formTotal;
      }
      return acc;
    }, 0);
    if (selectedBonusAction && bonusQuantity) {
      //make sure bonusQuantity is no bigger than 10
      let updatedBonusQuantity =
        +bonusQuantity > 0 && +bonusQuantity > MAX_ACTION_QUANTITY
          ? MAX_ACTION_QUANTITY
          : +bonusQuantity;
      if (updatedBonusQuantity !== bonusQuantity) {
        setBonusQuantity(updatedBonusQuantity);
      }

      // Ensure points is a valid number, default to 1 if undefined
      const bonusPoints = parseValue(selectedBonusAction.points) || 1;
      total += bonusPoints * updatedBonusQuantity;
    }
    setScorePreview(total);
  };

  useEffect(() => {
    updateScorePreview();
  }, [formData, bonusQuantity, selectedBonusAction]);

  return (
    <>
      {isTeamLeader && (
        <SubmitAsSubPlayer
          onSubPlayerSelected={subPlayerHandler}
          selectedSubPlayer={selectedSubPlayer}
          teamId={teamChange?.id}
        />
      )}

      <div className={style.NumberActionInput}>
        {renderForms()}
        {!isEventMode && (
          <BonusActionInput
            actionOptions={actionOptions}
            selected={selectedBonusAction}
            quantity={bonusQuantity}
            onSelected={onBonusTemplateSelected}
            onQuantityChanged={(quantity) =>
              setBonusQuantity(parseInt(quantity.toString()))
            }
            previousBonusActions={previousBonusActions}
            key={submitCounter}
            aria-label={t(
              'numberActionInput.bonusActionInput',
              'Bonus Action Input'
            )}
          />
        )}
        {/* {withImageUpload && topicScore && (
          <div style={{paddingTop: '15px'}}>
            <ImageUpload
              uploadUrl={`${
                process.env.SITE_ROOT
              }/call/${packageName}/uploadImage?topicScore=${
                topicScore.uri
              }&property=images&subPlayer=${
                selectedSubPlayer?.uri || user?.uri
              }`}
              of={topicScore}
              subPlayer={selectedSubPlayer}
              property={'images'}
              limit={6}
              onCallback={(updatedTopicScore) => {
                onScoreUpdated(updatedTopicScore);
                setMedalScore(updatedTopicScore.score);
                setSubmitCounter(submitCounter + 1);
              }}
            />
          </div>
        )} */}
        <b>{t('word.peaceActions', 'Peace Actions')}</b>
        <div className={style.ActionScore}>
          <input
            className={style.TextField}
            value={scorePreview || 0}
            readOnly
            aria-label={t('numberActionInput.scorePreview', 'Score Preview')}
          />
          {medalScore != 0 && (
            <p>
              + {medalScore} ={' '}
              {medalScore && scorePreview != null
                ? Number(medalScore) + Number(scorePreview)
                : 0}
            </p>
          )}
        </div>
        <div className={style.centered}>
          <Button type="button" variant="outline" onClick={submitAction} disabled={loading}>
            {loading ? (
              <span>{t('word.submitting', 'Submitting...')}</span>
            ) : (
              <span>{t('word.submit', 'Submit')}</span>
            )}
          </Button>
        </div>
      </div>
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
            {t('word.congratulations', 'Congratulations!')}
          </Dialog.Title>
          <Dialog.Description>
            {t(
              'numberActionInput.successMessageGame',
              'You have completed this game successfully!'
            )}
          </Dialog.Description>
          <Confetti />
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
              'numberActionInput.successMessage',
              'Score submitted successfully!'
            )}
          </Dialog.Title>
          <Dialog.Description>{submittedPointsMessage}</Dialog.Description>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
};

//register all components in this file
// registerPackageModule({ NumberActionInput });
