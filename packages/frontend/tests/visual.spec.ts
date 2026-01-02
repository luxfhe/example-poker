import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Visual Tests', () => {
  test('capture homepage screenshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for animations to settle
    await page.waitForTimeout(1000);
    
    // Take full page screenshot
    const screenshot = await page.screenshot({ 
      fullPage: true,
      path: path.join(__dirname, '../screenshots/homepage.png')
    });
    
    expect(screenshot).toBeTruthy();
  });

  test('capture block explorer screenshot', async ({ page }) => {
    await page.goto('/blockexplorer');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    const screenshot = await page.screenshot({
      fullPage: true,
      path: path.join(__dirname, '../screenshots/blockexplorer.png')
    });
    
    expect(screenshot).toBeTruthy();
  });

  test('capture debug page screenshot', async ({ page }) => {
    await page.goto('/debug');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    const screenshot = await page.screenshot({
      fullPage: true,
      path: path.join(__dirname, '../screenshots/debug.png')
    });
    
    expect(screenshot).toBeTruthy();
  });
});
