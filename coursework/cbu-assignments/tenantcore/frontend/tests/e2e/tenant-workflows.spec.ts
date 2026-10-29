import { expect, test } from '@playwright/test';

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole('heading', { name: /Good to see you/ })).toBeVisible();
}

test('tenant admin can create a real project', async ({ page }) => {
  await login(page);
  await page.getByRole('link', { name: 'Projects', exact: true }).click();
  await page.getByRole('button', { name: 'New project' }).click();
  const name = `Playwright Project ${Date.now()}`;
  await page.getByLabel('Project name').fill(name);
  await page.getByLabel('Description').fill('Created by the critical browser workflow test');
  await page.getByRole('button', { name: 'Create project', exact: true }).last().click();
  await expect(page.getByText(name, { exact: true })).toBeVisible();
});

test('isolation lab shows real hidden-row and tenant-switch denials', async ({ page }) => {
  await login(page);
  await page.getByRole('link', { name: 'Isolation lab' }).click();
  await page.getByTestId('isolation-hidden').click();
  await expect(page.getByTestId('isolation-hidden-result')).toContainText('HTTP 404');
  await page.getByTestId('isolation-switch').click();
  await expect(page.getByTestId('isolation-switch-result')).toContainText('HTTP 403');
});
