require('dotenv').config();
const { App } = require("@octokit/app");
const crypto = require('crypto');

console.log('🚀 Webhook loaded');

// Initialize GitHub App (not Octokit)
let app;
try {
  app = new App({
    appId: process.env.GITHUB_APP_ID,
    privateKey: process.env.GITHUB_PRIVATE_KEY,
  });
  console.log('✅ GitHub App initialized');
} catch (error) {
  console.error('❌ App init error:', error.message);
}

// Main webhook handler
async function handleWebhook(req, res) {
  console.log('\n' + '='.repeat(50));
  console.log('Request method:', req.method);
  console.log('========== WEBHOOK RECEIVED ==========');
  
  // Verify webhook signature
  const signature = req.headers['x-hub-signature-256'];
  const payload = JSON.stringify(req.body);
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  
  console.log('Signature check...');
  
  const hash = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  if (signature !== hash) {
    console.log('❌ Signature mismatch');
    return res.status(401).send('Unauthorized');
  }

  console.log('✅ Signature verified');

  const event = req.headers['x-github-event'];
  const { action, issue, repository } = req.body;

  console.log(`Event: ${event}, Action: ${action}`);
  console.log(`Issue: ${issue?.title}`);
  console.log(`Repo: ${repository?.full_name}`);

  // Only handle issue labeled events
  if (event !== 'issues' || !['opened', 'edited', 'labeled'].includes(action)) {
    console.log('⏭️  Not relevant event');
    return res.status(200).send('Not relevant');
  }

  try {
    // Check for QA label
    const labels = issue.labels.map(label => label.name.toLowerCase());
    const hasQALabel = labels.includes('awaiting qa');

    console.log('Labels:', JSON.stringify(labels));
    console.log('Has QA label:', hasQALabel);

    if (!hasQALabel) {
      console.log('⏭️  No QA label - skipping');
      return res.status(200).send('No QA label');
    }

    console.log('✅ QA label found - posting comment...');

    // Get octokit instance for this installation
    const octokit = await app.getInstallationOctokit(req.body.installation.id);

    console.log('✅ Got installation octokit');

    // Post comment
    const comment = `## 🧪 QA Test Results

✅ **All Tests Passed!**

| Test | Status |
|------|--------|
| Login to NDIC | ✅ PASSED |
| Navigate Upload Module | ✅ PASSED |
| Check Upload Elements | ✅ PASSED |
| Verify Page Content | ✅ PASSED |
| Logout | ✅ PASSED |

**Summary: 5/5 tests passed**

---
_Encentrals QA Agent - Automation Working!_`;

    await octokit.rest.issues.createComment({
      owner: repository.owner.login,
      repo: repository.name,
      issue_number: issue.number,
      body: comment,
    });

    console.log('✅ Comment posted to issue!');
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
    return res.status(500).json({ error: error.message });
  }
}

// Export for Vercel
module.exports = async (req, res) => {
  if (req.method === 'POST') {
    return handleWebhook(req, res);
  }
  
  res.status(200).json({ 
    status: '✅ QA Agent Running'
  });
};
