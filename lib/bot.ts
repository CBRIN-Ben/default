import { createSlackAdapter } from "@chat-adapter/slack";
import { createMemoryState } from "@chat-adapter/state-memory";
import { createRedisState } from "@chat-adapter/state-redis";
import { getToken } from "@vercel/connect";
import { Chat } from "chat";
import { registerAgentHandlers } from "@/lib/agent";

let bot: Chat | null = null;

function getSlackBotToken() {
  const connector = process.env.CONNECTOR_SLACK;

  if (connector) {
    return getToken(connector, { subject: { type: "app" } });
  }

  const token = process.env.SLACK_BOT_TOKEN;

  if (!token) {
    throw new Error(
      "Slack auth is not configured. Set CONNECTOR_SLACK or SLACK_BOT_TOKEN.",
    );
  }

  return token;
}

function verifyConnectForwardedSlackRequest() {
  // Vercel Connect verifies Slack events before forwarding them to this app.
  return true;
}

function createBotState() {
  if (process.env.REDIS_URL) {
    return createRedisState();
  }

  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[repo-watch] REDIS_URL not set — using in-memory state (dev only)",
    );
    return createMemoryState();
  }

  throw new Error(
    "REDIS_URL is required in production. Use Upstash Redis or set NODE_ENV=development for local dev.",
  );
}

export function getBot() {
  if (!bot) {
    bot = new Chat({
      userName: process.env.BOT_USER_NAME ?? "repo-watch",
      adapters: {
        slack: process.env.CONNECTOR_SLACK
          ? createSlackAdapter({
              botToken: getSlackBotToken,
              webhookVerifier: verifyConnectForwardedSlackRequest,
            })
          : createSlackAdapter({
              botToken: getSlackBotToken,
            }),
      },
      state: createBotState(),
      dedupeTtlMs: 600_000,
    }).registerSingleton();

    registerAgentHandlers(bot);
  }

  return bot;
}
