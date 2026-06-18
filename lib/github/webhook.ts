import { createHmac, timingSafeEqual } from "node:crypto";
import { getBot } from "@/lib/bot";

type GitHubWebhookPayload = {
  action?: string;
  ref?: string;
  repository?: {
    full_name?: string;
    html_url?: string;
  };
  sender?: {
    login?: string;
  };
  commits?: Array<{
    message?: string;
  }>;
  compare?: string;
  pull_request?: {
    number?: number;
    title?: string;
    html_url?: string;
    state?: string;
    merged?: boolean;
    draft?: boolean;
    user?: { login?: string };
  };
  issue?: {
    number?: number;
    title?: string;
    html_url?: string;
    state?: string;
    user?: { login?: string };
  };
  release?: {
    tag_name?: string;
    name?: string;
    html_url?: string;
    author?: { login?: string };
  };
  workflow_run?: {
    name?: string;
    status?: string;
    conclusion?: string;
    html_url?: string;
    head_branch?: string;
  };
};

export function verifyGitHubWebhookSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string,
) {
  if (!signatureHeader?.startsWith("sha256=")) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const received = signatureHeader.slice("sha256=".length);

  if (expected.length !== received.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

export async function postGitHubEventToSlack(
  event: string,
  payload: GitHubWebhookPayload,
) {
  const channelId = process.env.DIGEST_CHANNEL_ID;

  if (!channelId) {
    throw new Error("DIGEST_CHANNEL_ID is not configured.");
  }

  const message = formatGitHubEvent(event, payload);

  if (!message) {
    return { posted: false, reason: "ignored" };
  }

  await getBot().channel(channelId).post(message);

  return { posted: true, channelId };
}

function formatGitHubEvent(event: string, payload: GitHubWebhookPayload) {
  const repo = payload.repository?.full_name ?? "unknown repository";
  const actor = payload.sender?.login ?? "someone";

  switch (event) {
    case "push": {
      const branch = payload.ref?.replace("refs/heads/", "") ?? "unknown";
      const commitCount = payload.commits?.length ?? 0;
      const latestMessage = payload.commits?.at(-1)?.message?.split("\n")[0];

      return (
        `*Push* to \`${repo}\` on \`${branch}\` by *${actor}*\n` +
        `${commitCount} commit${commitCount === 1 ? "" : "s"}` +
        (latestMessage ? `\nLatest: ${latestMessage}` : "") +
        (payload.compare ? `\n<${payload.compare}|Compare>` : "")
      );
    }

    case "pull_request": {
      const pullRequest = payload.pull_request;
      if (!pullRequest) {
        return null;
      }

      const action = payload.action ?? "updated";
      const draft = pullRequest.draft ? " (draft)" : "";
      const merged =
        action === "closed" && pullRequest.merged ? " and merged" : "";

      return (
        `*Pull request ${action}${merged}* in \`${repo}\`${draft}\n` +
        `#${pullRequest.number} ${pullRequest.title}\n` +
        `By *${pullRequest.user?.login ?? actor}*` +
        (pullRequest.html_url ? `\n<${pullRequest.html_url}|View PR>` : "")
      );
    }

    case "issues": {
      const issue = payload.issue;
      if (!issue) {
        return null;
      }

      return (
        `*Issue ${payload.action ?? "updated"}* in \`${repo}\`\n` +
        `#${issue.number} ${issue.title}\n` +
        `By *${issue.user?.login ?? actor}*` +
        (issue.html_url ? `\n<${issue.html_url}|View issue>` : "")
      );
    }

    case "release": {
      const release = payload.release;
      if (!release || payload.action !== "published") {
        return null;
      }

      return (
        `*Release published* in \`${repo}\`\n` +
        `${release.name ?? release.tag_name}\n` +
        `By *${release.author?.login ?? actor}*` +
        (release.html_url ? `\n<${release.html_url}|View release>` : "")
      );
    }

    case "workflow_run": {
      const run = payload.workflow_run;
      if (!run || payload.action !== "completed") {
        return null;
      }

      return (
        `*Workflow ${run.conclusion ?? run.status}* in \`${repo}\`\n` +
        `${run.name} on \`${run.head_branch ?? "unknown"}\`\n` +
        (run.html_url ? `<${run.html_url}|View run>` : "")
      );
    }

    default:
      return null;
  }
}
