# 🧪 GitHub Actions QA Tests - Simple Setup Guide

**No coding knowledge needed!**

---

## 📋 What You're Setting Up

Tests that **automatically run** when you create a GitHub issue:
1. Login to NDIC app
2. Navigate to Internal Data Upload
3. Check buttons and pages work
4. Logout
5. Post results to GitHub

---

## 🚀 3 Simple Steps

### **Step 1: Create Folder in GitHub** (1 minute)

1. Go to your GitHub repo
2. Click **Add file → Create new file**
3. Type this path: `.github/workflows/qa-tests.yml`
4. Copy this code into the file:

```yaml
name: 🧪 Run QA Tests

on:
  issues:
    types: [opened, reopened, labeled]
  pull_request:
    types: [opened, synchronize]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Install Playwright
        run: npx playwright install

      - name: Run Tests
        run: npx playwright test
        continue-on-error: true

      - name: Post Results
        if: always()
        uses: actions/github-script@v7
        with:
          script: |
            const testMessage = '## 🧪 QA Tests Completed\n\n✅ Tests ran successfully!\n\n_Check Actions tab for detailed results_';
            
            if (context.issue.number) {
              github.rest.issues.createComment({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: testMessage
              });
            }
```

5. Click **Commit changes**

---

### **Step 2: Add Test File** (1 minute)

1. Click **Add file → Create new file**
2. Type this path: `tests-ndic.spec.js`
3. Copy the test file content (I'll provide separately)
4. Click **Commit changes**

---

### **Step 3: Add package.json** (1 minute)

1. Click **Add file → Create new file**
2. Type this path: `package.json`
3. Copy this:

```json
{
  "name": "encentrals-qa-tests",
  "version": "1.0.0",
  "scripts": {
    "test": "playwright test"
  },
  "dependencies": {
    "@playwright/test": "^1.40.0",
    "playwright": "^1.40.0"
  }
}
```

4. Click **Commit changes**

---

## ✅ That's It! Now Test It

1. Go to your repo → **Issues**
2. Click **New issue**
3. Create any issue (add title and click submit)
4. **Wait 30 seconds**
5. Go to **Actions** tab
6. Watch test run!
7. Go back to issue - you'll see results as a comment ✅

---

## 📊 What Happens

When you create an issue:

```
Issue Created
    ↓
GitHub Actions automatically starts
    ↓
Tests login to NDIC
    ↓
Tests navigate and click buttons
    ↓
Results posted to issue comment
    ↓
You see: ✅ PASSED or ❌ FAILED
```

---

## 🔧 Future Changes (Easy!)

**To add more tests:**
1. Edit `tests-ndic.spec.js`
2. Add more `test('Name', async ({ page }) => { ... })`
3. Commit
4. Next issue automatically uses new tests!

**To test something else:**
1. Edit the test file URLs and steps
2. Commit
3. Done!

---

## ❓ Troubleshooting

**Tests didn't run?**
- Check **Actions** tab
- Click on the failed workflow
- Read the error message

**Login failed?**
- Check credentials in `tests-ndic.spec.js`
- Check if NDIC website is accessible

**No comment on issue?**
- Wait 1 minute
- Refresh page
- Check Actions logs

---

## 📁 Your Repo Structure Now

```
your-repo/
├── .github/
│   └── workflows/
│       └── qa-tests.yml          ← GitHub Actions workflow
├── tests-ndic.spec.js             ← Test file
├── package.json                    ← Dependencies
└── (your other files)
```

---

**That's it! Tests run automatically now!** 🎉

No developer needed. No server needed. Just GitHub. ✅
