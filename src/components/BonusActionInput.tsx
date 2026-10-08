import { useTranslate } from '@tolgee/react';
import { InputField } from '@_linked/input/components/InputField';
import { Button } from '@_linked/mui-base/components/Button';
import { Modal } from '@_linked/mui-base/components/Modal';
import { asset } from '@_linked/core/utils/LinkedFileStorage';
import React, { useState } from 'react';
import Select from 'react-select';
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

  const [showModal, setShowModal] = useState(false);
  const [actionNameFilled, setActionNameFilled] = useState(false);
  const [customTemplate, setCustomTemplate] =
    useState<ActionOptionResult>(null);
  const [selectCounter, setSelectCounter] = useState<number>(0);

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

  // get bonus template
  const bonus = actionOptions?.filter((action: ActionOptionResult, i) =>
    Boolean(action.isBonus)
  );

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

  const onToggleModal = () => {
    setShowModal(!showModal);
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
    label: (
      <span
        className={style.addYourOwnPeaceAction}
        onClick={() => setShowModal(true)}
      >
        {t('word.addYourOwn', 'Add your own... +')}
      </span>
    ),
  });
  // }

  return (
    <div className={style.BonusActionInput}>
      <div className={style.bonusPoints}>
        <label>{t('word.bonus', 'Bonus')}</label>
        <InputField
          maxLength={2}
          value={
            !isNaN(quantity) && quantity > 0
              ? quantity > 10
                ? '10'
                : quantity.toString()
              : ''
          }
          onChange={(e) => onQuantityChanged(e.target.value)}
          className={style.bonusInput}
          aria-label={t('bonusActionInput.quantity', 'Quantity')}
        />
      </div>
      <Select
        key={selectCounter.toString()}
        options={bonus && arrayOfBonuses}
        isOptionSelected={(option) => {
          return (option as any).value === selected?.id;
        }}
        formatOptionLabel={(option: any, { context }) => {
          //This is bug fix, when the user clicks on add your own we change
          //the options, but select thinks add your own is still selected
          //so we render the right title in this case
          if (context === 'menu') {
            return (
              <div className={style.selectOptionListItem}>
                <h3>{option.label}</h3>
                {option.description && <p>{option.description}</p>}
              </div>
            );
          } else if (context === 'value') {
            return <span>{selected ? selected.name : option.label}</span>;
          }
          // if (
          //   selected &&
          //   selected.isCustom &&
          //   option.value === 'add_your_own'
          //   && option.description
          // ) {
          //   return <span>{selected.name}</span>;
          // }
          // if (
          //   selected &&
          //   selected.isCustom &&
          //   option.value === 'add_your_own'
          // ) {
          //   return <span>{selected.name}</span>;
          // }
          // return <span>{option.label}</span>;
        }}
        defaultValue={
          selected ? selected?.id : customTemplate ? customTemplate?.id : ''
        }
        defaultInputValue={
          selected ? selected?.id : customTemplate ? customTemplate?.id : ''
        }
        className={style.select}
        onChange={onOptionSelected}
        aria-label={t('bonusActionInput.select', 'Select bonus action')}
      />
      <Modal
        isOpen={showModal}
        backdrop="rgba(0, 0, 0, 0.8)"
        onClose={onToggleModal}
      >
        <div className={style.actionModal}>
          <img
            src={asset('/images/close_button.svg')}
            className={style.closeButton}
            onClick={() => setShowModal(false)}
            aria-label={t('bonusActionInput.close', 'Close')}
          />
          <h3>
            {t('bonusActionInput.addYourAction', 'Add Your Peace Action')}
          </h3>
          <label>
            {t('bonusActionInput.actionName', 'Action Name').toUpperCase()}
          </label>
          <InputField
            maxLength={30}
            onChange={(e) => {
              setActionNameFilled(false);
              setPeaceActionValue({
                ...peaceActionValue,
                actionName: e.target.value,
              });
            }}
            helperText={
              actionNameFilled &&
              t(
                'bonusActionInput.actionNameRequired',
                'Please fill in an action name!'
              )
            }
            aria-label={t('bonusActionInput.actionName', 'Action Name')}
          />
          <label>
            {t(
              'bonusActionInput.shortDescription',
              'Short Description'
            ).toUpperCase()}
          </label>
          <InputField
            maxLength={180}
            className={style.textArea}
            multiline
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
            variant="outlined"
            fullWidth={false}
            className={style.addButton}
            onClick={addPeaceAction}
          >
            {t('bonusActionInput.addAction', 'Add')}
          </Button>
          <p className={style.note}>
            {t(
              'bonusActionInput.note',
              'When creating a Peace Action make sure that it meets or exceeds the current actions in this category. Assign your new action the value of 1 Peace Action. (We will be reviewing all bonus actions and adding some to the bonus section for all players.)'
            )}
          </p>
        </div>
      </Modal>
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
