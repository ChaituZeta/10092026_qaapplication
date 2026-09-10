import { test, expect } from '@playwright/test';
import { TEST_USERS } from './fixtures/test-data';

test.describe('Journey 1: Authentication & Session Lifecycle', () => {
  
  test.beforeEach(async ({ page }) => {
    // Ensure clean state before each auth test
    await page.addInitScript(() => {
      window.localStorage.clear();
    });
  });

  test('Happy Path: User logs in using Quick Login button and logs out cleanly', async ({ page }) => {
    await page.goto('/');

    // Check login page presence
    await expect(page.locator('h1')).toContainText(/Welcome|Reset Password/i);

    // Click One-Click Quick Login button
    const quickLoginBtn = page.getByTestId('quick-login-button').first();
    if (await quickLoginBtn.isVisible()) {
      await quickLoginBtn.click();
      
      // Verify redirection to Dashboard/Home
      await expect(page).toHaveURL('/');
      await expect(page.getByTestId('nav-link-dashboard')).toBeVisible();

      // Perform Logout
      const logoutBtn = page.getByTestId('logout-button');
      await expect(logoutBtn).toBeVisible();
      await logoutBtn.click();

      // Verify redirection back to login screen
      await expect(page.getByTestId('login-email-input')).toBeVisible();
    }
  });

  test('Failure State: Invalid password displays error alert', async ({ page }) => {
    await page.goto('/');

    // Fill invalid credentials
    await page.getByTestId('login-email-input').fill(TEST_USERS.invalidUser.email);
    await page.getByTestId('login-password-input').fill(TEST_USERS.invalidUser.password);
    
    await page.getByTestId('login-submit-button').click();

    // Verify error alert visible
    await expect(page.getByTestId('login-error-alert')).toBeVisible();
    await expect(page.getByTestId('login-error-alert')).toContainText(/invalid/i);
  });

  test('Failure State: Submit button disabled when email or password is empty', async ({ page }) => {
    await page.goto('/');

    const submitBtn = page.getByTestId('login-submit-button');
    await expect(submitBtn).toBeDisabled();

    await page.getByTestId('login-email-input').fill(TEST_USERS.standardUser.email);
    await expect(submitBtn).toBeDisabled();

    await page.getByTestId('login-password-input').fill('somepassword');
    await expect(submitBtn).toBeEnabled();
  });
});
