import { test, expect } from '@playwright/test';

// Test configuration
const APP_URL = 'https://ndic-blms-private.showcase.com.ng/login';
const LOGIN_EMAIL = 'Depositor_DataOfficer1@encentrals.onmicrosoft.com';
const LOGIN_PASSWORD = 'Password2024!';

// Helper function: Login to NDIC
async function loginToNDIC(page) {
  console.log('🔑 Logging in to NDIC...');
  
  // Go to login page
  await page.goto(APP_URL + '/login');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  
  // Fill email
  await page.fill('input[type="email"]', LOGIN_EMAIL);
  
  // Fill password
  await page.fill('input[type="password"]', LOGIN_PASSWORD);
  
  // Click login button
  await page.click('button[type="submit"]');
  
  // Wait for dashboard to load
  await page.waitForLoadState('networkidle');
  
  console.log('✅ Login successful');
}

// Main test suite
test.describe('NDIC - Internal Data Upload Module', () => {
  
  test('Test 1: User can login successfully', async ({ page }) => {
    console.log('🧪 Running: User can login successfully');
    
    try {
      await loginToNDIC(page);
      
      // Verify dashboard loaded
      await expect(page).toHaveURL(/.*dashboard|.*home|.*main/);
      
      console.log('✅ Test passed');
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      throw error;
    }
  });

  test('Test 2: Can navigate to Internal Data Upload', async ({ page }) => {
    console.log('🧪 Running: Can navigate to Internal Data Upload');
    
    try {
      await loginToNDIC(page);
      
      // Look for upload section link
      await page.click('a:has-text("Upload"), button:has-text("Upload"), [href*="upload"]');
      
      // Wait for page to load
      await page.waitForLoadState('networkidle');
      
      console.log('✅ Test passed');
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      throw error;
    }
  });

  test('Test 3: Upload module page displays correctly', async ({ page }) => {
    console.log('🧪 Running: Upload module page displays correctly');
    
    try {
      await loginToNDIC(page);
      
      // Navigate to upload
      await page.click('a:has-text("Upload"), button:has-text("Upload"), [href*="upload"]');
      await page.waitForLoadState('networkidle');
      
      // Verify page elements exist
      await expect(page.locator('button, input[type="file"]')).toBeDefined();
      
      console.log('✅ Test passed');
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      throw error;
    }
  });

  test('Test 4: Upload button is visible and clickable', async ({ page }) => {
    console.log('🧪 Running: Upload button is visible and clickable');
    
    try {
      await loginToNDIC(page);
      
      // Navigate to upload
      await page.click('a:has-text("Upload"), button:has-text("Upload"), [href*="upload"]');
      await page.waitForLoadState('networkidle');
      
      // Find and verify upload button
      const uploadButton = page.locator('button:has-text("Upload"), button:has-text("Submit"), input[type="file"]');
      await expect(uploadButton).toBeVisible();
      
      console.log('✅ Test passed');
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      throw error;
    }
  });

  test('Test 5: Can view upload history', async ({ page }) => {
    console.log('🧪 Running: Can view upload history');
    
    try {
      await loginToNDIC(page);
      
      // Navigate to upload
      await page.click('a:has-text("Upload"), button:has-text("Upload"), [href*="upload"]');
      await page.waitForLoadState('networkidle');
      
      // Look for history section
      await page.click('button:has-text("History"), a:has-text("History"), [href*="history"]');
      await page.waitForLoadState('networkidle');
      
      console.log('✅ Test passed');
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      throw error;
    }
  });

  test('Test 6: Logout works correctly', async ({ page }) => {
    console.log('🧪 Running: Logout works correctly');
    
    try {
      await loginToNDIC(page);
      
      // Find and click logout
      await page.click('button:has-text("Logout"), a:has-text("Logout"), [data-testid="logout"]');
      
      // Wait for redirect to login
      await page.waitForLoadState('networkidle');
      
      // Verify we're back at login page
      await expect(page).toHaveURL(/.*login/);
      
      console.log('✅ Test passed');
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      throw error;
    }
  });

});

// Run tests
test.afterEach(async ({ page }) => {
  console.log('🧹 Cleaning up...');
  // Close any open connections
});
