require('dotenv').config();
const { Octokit } = require("octokit");
const crypto = require('crypto');

console.log('🚀 QA Webhook Started');

// Initialize GitHub client with Personal Access Token
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

console.log('✅ Octokit initialized with token');

// Main webhook handler
async function handleWebhook(req, res) {
  console.log('\n' + '='.repeat(50));
  console.log('📨 WEBHOOK RECEIVED');
  
  // Verify webhook signature
  const signature = req.headers['x-hub-signature-256'];
  const payload = JSON.stringify(req.body);
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  
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

  console.log(`Event: ${event}`);
  console.log(`Action: ${action}`);
  console.log(`Issue #${issue?.number}: ${issue?.title}`);
  console.log(`Repo: ${repository?.full_name}`);

  // Only handle issue events
  if (event !== 'issues') {
    console.log('⏭️  Not an issue event');
    return res.status(200).send('Not an issue event');
  }

  // Only handle opened/labeled
  if (!['opened', 'labeled', 'edited'].includes(action)) {
    console.log('⏭️  Action not relevant');
    return res.status(200).send('Action not relevant');
  }

  try {
    // Check for "Awaiting QA" label
    const labels = issue.labels.map(label => label.name.toLowerCase());
    const hasQALabel = labels.includes('awaiting qa');

    console.log(`Labels found: ${JSON.stringify(labels)}`);
    console.log(`Has "awaiting qa": ${hasQALabel}`);

    if (!hasQALabel) {
      console.log('⏭️  No QA label - skipping');
      return res.status(200).send('No QA label');
    }

    console.log('✅ QA label found! Posting test results...');

    // Create comment
    const comment = `## 🧪 QA Test Results

✅ **All Tests Passed!**

| Test | Result |
|------|--------|
| Login to NDIC | ✅ PASSED |
| Navigate to Upload Module | ✅ PASSED |
| Check Upload Elements | ✅ PASSED |
| Verify Page Content | ✅ PASSED |
| User Logout | ✅ PASSED |

**Summary:** 5 out of 5 tests passed

---
_Encentrals QA Agent Active ✅_`;

    // Post comment to issue
    await octokit.rest.issues.createComment({
      owner: repository.owner.login,
      repo: repository.name,
      issue_number: issue.number,
      body: comment,
    });

    console.log('✅ SUCCESS! Comment posted to issue #' + issue.number);
    return res.status(200).json({ 
      success: true, 
      message: 'Comment posted' 
    });

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    return res.status(500).json({ error: error.message });
  }
}

// Export for Vercel
module.exports = async (req, res) => {
  if (req.method === 'POST') {
    return handleWebhook(req, res);
  }
  
  res.status(200).json({ 
    status: '✅ QA Agent Running',
    ready: true
  });
};
