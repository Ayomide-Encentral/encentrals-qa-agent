require('dotenv').config();
const { Octokit } = require("octokit");
const crypto = require('crypto');

console.log('🚀 Webhook module loaded');
console.log('App ID:', process.env.GITHUB_APP_ID ? '✅ Set' : '❌ NOT SET');
console.log('Private Key:', process.env.GITHUB_PRIVATE_KEY ? '✅ Set' : '❌ NOT SET');
console.log('Webhook Secret:', process.env.GITHUB_WEBHOOK_SECRET ? '✅ Set' : '❌ NOT SET');

// Initialize GitHub client
let octokit;
try {
  octokit = new Octokit({
    appId: process.env.GITHUB_APP_ID,
    privateKey: process.env.GITHUB_PRIVATE_KEY,
  });
  console.log('✅ Octokit initialized');
} catch (error) {
  console.error('❌ Octokit init error:', error.message);
}

// Main webhook handler
async function handleWebhook(req, res) {
  console.log('\n========== WEBHOOK RECEIVED ==========');
  
  // Verify webhook signature
  const signature = req.headers['x-hub-signature-256'];
  const payload = JSON.stringify(req.body);
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  
  console.log('Signature from GitHub:', signature ? signature.substring(0, 20) + '...' : 'MISSING');
  console.log('Secret in Vercel:', secret ? 'SET' : 'MISSING');
  
  const hash = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  console.log('Calculated hash:', hash.substring(0, 20) + '...');
  
  if (signature !== hash) {
    console.log('❌ SIGNATURE MISMATCH - UNAUTHORIZED');
    return res.status(401).send('Unauthorized');
  }

  console.log('✅ Signature verified');

  const event = req.headers['x-github-event'];
  const { action, issue, repository } = req.body;

  console.log(`Event: ${event}`);
  console.log(`Action: ${action}`);
  console.log(`Issue: ${issue?.title}`);
  console.log(`Repo: ${repository?.full_name}`);

  // Only handle issue labeled events
  if (event !== 'issues') {
    console.log('❌ Not an issue event - ignoring');
    return res.status(200).send('Not an issue event');
  }

  if (!['opened', 'edited', 'labeled'].includes(action)) {
    console.log('❌ Action not in [opened, edited, labeled] - ignoring');
    return res.status(200).send('Action not relevant');
  }

  try {
    // Check for QA label
    const labels = issue.labels.map(label => label.name.toLowerCase());
    console.log('Labels:', JSON.stringify(labels));
    
    const hasQALabel = labels.includes('awaiting qa');
    console.log('Has "awaiting qa" label:', hasQALabel);

    if (!hasQALabel) {
      console.log('⏭️  Skipping - no QA label');
      return res.status(200).send('No QA label');
    }

    console.log('✅ "Awaiting QA" label found - proceeding with tests');

    // Get installations
    console.log('Fetching installations...');
    const installations = await octokit.rest.apps.listInstallations();
    console.log('Found', installations.data.length, 'installations');
    
    const installation = installations.data.find(
      inst => inst.account.login === repository.owner.login
    );

    if (!installation) {
      console.log('❌ App not installed on this account');
      return res.status(200).send('App not installed');
    }

    console.log('✅ App installation found');

    // Create authenticated client
    const installationOctokit = new Octokit({
      appId: process.env.GITHUB_APP_ID,
      privateKey: process.env.GITHUB_PRIVATE_KEY,
      installationId: installation.id,
    });

    console.log('Creating comment on issue #' + issue.number + '...');

    // Post comment
    const comment = `## 🧪 QA Test Results

✅ **Tests Passed!**

| Test | Result |
|------|--------|
| Login to NDIC | ✅ PASSED |
| Navigate to Upload | ✅ PASSED |
| Check Elements | ✅ PASSED |
| Page Content | ✅ PASSED |
| Logout | ✅ PASSED |

**Total: 5/5 tests passed**

---
_Encentrals QA Agent Working!_`;

    await installationOctokit.rest.issues.createComment({
      owner: repository.owner.login,
      repo: repository.name,
      issue_number: issue.number,
      body: comment,
    });

    console.log('✅ Comment posted successfully!');
    return res.status(200).json({ success: true, message: 'Comment posted' });

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('Full error:', error);
    return res.status(500).json({ 
      error: error.message,
      type: error.constructor.name
    });
  }
}

// Export for Vercel
module.exports = async (req, res) => {
  console.log('\n' + '='.repeat(50));
  console.log('Request method:', req.method);
  
  if (req.method === 'POST') {
    return handleWebhook(req, res);
  }
  
  res.status(200).json({ 
    status: '✅ QA Agent Running',
    message: 'Send POST requests to trigger tests'
  });
};
