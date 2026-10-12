import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'Test@12345';

test.describe('Authentication Flow', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(`${BASE_URL}/auth/login`);
  });

  test('should sign up a new user', async () => {
    // Click signup link
    await page.click('text=Sign up');

    // Fill form
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.fill('input[name="confirmPassword"]', TEST_PASSWORD);

    // Submit
    await page.click('button:has-text("Sign up")');

    // Verify redirect to verification
    await expect(page).toHaveURL(/.*verification.*/);
  });

  test('should log in user', async () => {
    // Fill login form
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);

    // Submit
    await page.click('button:has-text("Login")');

    // Verify redirect to home
    await expect(page).toHaveURL(`${BASE_URL}/`);

    // Verify user menu appears
    await expect(page.locator('button[aria-label="User menu"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async () => {
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button:has-text("Login")');

    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });

  test('should logout user', async () => {
    // Login first
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button:has-text("Login")');
    await page.waitForNavigation();

    // Click user menu
    await page.click('button[aria-label="User menu"]');

    // Click logout
    await page.click('text=Logout');

    // Verify redirect to login
    await expect(page).toHaveURL(`${BASE_URL}/auth/login`);
  });
});
