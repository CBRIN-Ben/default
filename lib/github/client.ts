import { getToken } from "@vercel/connect";

const GITHUB_API_VERSION = "2022-11-28";

export type RepositorySummary = {
  name: string;
  visibility: "public" | "private";
  description: string | null;
  defaultBranch: string;
  updatedAt: string;
  openIssues: number;
  url: string;
};

export type PullRequestSummary = {
  number: number;
  title: string;
  state: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  url: string;
  draft: boolean;
};

export type IssueSummary = {
  number: number;
  title: string;
  state: string;
  author: string;
  labels: string[];
  createdAt: string;
  updatedAt: string;
  url: string;
};

export type CommitSummary = {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
};

type GitHubRepository = {
  archived?: boolean;
  default_branch?: string;
  description?: string | null;
  disabled?: boolean;
  full_name: string;
  html_url?: string;
  open_issues_count?: number;
  private: boolean;
  pushed_at?: string;
  updated_at?: string;
};

export async function getGitHubToken() {
  const connector = process.env.CONNECTOR_GITHUB;

  if (connector) {
    return getToken(connector, { subject: { type: "app" } });
  }

  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    throw new Error(
      "GitHub auth is not configured. Set CONNECTOR_GITHUB or GITHUB_TOKEN.",
    );
  }

  return token;
}

export async function listRepositories(limit = 25) {
  const token = await getGitHubToken();
  const installationRepos = await fetchInstallationRepositories(token);

  const repositories =
    installationRepos.length > 0
      ? installationRepos
      : await fetchUserRepositories(token);

  return repositories
    .filter((repository) => !repository.archived && !repository.disabled)
    .slice(0, limit)
    .map(toRepositorySummary);
}

export async function getRepositoryStatus(fullName: string) {
  const [owner, repo] = parseRepository(fullName);
  const token = await getGitHubToken();
  const response = await fetchGitHub(
    new URL(`https://api.github.com/repos/${owner}/${repo}`),
    token,
  );

  if (!response.ok) {
    throw new Error(
      `Could not load ${fullName}. Check the repository name and connector access.`,
    );
  }

  const repository = (await response.json()) as GitHubRepository;
  const [pullRequests, issues, commits] = await Promise.all([
    listPullRequests(fullName, "open", 10),
    listIssues(fullName, "open", 10),
    listRecentCommits(fullName, repository.default_branch ?? "main", 5),
  ]);

  return {
    repository: toRepositorySummary(repository),
    openPullRequests: pullRequests,
    openIssues: issues,
    recentCommits: commits,
  };
}

export async function listPullRequests(
  fullName: string,
  state: "open" | "closed" | "all" = "open",
  limit = 10,
) {
  const [owner, repo] = parseRepository(fullName);
  const token = await getGitHubToken();
  const url = new URL(`https://api.github.com/repos/${owner}/${repo}/pulls`);
  url.searchParams.set("state", state);
  url.searchParams.set("sort", "updated");
  url.searchParams.set("direction", "desc");
  url.searchParams.set("per_page", String(limit));

  const response = await fetchGitHub(url, token);

  if (!response.ok) {
    throw new Error(`Could not load pull requests for ${fullName}.`);
  }

  const pullRequests = (await response.json()) as Array<{
    number: number;
    title: string;
    state: string;
    draft?: boolean;
    html_url: string;
    created_at: string;
    updated_at: string;
    user?: { login?: string };
  }>;

  return pullRequests.map((pullRequest) => ({
    number: pullRequest.number,
    title: pullRequest.title,
    state: pullRequest.state,
    author: pullRequest.user?.login ?? "unknown",
    createdAt: pullRequest.created_at,
    updatedAt: pullRequest.updated_at,
    url: pullRequest.html_url,
    draft: Boolean(pullRequest.draft),
  })) satisfies PullRequestSummary[];
}

export async function listIssues(
  fullName: string,
  state: "open" | "closed" | "all" = "open",
  limit = 10,
) {
  const [owner, repo] = parseRepository(fullName);
  const token = await getGitHubToken();
  const url = new URL(`https://api.github.com/repos/${owner}/${repo}/issues`);
  url.searchParams.set("state", state);
  url.searchParams.set("sort", "updated");
  url.searchParams.set("direction", "desc");
  url.searchParams.set("per_page", String(limit));

  const response = await fetchGitHub(url, token);

  if (!response.ok) {
    throw new Error(`Could not load issues for ${fullName}.`);
  }

  const issues = (await response.json()) as Array<{
    number: number;
    title: string;
    state: string;
    html_url: string;
    created_at: string;
    updated_at: string;
    pull_request?: unknown;
    user?: { login?: string };
    labels?: Array<{ name?: string }>;
  }>;

  return issues
    .filter((issue) => !issue.pull_request)
    .map((issue) => ({
      number: issue.number,
      title: issue.title,
      state: issue.state,
      author: issue.user?.login ?? "unknown",
      labels:
        issue.labels
          ?.map((label) => label.name)
          .filter((name): name is string => Boolean(name)) ?? [],
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      url: issue.html_url,
    })) satisfies IssueSummary[];
}

export async function listRecentCommits(
  fullName: string,
  branch = "main",
  limit = 5,
) {
  const [owner, repo] = parseRepository(fullName);
  const token = await getGitHubToken();
  const url = new URL(
    `https://api.github.com/repos/${owner}/${repo}/commits`,
  );
  url.searchParams.set("sha", branch);
  url.searchParams.set("per_page", String(limit));

  const response = await fetchGitHub(url, token);

  if (!response.ok) {
    throw new Error(`Could not load commits for ${fullName}.`);
  }

  const commits = (await response.json()) as Array<{
    sha: string;
    html_url: string;
    commit: {
      message: string;
      author?: { name?: string; date?: string };
    };
  }>;

  return commits.map((commit) => ({
    sha: commit.sha.slice(0, 7),
    message: commit.commit.message.split("\n")[0] ?? commit.commit.message,
    author: commit.commit.author?.name ?? "unknown",
    date: commit.commit.author?.date ?? "",
    url: commit.html_url,
  })) satisfies CommitSummary[];
}

export async function searchAcrossRepositories(query: string, limit = 10) {
  const token = await getGitHubToken();
  const url = new URL("https://api.github.com/search/issues");
  url.searchParams.set("q", `${query} is:issue is:open sort:updated-desc`);
  url.searchParams.set("per_page", String(limit));

  const response = await fetchGitHub(url, token);

  if (!response.ok) {
    throw new Error("GitHub search failed.");
  }

  const payload = (await response.json()) as {
    items?: Array<{
      number: number;
      title: string;
      state: string;
      html_url: string;
      repository_url: string;
      created_at: string;
      updated_at: string;
      user?: { login?: string };
      labels?: Array<{ name?: string }>;
    }>;
  };

  return (payload.items ?? []).map((item) => ({
    repository: item.repository_url.split("/repos/")[1] ?? "unknown",
    number: item.number,
    title: item.title,
    state: item.state,
    author: item.user?.login ?? "unknown",
    labels:
      item.labels
        ?.map((label) => label.name)
        .filter((name): name is string => Boolean(name)) ?? [],
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    url: item.html_url,
  }));
}

function parseRepository(fullName: string) {
  const [owner, repo] = fullName.split("/");

  if (!owner || !repo) {
    throw new Error(`Invalid repository "${fullName}". Use "owner/repo".`);
  }

  return [owner, repo] as const;
}

function toRepositorySummary(repository: GitHubRepository): RepositorySummary {
  return {
    name: repository.full_name,
    visibility: repository.private ? "private" : "public",
    description: repository.description ?? null,
    defaultBranch: repository.default_branch ?? "main",
    updatedAt: repository.pushed_at ?? repository.updated_at ?? "",
    openIssues: repository.open_issues_count ?? 0,
    url: repository.html_url ?? `https://github.com/${repository.full_name}`,
  };
}

async function fetchInstallationRepositories(token: string) {
  const url = new URL("https://api.github.com/installation/repositories");
  url.searchParams.set("per_page", "100");

  const response = await fetchGitHub(url, token);

  if (
    response.status === 404 ||
    (response.status === 403 &&
      response.headers.get("x-ratelimit-remaining") !== "0")
  ) {
    return [];
  }

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as { repositories?: GitHubRepository[] };
  return data.repositories ?? [];
}

async function fetchUserRepositories(token: string) {
  const url = new URL("https://api.github.com/user/repos");
  url.searchParams.set("affiliation", "owner,collaborator,organization_member");
  url.searchParams.set("sort", "pushed");
  url.searchParams.set("direction", "desc");
  url.searchParams.set("per_page", "100");

  const response = await fetchGitHub(url, token);

  if (!response.ok) {
    throw new Error("Could not list GitHub repositories.");
  }

  return (await response.json()) as GitHubRepository[];
}

function fetchGitHub(url: URL, token: string) {
  return fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": GITHUB_API_VERSION,
    },
  });
}
