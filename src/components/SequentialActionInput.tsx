/*
 * NOTE: SequentialActionInput has been refactored to accept actionTemplates as props
 * instead of using internal queries. This component needs better testing as it's not
 * currently used anywhere in the application. Consider adding bonus action support
 * and ensuring proper template resolution for custom templates.
 */
import { useTranslate } from '@tolgee/react';
import { Button } from '@_linked/mui-base/components/Button';
import { ShapeSet } from '@_linked/core/collections/ShapeSet';
import cl from 'classnames';
import React, { useEffect, useState } from 'react';
import type { ActionOptionResult } from '../shapes/ActionOption.js';
import {
  type ActionsQuantityMap,
  ActionSubmission,
  type ActionSubmissionResult,
  type SubmitResponse,
  type SubmitSuccessResult,
} from '../shapes/ActionSubmission.js';
import type { ActionTotalResult } from '../shapes/ActionTotal.js';
import style from './SequentialActionInput.module.css';
import { withRetry } from '../utils/helper.js';

interface SequentialActionInputProps {
  actionTotal: ActionTotalResult;
  actionOptions: ActionOptionResult[];
  onSubmitted: (
    actionTotal: ActionTotalResult,
    actions: ActionSubmissionResult[],
    justFinishedGame: boolean
  ) => void;
}

export const SequentialActionInput = ({
  actionTotal,
  actionOptions,
  onSubmitted,
}: SequentialActionInputProps) => {
  const [checkedItems, setCheckedItems] = useState([]);
  const [disabledCheckbox, setDisabledCheckbox] = useState({});
  const [loading, setLoading] = useState(false);
  const { t } = useTranslate();

  useEffect(() => {
    ActionSubmission.getActionSubmissionByAction(actionTotal).then(
      (response) => {
        const newTemplates = {};
        response.actionSubmissions.forEach((item) => {
          setCheckedItems((prev) => [...prev, item.objects.first().uri]);
          newTemplates[item.objects.first().uri] = true;
        });
        setDisabledCheckbox(newTemplates);
      }
    );
  }, []);

  const selectTemplate = (event, index) => {
    const checkedValue = event.target.value;
    const isChecked = event.target.checked;

    if (isChecked) {
      setCheckedItems([...checkedItems, checkedValue]);

      //TODO :@abhi, I dont think this is needed? .disabled is never used anywhere?

      // //disable or enable checkbox
      // actionTemplates.forEach((singleCheckbox, i, array) => {
      //   const lastItem = i === array.length - 1;
      //
      //   if (i === index && !lastItem) {
      //     let nextCheckbox = actionTemplates[i + 1];
      //
      //     nextCheckbox.disabled = false;
      //   }
      // });
    } else {
      setCheckedItems(checkedItems.filter((item) => item !== checkedValue));

      //disable or enable checkbox
      // actionTemplates.forEach((singleCheckbox, i, array) => {
      //   const firstItem = i === 0;
      //   if (firstItem) {
      //     return;
      //   }
      //   if (i > index && index !== array.length - 1) {
      //     singleCheckbox.disabled = true;
      //   }
      // });
    }
  };

  const submitAction = async () => {
    let actionQuantityMap: ActionsQuantityMap = new Map();

    checkedItems.forEach((templateId: string) => {
      // Find template in actionTemplates instead of using getFromURI
      let template = actionOptions.find((t) => t.id === templateId);
      if (template) {
        actionQuantityMap.set(template, 1);
      } else {
        console.warn(`Template not found for id: ${templateId}`);
      }
    });

    setLoading(true);

    try {
      const result: SubmitResponse = await withRetry(() =>
        ActionSubmission.submit(actionTotal, actionQuantityMap, true)
      );

      // submit success
      if (onSubmitted && result && 'actionTotal' in result) {
        const successResult = result as SubmitSuccessResult;
        onSubmitted(
          successResult.actionTotal,
          successResult.actions,
          successResult.justFinishedGame
        );
      }
    } catch (error) {
      console.error('Error submitting action:', error);
      alert(
        t(
          'sequentialActionInput.submitErrorMessage',
          'With so many Peace Actions being submitted I got a little flustered. Bear with us and kindly resubmit your action(s) again in a few moments.'
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    // checkbox group wrapper
    <div
      className={style.wrapper}
      aria-label={t('sequentialActionInput.wrapper', 'Sequential Action Input')}
    >
      {actionOptions.map((actionOption, index) => {
        // checkbox item when checked
        const isChecked = checkedItems.includes(actionOption.id)
          ? style.isChecked
          : null;

        // checkbox item when disabled
        const isDisabled = disabledCheckbox[actionOption.id]
          ? style.isDisabled
          : null;

        return (
          // checkbox item
          <div
            key={actionOption.id}
            className={cl(style.item, isChecked)}
            aria-label={t(actionOption.identifier + '.name', actionOption.name)}
          >
            <label className={style.label}>
              <input
                type={'checkbox'}
                key={actionOption.id}
                value={actionOption.id}
                checked={checkedItems.includes(actionOption.id)}
                onChange={(event) => selectTemplate(event, index)}
                disabled={disabledCheckbox[actionOption.id]}
                className={cl(style.checkbox, isDisabled)}
                aria-checked={checkedItems.includes(actionOption.id)}
                aria-disabled={disabledCheckbox[actionOption.id]}
              />
              <span>
                {t(actionOption.identifier + '.name', actionOption.name)}
              </span>
            </label>
          </div>
        );
      })}
      <Button
        variant="outlined"
        onClick={submitAction}
        className={style.center}
        disabled={loading}
        aria-label={t('word.submitButton', 'Submit Button')}
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
// registerPackageModule({ SequentialActionInput });
