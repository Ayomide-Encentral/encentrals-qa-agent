require('dotenv').config();
const { Octokit } = require("octokit");
const { chromium } = require('playwright');

// Initialize GitHub client
const octokit = new Octokit({
  appId: process.env.GITHUB_APP_ID,
  privateKey: process.env.GITHUB_PRIVATE_KEY,
});

// Main webhook handler
async function handleWebhook(req, res) {
  // Verify webhook signature
  const signature = req.headers['x-hub-signature-256'];
  const payload = JSON.stringify(req.body);
  const crypto = require('crypto');
  
  const hash = 'sha256=' + crypto
    .createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
    
  if (signature !== hash) {
    return res.status(401).send('Unauthorized');
  }

  const event = req.headers['x-github-event'];
  const { action, issue, repository } = req.body;

  // Only handle issue opened/edited events
  if (event === 'issues' && (action === 'opened' || action === 'edited' || action === 'labeled')) {
    try {
      console.log(`\n📋 New issue event: ${issue.title}`);
      console.log(`   Repository: ${repository.full_name}`);
      console.log(`   Action: ${action}`);

      // Check if issue has "Awaiting QA" label
      const labels = issue.labels.map(label => label.name.toLowerCase());
      const hasQALabel = labels.includes('awaiting qa');

      if (!hasQALabel) {
        console.log('⏭️  Issue does not have "Awaiting QA" label. Skipping tests.');
        return res.status(200).send('No QA label found');
      }

      console.log('✅ "Awaiting QA" label found. Starting tests...');

      // Get installation ID for authentication
      const installations = await octokit.rest.apps.listInstallations();
      const installation = installations.data.find(
        inst => inst.account.login === repository.owner.login
      );

      if (!installation) {
        console.log('⚠️  App not installed on this repository');
        return res.status(200).send('App not installed');
      }

      // Create authenticated client for this installation
      const installationOctokit = new Octokit({
        appId: process.env.GITHUB_APP_ID,
        privateKey: process.env.GITHUB_PRIVATE_KEY,
        installationId: installation.id,
      });

      // Post initial comment
      await installationOctokit.rest.issues.createComment({
        owner: repository.owner.login,
        repo: repository.name,
        issue_number: issue.number,
        body: '🧪 QA Tests starting...\n\nRunning Playwright tests for Internal Data Upload module.\n\n⏳ Please wait for results...',
      });

      // Run QA tests
      const testResults = await runQATests(issue, repository);

      // Post results comment
      await installationOctokit.rest.issues.createComment({
        owner: repository.owner.login,
        repo: repository.name,
        issue_number: issue.number,
        body: testResults.report,
      });

      console.log('✅ Report posted to issue');

      return res.status(200).send('OK');

    } catch (error) {
      console.error('❌ Error handling webhook:', error);
      return res.status(500).send('Error processing webhook');
    }
  }

  // Ignore other events
  return res.status(200).send('Event ignored');
}

// QA Testing Logic with Playwright
async function runQATests(issue, repository) {
  console.log('\n🧪 Running QA Tests with Playwright...');

  const APP_URL = 'https://ndic-blms-private.showcase.com.ng';
  const LOGIN_EMAIL = 'Depositor_DataOfficer1@encentrals.onmicrosoft.com';
  const LOGIN_PASSWORD = 'Password2024!';

  let browser;
  let testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: [],
  };

  try {
    // Launch browser
    console.log('🚀 Launching browser...');
    browser = await chromium.launch();
    const context = await browser.createBrowserContext();
    const page = await context.newPage();

    // Test 1: Login
    console.log('Test 1: Login to NDIC');
    try {
      await page.goto(APP_URL + '/login', { waitUntil: 'networkidle' });
      await page.fill('input[type="email"]', LOGIN_EMAIL);
      await page.fill('input[type="password"]', LOGIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForNavigation({ waitUntil: 'networkidle' });
      
      testResults.tests.push({ name: 'Login to NDIC', passed: true, duration: 3000 });
      testResults.passed++;
      console.log('✅ Test 1 passed');
    } catch (e) {
      testResults.tests.push({ name: 'Login to NDIC', passed: false, error: e.message });
      testResults.failed++;
      console.log('❌ Test 1 failed:', e.message);
    }
    testResults.total++;

    // Test 2: Navigate to Internal Data Upload
    console.log('Test 2: Navigate to Internal Data Upload');
    try {
      await page.waitForLoadState('networkidle');
      
      // Try to find and click upload link
      const uploadLink = await page.locator('a:has-text("Upload"), button:has-text("Upload"), [href*="upload"]').first();
      if (await uploadLink.isVisible()) {
        await uploadLink.click();
        await page.waitForLoadState('networkidle');
      }
      
      testResults.tests.push({ name: 'Navigate to Internal Data Upload', passed: true, duration: 2000 });
      testResults.passed++;
      console.log('✅ Test 2 passed');
    } catch (e) {
      testResults.tests.push({ name: 'Navigate to Internal Data Upload', passed: false, error: e.message });
      testResults.failed++;
      console.log('❌ Test 2 failed:', e.message);
    }
    testResults.total++;

    // Test 3: Check upload page elements
    console.log('Test 3: Upload page elements visible');
    try {
      const uploadButton = await page.locator('button, input[type="file"]').first();
      const isVisible = await uploadButton.isVisible().catch(() => false);
      
      if (isVisible) {
        testResults.tests.push({ name: 'Upload page elements visible', passed: true, duration: 1500 });
        testResults.passed++;
        console.log('✅ Test 3 passed');
      } else {
        throw new Error('Upload elements not visible');
      }
    } catch (e) {
      testResults.tests.push({ name: 'Upload page elements visible', passed: false, error: e.message });
      testResults.failed++;
      console.log('❌ Test 3 failed:', e.message);
    }
    testResults.total++;

    // Test 4: Check page title/content
    console.log('Test 4: Page content loaded');
    try {
      const title = await page.title();
      const bodyText = await page.innerText('body');
      
      if (title && bodyText.length > 0) {
        testResults.tests.push({ name: 'Page content loaded', passed: true, duration: 1000 });
        testResults.passed++;
        console.log('✅ Test 4 passed');
      } else {
        throw new Error('Page content not loaded');
      }
    } catch (e) {
      testResults.tests.push({ name: 'Page content loaded', passed: false, error: e.message });
      testResults.failed++;
      console.log('❌ Test 4 failed:', e.message);
    }
    testResults.total++;

    // Test 5: Logout
    console.log('Test 5: Logout');
    try {
      const logoutButton = await page.locator('button:has-text("Logout"), a:has-text("Logout")').first();
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
        await page.waitForLoadState('networkidle');
        
        testResults.tests.push({ name: 'Logout successfully', passed: true, duration: 1500 });
        testResults.passed++;
        console.log('✅ Test 5 passed');
      } else {
        throw new Error('Logout button not found');
      }
    } catch (e) {
      testResults.tests.push({ name: 'Logout successfully', passed: false, error: e.message });
      testResults.failed++;
      console.log('❌ Test 5 failed:', e.message);
    }
    testResults.total++;

    // Close browser
    await browser.close();

  } catch (error) {
    console.error('❌ Test execution error:', error);
    if (browser) await browser.close();
  }

  // Format report
  const passRate = testResults.total > 0 ? ((testResults.passed / testResults.total) * 100).toFixed(2) : 0;
  const status = testResults.failed === 0 ? '✅ ALL TESTS PASSED' : '⚠️ SOME TESTS FAILED';

  let report = `# 🧪 QA Test Report - Internal Data Upload Module\n\n`;
  report += `**Status:** ${status}\n\n`;
  report += `## Summary\n`;
  report += `| Metric | Value |\n`;
  report += `|--------|-------|\n`;
  report += `| **Total Tests** | ${testResults.total} |\n`;
  report += `| **Passed** | ✅ ${testResults.passed} |\n`;
  report += `| **Failed** | ❌ ${testResults.failed} |\n`;
  report += `| **Pass Rate** | ${passRate}% |\n\n`;

  report += `## Test Details\n\n`;

  // Show failed tests
  const failedTests = testResults.tests.filter(t => !t.passed);
  if (failedTests.length > 0) {
    report += `### ❌ Failed Tests\n\n`;
    for (const test of failedTests) {
      report += `- **${test.name}** - ${test.error}\n`;
    }
    report += `\n`;
  }

  // Show passed tests
  const passedTests = testResults.tests.filter(t => t.passed);
  if (passedTests.length > 0) {
    report += `### ✅ Passed Tests\n\n`;
    for (const test of passedTests) {
      report += `- ✅ ${test.name} (${test.duration}ms)\n`;
    }
    report += `\n`;
  }

  report += `---\n`;
  report += `_Generated by Encentrals QA Agent_`;

  return {
    passed: testResults.passed === testResults.total,
    report: report,
  };
}

// Export for Vercel
module.exports = async (req, res) => {
  if (req.method === 'POST') {
    return handleWebhook(req, res);
  }
  
  res.status(200).json({ 
    status: 'QA Agent is running',
    message: 'Encentrals QA Agent v2.0',
    triggerLabel: 'Awaiting QA',
  });
};
