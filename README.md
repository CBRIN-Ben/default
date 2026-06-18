# Repo Watch — Slack + GitHub monitoring bot

Monitor GitHub repositories from Slack: daily digests, real-time event updates, and an AI assistant you can @mention to ask questions about repo progress.

Built with [Chat SDK](https://vercel.com/kb/guide/the-complete-guide-to-chat-sdk), [Vercel Workflow](https://vercel.com/docs/workflow), and [AI SDK](https://ai-sdk.dev).

## What you get

| Feature | How it works |
| --- | --- |
| **Daily digest** | Vercel Cron runs each morning and posts an AI summary of repo activity to `#repo-watch` |
| **Live updates** | GitHub webhooks post pushes, PRs, issues, releases, and workflow results to Slack |
| **Ask questions** | @mention `@repo-watch` in any channel — ask things like "what's open in `owner/repo`?" or "which repos had activity this week?" |

## Architecture

```
GitHub webhooks ──► /api/webhooks/github ──► Slack #repo-watch
Vercel Cron     ──► /api/cron/digest     ──► Workflow ──► AI digest ──► Slack
Slack @mention  ──► /api/webhooks/slack  ──► AI agent + GitHub tools ──► thread reply
```

## Quick start

### 1. Install and link

```bash
pnpm install
vercel link
vercel integration add upstash   # Redis for Chat SDK state
vercel env pull
```

### 2. Create Vercel Connectors

**Slack connector** (recommended for production):

1. Vercel dashboard → Connect → Create Connector → Slack
2. Install in your workspace with bot scopes: `app_mentions:read`, `channels:history`, `channels:read`, `chat:write`, `groups:history`, `groups:read`, `im:history`, `im:read`, `mpim:history`, `mpim:read`, `reactions:write`
3. Link to this project and copy the connector id → `CONNECTOR_SLACK=slack/your-connector`

**GitHub connector**:

1. Connect → Create Connector → GitHub
2. Install on the repos you want to watch
3. Copy connector id → `CONNECTOR_GITHUB=github/your-connector`

### 3. Configure environment

Copy `.env.example` to `.env.local` and fill in:

```bash
CRON_SECRET=                          # openssl rand -base64 32
DIGEST_CHANNEL_ID=slack:C0BBBSHSLFQ  # your Slack channel (see below)
CONNECTOR_SLACK=slack/repo-watch
CONNECTOR_GITHUB=github/your-github
REDIS_URL=                            # from Upstash integration
GITHUB_WEBHOOK_SECRET=                # from GitHub webhook settings
```

**Slack channel**: A `#repo-watch` channel was created for you. Invite the bot with `/invite @repo-watch`. The channel ID format for Chat SDK is `slack:<CHANNEL_ID>`.

For local development without Connect, you can use direct tokens instead:

```bash
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
GITHUB_TOKEN=ghp_...
```

### 4. GitHub webhook

In each repo (or org webhook), add:

- **URL**: `https://your-app.vercel.app/api/webhooks/github`
- **Secret**: same value as `GITHUB_WEBHOOK_SECRET`
- **Events**: Push, Pull requests, Issues, Releases, Workflow runs

### 5. Run locally

```bash
pnpm dev
```

Expose with ngrok for Slack/GitHub webhooks:

```bash
npx ngrok http 3000
```

Update Slack Event Subscriptions and GitHub webhook URLs to your ngrok URL.

### 6. Deploy

```bash
vercel --prod
```

## Using the bot

**Daily digest** — runs automatically at 08:00 UTC. Trigger manually:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.vercel.app/api/cron/digest
```

**Ask questions** — in Slack:

```
@repo-watch what's the status of CBRIN-Ben/default?
@repo-watch list my repos with open PRs
@repo-watch any blockers on auth-related issues?
```

The bot subscribes to the thread and keeps context for follow-up questions.

**Live updates** — appear automatically in `#repo-watch` when GitHub events fire.

## Project structure

```
app/api/
  cron/digest/route.ts       Scheduled digest entry point
  webhooks/slack/route.ts    Slack events (@mentions, threads)
  webhooks/github/route.ts   GitHub push/PR/issue/release events
lib/
  bot.ts                     Chat SDK bot (Slack + Redis)
  agent.ts                   AI agent with GitHub tools
  github/
    client.ts                GitHub API helpers
    tools.ts                 Tools for the AI agent
    webhook.ts               GitHub event → Slack message formatting
  digest/                    Daily digest workflow
```

## Environment reference

| Variable | Required | Description |
| --- | --- | --- |
| `CONNECTOR_SLACK` | ✅* | Vercel Connect Slack connector id |
| `CONNECTOR_GITHUB` | ✅* | Vercel Connect GitHub connector id |
| `DIGEST_CHANNEL_ID` | ✅ | Slack channel for digests and live updates (`slack:C123...`) |
| `REDIS_URL` | ✅ | Redis for Chat SDK thread state |
| `CRON_SECRET` | ✅ | Auth for the cron route |
| `GITHUB_WEBHOOK_SECRET` | ✅ | GitHub webhook signature secret |
| `SLACK_BOT_TOKEN` | local dev | Direct Slack token (alternative to Connect) |
| `SLACK_SIGNING_SECRET` | local dev | Slack signing secret (alternative to Connect) |
| `GITHUB_TOKEN` | local dev | GitHub PAT (alternative to Connect) |
| `AGENT_MODEL` | — | Model for Q&A (default: `anthropic/claude-sonnet-4.6`) |
| `DIGEST_MODEL` | — | Model for digest (default: `anthropic/claude-haiku-4.5`) |
| `BOT_USER_NAME` | — | Bot display name (default: `repo-watch`) |

\*Use Connect in production; direct tokens work for local dev.

## License

Private — based on [vercel-labs/daily-digest-bot](https://github.com/vercel-labs/daily-digest-bot).
