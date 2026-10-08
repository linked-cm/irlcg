import { useTranslate } from '@tolgee/react';
import { Button } from '@_linked/primitives/components/Button';
import { Combobox } from '@_linked/primitives/components/Combobox';
import { Dialog } from '@_linked/primitives/components/Dialog';
import { Input } from '@_linked/primitives/components/Input';
import { Textarea } from '@_linked/primitives/components/Textarea';
import React, { useRef, useState } from 'react';
import {
  ActionOption,
  type ActionOptionResult,
} from '../shapes/ActionOption.js';
import style from './BonusActionInput.module.css';

interface BonusActionInputProps {
  actionOptions: ActionOptionResult[];
  previousBonusActions?: ActionOptionResult[];
  onSelected?: (template: ActionOptionResult) => void;
  onQuantityChanged?: (quantity: number) => void;
  selected?: ActionOptionResult;
  quantity?: number;
}

export const BonusActionInput = ({
  actionOptions,
  onSelected,
  selected,
  quantity,
  previousBonusActions,
  onQuantityChanged,
}: BonusActionInputProps) => {
  const { t } = useTranslate();

  const triggerRef = useRef<HTMLButtonElement>(null);
  const [showModal, setShowModal] = useState(false);
  const [actionNameFilled, setActionNameFilled] = useState(false);
  const [customTemplate, setCustomTemplate] =
    useState<ActionOptionResult>(null);

  const setSelectedTemplate = (template: ActionOptionResult) => {
    onSelected(template);
    //if the user did not fill in a quantity already, we set it to 1 when they select an option
    if (!quantity || quantity < 0) {
      onQuantityChanged(1);
    }
    if (quantity > 10) {
      onQuantityChanged(10);
    }
  };

  // check if points value is valid
  const isValidPoints = (points: number): boolean => {
    return points !== null && points !== undefined && !isNaN(Number(points));
  };

  // find template in previous bonus actions
  const findTemplateInPreviousActions = (value: string) => {
    return previousBonusActions?.find(
      (action: ActionOptionResult) => action.id === value
    );
  };

  // handle option selection for bonus actions
  const onOptionSelected = async (selectedOption: any) => {
    if (!selectedOption) return;

    if (selectedOption.value === 'add_your_own') {
      setShowModal(true);
      return;
    }

    // get the template from actionOptions first
    let template = actionOptions.find(
      (action: ActionOptionResult) => action.id === selectedOption.value
    );

    // if not found in actionOptions, try previousBonusActions (custom templates)
    if (!template) {
      template = findTemplateInPreviousActions(selectedOption.value);
    }

    // if template has invalid points, try to find it in previousBonusActions
    if (template && !isValidPoints(template.points)) {
      template =
        findTemplateInPreviousActions(selectedOption.value) ?? template;
    }

    if (template) {
      setSelectedTemplate(template);
    }
  };

  const addPeaceAction = async () => {
    if (peaceActionValue.actionName == '') {
      setActionNameFilled(true);
      return;
    } else {
      const customTemplate: ActionOptionResult = await ActionOption.create({
        name: peaceActionValue.actionName,
        description: peaceActionValue.description,
        isCustom: true,
        isBonus: true,
        points: 1,
      });

      setCustomTemplate(customTemplate);
      setSelectedTemplate(customTemplate);
      setShowModal(false);
    }
  };

  let arrayOfBonuses = [];
  const [peaceActionValue, setPeaceActionValue] = useState({
    actionName: '',
    description: '',
  });

  arrayOfBonuses = actionOptions
    .filter((action: ActionOptionResult) => action.isBonus)
    .map((action) => {
      return actionTemplateToOption(action, t);
    });

  //add the previous bonus actions to the array, after converting them to options
  if (previousBonusActions) {
    arrayOfBonuses = arrayOfBonuses.concat(
      previousBonusActions.map((action) => actionTemplateToOption(action, t))
    );
  }

  //if user filled in custom option
  if (customTemplate) {
    arrayOfBonuses.push(actionTemplateToOption(customTemplate, t));
  }

  arrayOfBonuses.push({
    value: 'add_your_own',
    label: t('word.addYourOwn', 'Add your own... +'),
  });
  // }

  return (
    <div className={style.BonusActionInput}>
      <div className={style.bonusPoints}>
        <label>{t('word.bonus', 'Bonus')}</label>
        <Input
          maxLength={2}
          value={
            !isNaN(quantity) && quantity > 0
              ? quantity > 10
                ? '10'
                : quantity.toString()
              : ''
          }
          onChange={(e) => onQuantityChanged(Number(e.target.value))}
          className={style.bonusInput}
          aria-label={t('bonusActionInput.quantity', 'Quantity')}
        />
      </div>
      <Combobox.Root
        className={style.select}
        value={selected?.id ?? ''}
        displayValue={
          arrayOfBonuses.find((option) => option.value === selected?.id)
            ?.label ??
          selected?.name ??
          ''
        }
        onValueChange={(value) => {
          if (value === 'add_your_own') {
            setShowModal(true);
            return;
          }
          onOptionSelected({ value });
        }}
      >
        <Combobox.Trigger
          ref={triggerRef}
          aria-label={t('bonusActionInput.select', 'Select bonus action')}
          placeholder={t('bonusActionInput.select', 'Select bonus action')}
        />
        <Combobox.Content>
          <Combobox.Input
            placeholder={t(
              'bonusActionInput.search',
              'Search bonus actions'
            )}
          />
          <Combobox.List>
            <Combobox.Empty>
              {t('bonusActionInput.noActions', 'No actions found')}
            </Combobox.Empty>
            {arrayOfBonuses.map((option) => (
              <Combobox.Item
                key={option.value}
                value={option.value}
                keywords={[option.label, option.description].filter(
                  (part): part is string => Boolean(part)
                )}
              >
                {option.value === 'add_your_own' ? (
                  <span className={style.addYourOwnPeaceAction}>
                    {option.label}
                  </span>
                ) : (
                  <div className={style.selectOptionListItem}>
                    <h3>{option.label}</h3>
                    {option.description && <p>{option.description}</p>}
                  </div>
                )}
              </Combobox.Item>
            ))}
          </Combobox.List>
        </Combobox.Content>
      </Combobox.Root>
      <Dialog.Root
        open={showModal}
        onOpenChange={(open) => setShowModal(open)}
      >
        <Dialog.Content
          className={style.actionModal}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef.current?.focus();
          }}
        >
          <Dialog.Title>
            {t('bonusActionInput.addYourAction', 'Add Your Peace Action')}
          </Dialog.Title>
          <label>
            {t('bonusActionInput.actionName', 'Action Name').toUpperCase()}
          </label>
          <Input
            maxLength={30}
            value={peaceActionValue.actionName}
            onChange={(e) => {
              setActionNameFilled(false);
              setPeaceActionValue({
                ...peaceActionValue,
                actionName: e.target.value,
              });
            }}
            aria-invalid={actionNameFilled}
            aria-label={t('bonusActionInput.actionName', 'Action Name')}
          />
          {actionNameFilled && (
            <p className={style.helperText}>
              {t(
                'bonusActionInput.actionNameRequired',
                'Please fill in an action name!'
              )}
            </p>
          )}
          <label>
            {t(
              'bonusActionInput.shortDescription',
              'Short Description'
            ).toUpperCase()}
          </label>
          <Textarea
            maxLength={180}
            className={style.textArea}
            value={peaceActionValue.description}
            onChange={(e) => {
              setPeaceActionValue({
                ...peaceActionValue,
                description: e.target.value,
              });
            }}
            aria-label={t(
              'bonusActionInput.shortDescription',
              'Short Description'
            )}
          />
          <Button
            type="button"
            variant="outline"
            className={style.addButton}
            onClick={addPeaceAction}
          >
            {t('bonusActionInput.addAction', 'Add')}
          </Button>
          <Dialog.Description className={style.note}>
            {t(
              'bonusActionInput.note',
              'When creating a Peace Action make sure that it meets or exceeds the current actions in this category. Assign your new action the value of 1 Peace Action. (We will be reviewing all bonus actions and adding some to the bonus section for all players.)'
            )}
          </Dialog.Description>
        </Dialog.Content>
      </Dialog.Root>
    </div>
  );
};

function actionTemplateToOption(
  // action:
  //   | QResult<Topic, { description: string; name: string; identifier: string }>
  //   | ActionTemplate,
  action: ActionOptionResult,
  t
) {
  return {
    value: action.id,
    description:
      action.description &&
      t(action.identifier + '.description', action.description),
    label: t(
      action.identifier + '.name',
      action.name?.replace(/(^\w{1})|(\s+\w{1})/g, (letter) =>
        letter.toUpperCase()
      )
    ),
    points: action.points,
    isBonus: action.isBonus,
    isCustom: action.isCustom,
  };
}
