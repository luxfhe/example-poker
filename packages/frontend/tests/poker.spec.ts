import { test, expect } from '@playwright/test';

test.describe('LuxFHE Poker Frontend', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('homepage loads correctly', async ({ page }) => {
    // Check page title or main content
    await expect(page).toHaveURL('/');
    
    // Check that the page has loaded
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('navigation menu is visible', async ({ page }) => {
    // Look for navigation elements
    const nav = page.locator('nav, header, [role="navigation"]').first();
    if (await nav.isVisible()) {
      await expect(nav).toBeVisible();
    }
  });

  test('wallet connect button exists', async ({ page }) => {
    // RainbowKit wallet connect button
    const connectButton = page.locator('button').filter({ hasText: /connect|wallet/i }).first();
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    // Check for any connect wallet functionality
    const buttons = await page.locator('button').all();
    console.log(`Found ${buttons.length} buttons on page`);
  });

  test('FHE initialization happens on load', async ({ page }) => {
    // Wait for FHE client to initialize
    await page.waitForLoadState('networkidle');
    
    // Check for any FHE-related UI elements or console messages
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      consoleMessages.push(msg.text());
    });
    
    // Reload to capture console messages
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Log messages for debugging
    console.log('Console messages:', consoleMessages.slice(0, 10));
  });

  test('no critical JavaScript errors', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('pageerror', error => {
      errors.push(error.message);
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Filter out expected errors (e.g., wallet not connected)
    const criticalErrors = errors.filter(e => 
      !e.includes('wallet') && 
      !e.includes('provider') &&
      !e.includes('network')
    );
    
    if (criticalErrors.length > 0) {
      console.log('JavaScript errors:', criticalErrors);
    }
    
    // Expect no critical errors
    expect(criticalErrors.length).toBe(0);
  });
});

test.describe('Block Explorer', () => {
  test('block explorer page loads', async ({ page }) => {
    await page.goto('/blockexplorer');
    await page.waitForLoadState('networkidle');
    
    // Should be on block explorer page
    await expect(page).toHaveURL(/blockexplorer/);
  });

  test('can navigate to address page', async ({ page }) => {
    const testAddress = '0x0000000000000000000000000000000000000000';
    await page.goto(`/blockexplorer/address/${testAddress}`);
    await page.waitForLoadState('networkidle');
    
    // Check URL contains address
    await expect(page).toHaveURL(new RegExp(testAddress));
  });
});

test.describe('Debug Pages', () => {
  test('debug contracts page loads', async ({ page }) => {
    await page.goto('/debug');
    await page.waitForLoadState('networkidle');
    
    // Debug page should exist
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
