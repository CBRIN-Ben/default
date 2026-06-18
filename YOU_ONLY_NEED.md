# What only you need to do

Repo Watch is **already running** in Cursor. GitHub is connected, the dev server is up, and updates post to **#repo-watch** when you ask in Cursor.

## Right now (nothing required)

You can use it immediately:

1. Ask in this Cursor chat: *"what's happening with my repos?"*
2. I'll pull live data from the running app and post updates to **#repo-watch**
3. Dashboard: [Repo Watch Canvas](https://cursor-flow.slack.com/docs/T0BBF1RC92M/F0BBHKY2GQL)

---

## Optional upgrades (only if you want 24/7 without Cursor)

These are **not required** for the Cursor-assisted flow. Only do them if you want the bot to run autonomously when Cursor isn't open.

### 1. Slack @mention bot (one-time, ~5 min)

**Why:** Lets anyone `@repo-watch` in Slack without asking Cursor.

**You do:**
1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From a manifest**
2. Paste the contents of `slack-manifest.json` (update webhook URL after deploy)
3. Install to your workspace
4. Add to **Cursor Dashboard → Cloud Agents → Secrets**:
   - `SLACK_BOT_TOKEN` (starts with `xoxb-`)
   - `SLACK_SIGNING_SECRET`
5. In Slack: `/invite @repo-watch` in `#repo-watch`

### 2. AI Gateway key (one-time, ~2 min)

**Why:** Powers autonomous @mention Q&A in Slack (without Cursor answering).

**You do:**
1. [Vercel Dashboard → AI Gateway](https://vercel.com/dashboard/ai-gateway) → Create API Key
2. Add to Cursor secrets: `AI_GATEWAY_API_KEY`

### 3. Deploy to Vercel (one-time, ~10 min)

**Why:** Keeps the bot running 24/7 instead of only when Cursor is open.

**You do:**
1. Merge [PR #1](https://github.com/CBRIN-Ben/default/pull/1)
2. Import repo at [vercel.com/new](https://vercel.com/new)
3. Add Upstash Redis: `vercel integration add upstash`
4. Create Vercel Connect connectors for Slack + GitHub (or use the tokens above)
5. Set env vars from `.env.example`
6. Deploy

### 4. GitHub webhooks (one-time, needs repo admin)

**Why:** Instant Slack alerts on push/PR/issue (instead of on-demand checks).

**You do:**
1. GitHub repo → **Settings → Webhooks → Add webhook**
2. URL: `https://your-app.vercel.app/api/webhooks/github`
3. Secret: same as `GITHUB_WEBHOOK_SECRET` in env
4. Events: Push, Pull requests, Issues, Releases, Workflow runs

*(The current GitHub token doesn't have webhook admin permission — this step needs your personal token or repo admin access.)*

---

## Summary

| Feature | Status | You need to do anything? |
|---------|--------|--------------------------|
| Dev server running | ✅ Done | No |
| GitHub connected | ✅ Done | No |
| #repo-watch channel | ✅ Done | No |
| Ask questions in Cursor | ✅ Works now | No — just ask |
| Updates posted to Slack | ✅ Works now | No — I post them |
| Slack dashboard canvas | ✅ Done | No |
| @repo-watch in Slack | ⏸ Optional | Yes — Slack app setup (#1) |
| 24/7 autonomous bot | ⏸ Optional | Yes — deploy (#3) |
| Instant GitHub alerts | ⏸ Optional | Yes — webhook (#4) |
