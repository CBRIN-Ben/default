import { ToolLoopAgent } from "ai";
import { toAiMessages } from "chat/ai";
import type { Chat, Thread } from "chat";
import { githubTools } from "@/lib/github/tools";

const agent = new ToolLoopAgent({
  model: process.env.AGENT_MODEL ?? "anthropic/claude-sonnet-4.6",
  instructions:
    "You are Repo Watch, an assistant in Slack that helps teams track GitHub repositories. " +
    "Use your tools to fetch live repository data before answering. " +
    "Summarize progress clearly with repo names, PR/issue numbers, and links when available. " +
    "Keep responses concise and formatted for Slack (short paragraphs, bullet lists). " +
    "If a repository is missing, say so and suggest checking the GitHub connector installation.",
  tools: githubTools,
});

export async function handleNewMention(thread: Thread, messageText: string) {
  await thread.subscribe();
  await thread.startTyping();

  const result = await agent.stream({
    prompt: messageText,
  });

  await thread.post(result.fullStream);
}

export async function handleSubscribedMessage(thread: Thread) {
  const allMessages = [];

  for await (const message of thread.allMessages) {
    allMessages.push(message);
  }

  const history = await toAiMessages(allMessages);
  await thread.startTyping();

  const result = await agent.stream({
    messages: history,
  });

  await thread.post(result.fullStream);
}

export function registerAgentHandlers(bot: Chat) {
  bot.onNewMention(async (thread, message) => {
    await handleNewMention(thread, message.text);
  });

  bot.onSubscribedMessage(async (thread) => {
    await handleSubscribedMessage(thread);
  });
}
