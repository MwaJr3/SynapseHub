import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { ApiError } from '../services/api';
import { ConfirmDialog, ErrorState, StatusBadge } from './ui';

test('destructive confirmation invokes the real confirm and cancel callbacks', async () => {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  render(<ConfirmDialog title="Archive tenant?" description="This is terminal." onConfirm={onConfirm} onClose={onClose} />);
  await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
  expect(onConfirm).toHaveBeenCalledOnce();
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(onClose).toHaveBeenCalled();
});

test('permission and service failures expose useful request evidence', () => {
  render(<ErrorState error={new ApiError(403, 'TENANT_ACCESS_DENIED', 'Organization access was denied', 'request-123')} />);
  expect(screen.getByText('Permission denied')).toBeInTheDocument();
  expect(screen.getByText(/request-123/)).toBeInTheDocument();
});

test('tenant status is visibly communicated', () => {
  render(<StatusBadge status="suspended" />);
  expect(screen.getByText('suspended')).toBeInTheDocument();
});
