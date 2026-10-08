// @vitest-environment happy-dom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const create = vi.hoisted(() => vi.fn());

vi.mock('@tolgee/react', () => ({
  useTranslate: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

vi.mock('../../src/shapes/ActionOption.js', () => ({
  ActionOption: {
    create,
  },
}));

import { BonusActionInput } from '../../src/components/BonusActionInput.js';

const planted = {
  id: 'option-plant',
  name: 'plant a tree',
  description: 'Plant something living',
  identifier: 'plant',
  isBonus: true,
  points: 1,
};

afterEach(() => {
  cleanup();
  create.mockReset();
});

function renderInput(
  props: Partial<React.ComponentProps<typeof BonusActionInput>> = {}
) {
  const onSelected = vi.fn();
  const onQuantityChanged = vi.fn();
  render(
    <BonusActionInput
      actionOptions={[planted]}
      onSelected={onSelected}
      onQuantityChanged={onQuantityChanged}
      {...props}
    />
  );
  return { onSelected, onQuantityChanged };
}

async function openAddDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('combobox', { name: 'Select bonus action' }));
  await user.click(await screen.findByText('Add your own... +'));
  return screen.findByRole('dialog', { name: 'Add Your Peace Action' });
}

describe('BonusActionInput', () => {
  it('keeps the quantity field controlled and reports a number', () => {
    const { onQuantityChanged } = renderInput({ quantity: 4 });
    const quantity = screen.getByRole('textbox', { name: 'Quantity' });

    expect(quantity).toHaveProperty('value', '4');
    fireEvent.change(quantity, { target: { value: '7' } });
    expect(onQuantityChanged).toHaveBeenCalledWith(7);
  });

  it('selects an existing bonus action', async () => {
    const user = userEvent.setup();
    const { onSelected, onQuantityChanged } = renderInput();

    await user.click(screen.getByRole('combobox', { name: 'Select bonus action' }));
    await user.click(await screen.findByText('Plant A Tree'));

    expect(onSelected).toHaveBeenCalledWith(planted);
    expect(onQuantityChanged).toHaveBeenCalledWith(1);
  });

  it('keeps the custom name and description controlled', async () => {
    const user = userEvent.setup();
    create.mockResolvedValue({
      id: 'custom-1',
      name: 'Walk together',
      description: 'A short walk',
      isCustom: true,
      isBonus: true,
      points: 1,
    });
    const { onSelected } = renderInput();
    await openAddDialog(user);

    const name = screen.getByRole('textbox', { name: 'Action Name' });
    const description = screen.getByRole('textbox', { name: 'Short Description' });
    await user.type(name, 'Walk together');
    await user.type(description, 'A short walk');

    expect(name).toHaveProperty('value', 'Walk together');
    expect(description).toHaveProperty('value', 'A short walk');

    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(create).toHaveBeenCalledWith({
      name: 'Walk together',
      description: 'A short walk',
      isCustom: true,
      isBonus: true,
      points: 1,
    });
    expect(onSelected).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'custom-1', name: 'Walk together' })
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('asks for a name before creating a custom action', async () => {
    const user = userEvent.setup();
    renderInput();
    await openAddDialog(user);

    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByText('Please fill in an action name!')).toBeTruthy();
    expect(
      screen.getByRole('textbox', { name: 'Action Name' }).getAttribute('aria-invalid')
    ).toBe('true');
    expect(create).not.toHaveBeenCalled();
  });

  it('opens an accessible dialog and restores focus when it closes', async () => {
    const user = userEvent.setup();
    renderInput();
    const trigger = screen.getByRole('combobox', { name: 'Select bonus action' });
    const dialog = await openAddDialog(user);

    expect(dialog.textContent).toContain('Add Your Peace Action');
    expect(dialog.contains(document.activeElement)).toBe(true);

    const name = screen.getByRole('textbox', { name: 'Action Name' });
    name.focus();
    await user.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('closes from the close button and from the overlay', async () => {
    const user = userEvent.setup();
    renderInput();
    let dialog = await openAddDialog(user);

    await user.click(dialog.querySelector('button.Close') as HTMLButtonElement);
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByRole('combobox', { name: 'Select bonus action' })
      );
    });

    await openAddDialog(user);
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.querySelector('.Overlay')?.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        button: 1,
        pointerId: 1,
      })
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
