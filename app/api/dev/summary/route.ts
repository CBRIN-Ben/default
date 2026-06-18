import { NextResponse } from "next/server";
import {
  getRepositoryStatus,
  listRepositories,
} from "@/lib/github/client";

export async function GET() {
  try {
    const repositories = await listRepositories(15);
    const lines: string[] = [
      `*Repo Watch summary* — ${new Date().toUTCString()}`,
      "",
      `*Repositories (${repositories.length})*`,
    ];

    for (const repo of repositories) {
      lines.push(
        `• \`${repo.name}\` — ${repo.openIssues} open issue${repo.openIssues === 1 ? "" : "s"}, updated ${formatRelative(repo.updatedAt)}`,
      );
    }

    lines.push("");

    if (repositories.length > 0) {
      const top = repositories[0];
      const status = await getRepositoryStatus(top.name);

      lines.push(`*Latest activity: ${top.name}*`);

      if (status.openPullRequests.length > 0) {
        lines.push("", "*Open PRs*");
        for (const pr of status.openPullRequests.slice(0, 5)) {
          lines.push(`• #${pr.number} ${pr.title} (@${pr.author})`);
        }
      } else {
        lines.push("", "_No open pull requests_");
      }

      if (status.openIssues.length > 0) {
        lines.push("", "*Open issues*");
        for (const issue of status.openIssues.slice(0, 5)) {
          lines.push(`• #${issue.number} ${issue.title} (@${issue.author})`);
        }
      }

      if (status.recentCommits.length > 0) {
        lines.push("", "*Recent commits*");
        for (const commit of status.recentCommits.slice(0, 5)) {
          lines.push(`• \`${commit.sha}\` ${commit.message} — ${commit.author}`);
        }
      }
    }

    lines.push("", "_Ask in Cursor: “what’s happening with my repos?” to get updates posted here._");

    return NextResponse.json({
      ok: true,
      markdown: lines.join("\n"),
      repositories,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 503 },
    );
  }
}

function formatRelative(iso: string) {
  if (!iso) {
    return "unknown";
  }

  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.round(diffMs / (1000 * 60 * 60));

  if (hours < 1) {
    return "just now";
  }

  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.round(hours / 24)}d ago`;
}
