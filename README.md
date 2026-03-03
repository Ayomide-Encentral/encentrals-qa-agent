# Encentrals QA Agent

A GitHub App that automatically tests issues and reports results.

## Setup

### 1. Create GitHub App
- Go to https://github.com/settings/apps
- Create new app with webhook URL pointing to this deployment
- Save: App ID, Private Key, Webhook Secret

### 2. Environment Variables
Create a `.env` file (copy from `.env.example`):
```
GITHUB_APP_ID=your_app_id
GITHUB_PRIVATE_KEY=your_private_key
GITHUB_WEBHOOK_SECRET=your_webhook_secret
```

### 3. Deploy to Vercel
```
vercel deploy
```

### 4. Update GitHub App Webhook URL
- Update the GitHub App webhook URL to your Vercel deployment URL
- Format: `https://your-deployment.vercel.app/api/webhook`

## How It Works

1. Issue is created in any repository
2. GitHub sends webhook notification to this app
3. App receives the notification
4. App runs QA tests (you define these)
5. App posts results as comment on issue

## Adding Tests

Edit `api/webhook.js` and modify the `runQATests()` function to add your actual test logic.

## Status

🚧 Framework ready - Ready for you to add actual tests!
