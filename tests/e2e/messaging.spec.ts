import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Messaging', () => {
  test('should send and receive messages', async ({ browser }) => {
    // Login first
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/auth/login`);
    await page.fill('input[name="email"]', 'user1@example.com');
    await page.fill('input[name="password"]', 'Password@123');
    await page.click('button:has-text("Login")');
    await page.waitForNavigation();

    // Navigate to messages
    await page.click('text=Messages');

    // Start new conversation
    await page.click('button:has-text("New Message")');
    await page.fill('input[name="recipient"]', 'user2@example.com');

    // Send message
    const messageInput = page.locator('textarea[name="message"]');
    await messageInput.fill('Hello, this is a test message');
    await page.click('button:has-text("Send")');

    // Verify message appears
    await expect(page.locator('text=Hello, this is a test message')).toBeVisible();
  });

  test('should show typing indicator', async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/messages`);

    // Find active conversation
    await page.click('div[class*="conversation"]');

    // Start typing
    const input = page.locator('textarea[name="message"]');
    await input.focus();
    await input.type('T', { delay: 100 });

    // Verify typing indicator
    await expect(page.locator('text=typing')).toBeVisible();

    // Stop typing
    await input.blur();

    // Verify typing indicator disappears
    await expect(page.locator('text=typing')).not.toBeVisible();
  });

  test('should load message history', async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/messages`);

    // Open conversation
    await page.click('div[class*="conversation"]');

    // Verify messages are loaded
    const messages = page.locator('div[class*="message"]');
    const count = await messages.count();
    expect(count).toBeGreaterThan(0);

    // Scroll up to load more
    await page.locator('div[class*="messages"]').evaluate(el => el.scrollTop = 0);

    // Wait for more messages to load
    await page.waitForTimeout(500);

    const newCount = await messages.count();
    expect(newCount).toBeGreaterThanOrEqual(count);
  });
});
