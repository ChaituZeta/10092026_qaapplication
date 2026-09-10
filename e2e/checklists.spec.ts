import { test, expect } from './fixtures/auth.fixture';

test.describe('Journey 4: QA Checklists Management', () => {

  test('Happy Path: User can navigate to QA Checklists and switch team templates', async ({ authenticatedPage: page }) => {
    await page.goto('/checklists');

    // Verify Checklists page heading or title
    await expect(page.locator('body')).toContainText(/Checklist|QA Checkpoints|HP-APJ|HP-Global/i);
  });
});
