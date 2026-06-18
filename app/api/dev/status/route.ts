import { NextResponse } from "next/server";

function isSet(name: string) {
  return Boolean(process.env[name]);
}

export async function GET() {
  const githubViaConnect = isSet("CONNECTOR_GITHUB");
  const githubViaToken = isSet("GITHUB_TOKEN");
  const slackViaConnect = isSet("CONNECTOR_SLACK");
  const slackViaToken =
    isSet("SLACK_BOT_TOKEN") && isSet("SLACK_SIGNING_SECRET");
  const redis = isSet("REDIS_URL");
  const ai =
    isSet("AI_GATEWAY_API_KEY") ||
    isSet("OPENAI_API_KEY") ||
    isSet("ANTHROPIC_API_KEY") ||
    isSet("VERCEL_OIDC_TOKEN");

  return NextResponse.json({
    service: "repo-watch",
    ready: true,
    integrations: {
      github: githubViaConnect || githubViaToken,
      githubMode: githubViaConnect
        ? "vercel-connect"
        : githubViaToken
          ? "token"
          : "missing",
      slack: slackViaConnect || slackViaToken,
      slackMode: slackViaConnect
        ? "vercel-connect"
        : slackViaToken
          ? "token"
          : "missing",
      redis: redis ? "redis" : "memory (dev fallback)",
      ai: ai ? "configured" : "missing",
    },
    channel: process.env.DIGEST_CHANNEL_ID ?? null,
    endpoints: {
      status: "/api/dev/status",
      repos: "/api/dev/repos",
      slackWebhook: "/api/webhooks/slack",
      githubWebhook: "/api/webhooks/github",
      digestCron: "/api/cron/digest",
    },
  });
}
