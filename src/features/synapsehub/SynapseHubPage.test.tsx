import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import SynapseHubPage from './SynapseHubPage';
import { decodeWorkspace, STORAGE_KEY } from './workspace';
const mount = () =>
  render(
    <MemoryRouter>
      <SynapseHubPage />
    </MemoryRouter>,
  );
describe('SynapseHub vertical slice', () => {
  it('captures evidence, derives a task, edits and completes it, and restores after remount', async () => {
    const user = userEvent.setup();
    const view = mount();
    await user.click(screen.getByRole('button', { name: /quick capture/i }));
    await user.selectOptions(screen.getByLabelText('Type'), 'source');
    await user.type(screen.getByLabelText('Title'), 'Lecture excerpt');
    await user.type(
      screen.getByLabelText(/source excerpt \(paste/i),
      'Current is conserved at a junction.',
    );
    await user.click(screen.getByRole('button', { name: 'Save source' }));
    await user.click(
      screen.getByRole('button', { name: /lecture excerpt source/i }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Create linked task' }),
    );
    expect(screen.getByLabelText('Content')).toHaveValue(
      'Current is conserved at a junction.',
    );
    await user.type(screen.getByLabelText('Title'), 'Practice Kirchhoff');
    fireEvent.change(screen.getByLabelText('Due date'), {
      target: { value: '2026-10-30' },
    });
    await user.click(screen.getByRole('button', { name: 'Save task' }));
    await user.click(
      screen.getByRole('button', { name: /Practice Kirchhoff task/i }),
    );
    const details = screen.getByRole('complementary', { name: 'Item details' });
    expect(
      within(details).getByRole('button', {
        name: /Derived from Lecture excerpt/i,
      }),
    ).toBeInTheDocument();
    await user.click(
      within(details).getByRole('button', { name: 'Edit item' }),
    );
    await user.clear(screen.getByLabelText('Edit title'));
    await user.type(screen.getByLabelText('Edit title'), 'Solve five problems');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await user.click(
      screen.getByRole('checkbox', { name: 'Complete Solve five problems' }),
    );
    expect(
      decodeWorkspace(localStorage.getItem(STORAGE_KEY)).relations,
    ).toHaveLength(1);
    view.unmount();
    mount();
    expect(
      screen.getByRole('checkbox', { name: 'Complete Solve five problems' }),
    ).toBeChecked();
  });
  it('handles empty search and keyboard capture without changing data', async () => {
    const user = userEvent.setup();
    mount();
    await user.type(screen.getByLabelText('Search workspace'), 'not present');
    expect(screen.getByText('No matching items')).toBeInTheDocument();
    await user.keyboard('{Control>}k{/Control}');
    expect(screen.getByLabelText('Title')).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
  it('shows a recovery warning and never overwrites corrupt data', async () => {
    localStorage.setItem(STORAGE_KEY, '{bad');
    mount();
    expect(screen.getByRole('alert')).toHaveTextContent(
      /not been overwritten/i,
    );
    await userEvent.click(
      screen.getByRole('button', { name: /quick capture/i }),
    );
    expect(screen.getByRole('button', { name: 'Save task' })).toBeDisabled();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{bad');
  });
});
