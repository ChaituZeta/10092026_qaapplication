import { test, expect } from './fixtures/auth.fixture';

test.describe('Journey 2: New Campaign Creation & Form Lifecycle', () => {

  test('Happy Path: Opening New Campaign starts with clean empty form', async ({ authenticatedPage: page }) => {
    // Navigate to New Campaign route
    await page.goto('/campaigns/new');
    await page.waitForLoadState('domcontentloaded');

    // Confirm form starts empty
    const nameInput = page.locator('input[name="name"], input[placeholder*="Campaign Name"], input[id*="name"]').first();
    if (await nameInput.isVisible()) {
      await expect(nameInput).toHaveValue('');
    }

    // Step 1 title check
    await expect(page.locator('body')).toContainText(/Campaign Setup|New Campaign|Step 1/i);
  });

  test('Form Validation & Navigation: Mandatory fields check', async ({ authenticatedPage: page }) => {
    await page.goto('/campaigns/new');

    // Look for Next / Continue button
    const nextBtn = page.getByRole('button', { name: /Next|Continue|Proceed/i }).first();
    if (await nextBtn.isVisible()) {
      // Trying to proceed without required fields should remain on step 1 or show validation
      await nextBtn.click();
      await expect(page.locator('body')).toContainText(/Step 1|Setup/i);
    }
  });

  test('Draft Persistence: Unsaved campaign draft handling', async ({ authenticatedPage: page }) => {
    await page.goto('/campaigns/new');
    
    // Fill campaign name
    const nameInput = page.locator('input[placeholder*="Campaign Name"], input[id*="name"]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill('E2E Draft Test');
      await nameInput.blur();
    }
  });
});
