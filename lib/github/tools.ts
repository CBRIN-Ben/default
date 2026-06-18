import { tool } from "ai";
import { z } from "zod";
import {
  getRepositoryStatus,
  listRepositories,
  searchAcrossRepositories,
} from "./client";

export const githubTools = {
  listRepositories: tool({
    description:
      "List GitHub repositories the bot can access, sorted by recent activity.",
    inputSchema: z.object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .default(15)
        .describe("Maximum number of repositories to return"),
    }),
    execute: async ({ limit }) => {
      const repositories = await listRepositories(limit);
      return { count: repositories.length, repositories };
    },
  }),

  getRepositoryStatus: tool({
    description:
      "Get a snapshot of one repository: open PRs, open issues, and recent commits.",
    inputSchema: z.object({
      repository: z
        .string()
        .describe('Repository in "owner/repo" format, e.g. "vercel/next.js"'),
    }),
    execute: async ({ repository }) => getRepositoryStatus(repository),
  }),

  searchIssues: tool({
    description:
      "Search open issues across accessible repositories using GitHub issue search syntax.",
    inputSchema: z.object({
      query: z
        .string()
        .describe(
          'Search query, e.g. "bug label:priority repo:owner/repo" or "auth"',
        ),
      limit: z.number().int().min(1).max(20).default(10),
    }),
    execute: async ({ query, limit }) => {
      const results = await searchAcrossRepositories(query, limit);
      return { count: results.length, results };
    },
  }),
};
