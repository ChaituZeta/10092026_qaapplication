import { test as base, Page } from '@playwright/test';
import { getMockSession } from './test-data';

type AuthFixtures = {
  authenticatedPage: Page;
  adminPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Seed authenticated user active_app_session state into localStorage before navigation
    await page.addInitScript((session) => {
      window.localStorage.setItem('active_app_session', JSON.stringify(session));
    }, getMockSession('user'));

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await use(page);
  },

  adminPage: async ({ page }, use) => {
    // Seed admin active_app_session state into localStorage before navigation
    await page.addInitScript((session) => {
      window.localStorage.setItem('active_app_session', JSON.stringify(session));
    }, getMockSession('admin'));

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await use(page);
  },
});

export { expect } from '@playwright/test';
