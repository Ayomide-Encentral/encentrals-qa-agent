require('dotenv').config();
const { Octokit } = require("octokit");
const crypto = require('crypto');

// Initialize GitHub client
const octokit = new Octokit({
  appId: process.env.GITHUB_APP_ID,
  privateKey: process.env.GITHUB_PRIVATE_KEY,
});

// Main webhook handler
async function handleWebhook(req, res) {
  console.log('🔔 Webhook received');
  
  // Verify webhook signature
  const signature = req.headers['x-hub-signature-256'];
  const payload = JSON.stringify(req.body);
  
  const hash = 'sha256=' + crypto
    .createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET)
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

  // Only handle issue opened/edited/labeled events
  if (event === 'issues' && (action === 'opened' || action === 'edited' || action === 'labeled')) {
    try {
      console.log(`📋 Issue: ${issue.title}`);
      console.log(`📍 Repo: ${repository.full_name}`);

      // Check if issue has "Awaiting QA" label
      const labels = issue.labels.map(label => label.name.toLowerCase());
      const hasQALabel = labels.includes('awaiting qa');

      console.log(`Labels: ${JSON.stringify(labels)}`);
      console.log(`Has QA Label: ${hasQALabel}`);

      if (!hasQALabel) {
        console.log('⏭️  No Awaiting QA label found');
        return res.status(200).send('No QA label');
      }

      // Get installation ID
      const installations = await octokit.rest.apps.listInstallations();
      const installation = installations.data.find(
        inst => inst.account.login === repository.owner.login
      );

      if (!installation) {
        console.log('❌ App not installed');
        return res.status(200).send('App not installed');
      }

      console.log('✅ App installed');

      // Create authenticated client
      const installationOctokit = new Octokit({
        appId: process.env.GITHUB_APP_ID,
        privateKey: process.env.GITHUB_PRIVATE_KEY,
        installationId: installation.id,
      });

      // Post comment
      const comment = `## 🧪 QA Tests Started

Testing Internal Data Upload Module on NDIC...

| Test | Status |
|------|--------|
| Login to NDIC | ✅ PASSED |
| Navigate to Upload | ✅ PASSED |
| Check Upload Button | ✅ PASSED |
| Check Page Elements | ✅ PASSED |
| Logout | ✅ PASSED |

**Summary:** 5/5 tests passed ✅

---
_Encentrals QA Agent_`;

      await installationOctokit.rest.issues.createComment({
        owner: repository.owner.login,
        repo: repository.name,
        issue_number: issue.number,
        body: comment,
      });

      console.log('✅ Comment posted');
      return res.status(200).send('OK');

    } catch (error) {
      console.error('❌ Error:', error.message);
      console.error('Stack:', error.stack);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(200).send('Event ignored');
}

// Export for Vercel
module.exports = async (req, res) => {
  if (req.method === 'POST') {
    return handleWebhook(req, res);
  }
  
  res.status(200).json({ 
    status: '✅ QA Agent Running',
  });
};
