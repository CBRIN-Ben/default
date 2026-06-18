export default function Home() {
  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground sm:px-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
        <header className="flex flex-col gap-3 border-b border-black/10 pb-8 dark:border-white/10">
          <p className="font-mono text-sm uppercase tracking-normal text-zinc-500">
            Chat SDK + GitHub + AI
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight">
            Repo Watch
          </h1>
          <p className="max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
            Monitor GitHub repositories from Slack. Get daily digests, live
            webhook updates, and ask @repo-watch questions about progress across
            your repos.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            ["Daily digest", "/api/cron/digest"],
            ["Slack webhook", "/api/webhooks/slack"],
            ["GitHub webhook", "/api/webhooks/github"],
          ].map(([label, value]) => (
            <div
              className="rounded-lg border border-black/10 p-5 dark:border-white/10"
              key={label}
            >
              <p className="text-sm text-zinc-500">{label}</p>
              <p className="mt-2 font-mono text-sm">{value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div>
            <h2 className="text-xl font-medium">How to use</h2>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              <li>1. Connect Slack and GitHub via Vercel Connect.</li>
              <li>2. Set DIGEST_CHANNEL_ID to your #repo-watch channel.</li>
              <li>3. Add a GitHub webhook pointing at /api/webhooks/github.</li>
              <li>4. @mention the bot to ask about repo status and progress.</li>
            </ol>
          </div>
          <div>
            <h2 className="text-xl font-medium">Example questions</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              <li>@repo-watch list my active repositories</li>
              <li>@repo-watch what&apos;s open in owner/repo?</li>
              <li>@repo-watch any recent commits on main?</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
