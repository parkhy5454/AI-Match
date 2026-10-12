import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Search Functionality', () => {
  test('should filter users by age', async ({ page }) => {
    await page.goto(`${BASE_URL}/search`);

    // Set age range
    await page.fill('input[name="ageMin"]', '25');
    await page.fill('input[name="ageMax"]', '35');

    // Click search
    await page.click('button:has-text("Search")');

    // Verify results
    const results = page.locator('[class*="result"]');
    const count = await results.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should filter users by MBTI', async ({ page }) => {
    await page.goto(`${BASE_URL}/search`);

    // Select MBTI
    await page.click('select[name="mbti"]');
    await page.click('option[value="ENFP"]');

    // Click search
    await page.click('button:has-text("Search")');

    // Verify results have MBTI badge
    const mbtiResults = page.locator('text=ENFP');
    const count = await mbtiResults.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should save search filters', async ({ page }) => {
    await page.goto(`${BASE_URL}/search`);

    // Apply filters
    await page.fill('input[name="ageMin"]', '28');
    await page.fill('input[name="ageMax"]', '32');
    await page.click('select[name="region"]');
    await page.click('option[value="Seoul"]');

    // Save search
    await page.click('button:has-text("Save Search")');
    await page.fill('input[name="searchName"]', 'My Saved Search');
    await page.click('button:has-text("Save")');

    // Verify save success
    await expect(page.locator('text=Search saved successfully')).toBeVisible();
  });
});
