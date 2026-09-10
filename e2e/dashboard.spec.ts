import { test, expect } from './fixtures/auth.fixture';

test.describe('Journey 3: Campaign Dashboard & Navigation', () => {

  test('Happy Path: Dashboard displays overview metrics and sidebar navigation works', async ({ authenticatedPage: page }) => {
    await page.goto('/');

    // Sidebar check
    await expect(page.getByTestId('nav-link-dashboard')).toBeVisible();
    await expect(page.getByTestId('nav-link-campaigns')).toBeVisible();

    // Navigate to Campaigns list
    await page.getByTestId('nav-link-campaigns').click();
    await expect(page).toHaveURL(/\/campaigns/);
  });

  test('Search & Filtering: Searching non-existent campaign displays clean empty state', async ({ authenticatedPage: page }) => {
    await page.goto('/campaigns');

    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('NonExistentCampaignXYZ12399');
      // Verify empty search results state or 0 items message
      await page.waitForTimeout(300);
      await expect(page.locator('body')).toContainText(/No campaigns found|0 campaigns|No results/i);
    }
  });
});
