import Link from "next/link";
import type { ChatPostingCapability } from "@/lib/6529/chat-post";
import type { ProjectWorkspaceView, WorkspaceTone } from "@/lib/project-workspace-view";
import { ProjectDiscussion } from "./project-discussion";
import { WalletButton } from "./wallet-identity";

function statTone(tone: WorkspaceTone) {
  const tones: Record<WorkspaceTone, string> = {
    neutral: "text-zinc-100",
    cyan: "text-cyan-200",
    lime: "text-lime-200",
    amber: "text-amber-200",
    red: "text-red-200",
  };

  return tones[tone];
}

function statusClass(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("approved") || normalized.includes("complete") || normalized.includes("passed")) {
    return "border-lime-800 bg-lime-950/30 text-lime-200";
  }

  if (normalized.includes("blocked") || normalized.includes("violation")) {
    return "border-red-800 bg-red-950/30 text-red-200";
  }

  if (normalized.includes("decision") || normalized.includes("waiting") || normalized.includes("maintainer")) {
    return "border-amber-800 bg-amber-950/30 text-amber-200";
  }

  return "border-zinc-700 bg-zinc-900 text-zinc-300";
}

function riskClass(risk: ProjectWorkspaceView["workItems"][number]["risk"]) {
  if (risk === "critical") {
    return "text-red-300";
  }

  if (risk === "high") {
    return "text-orange-300";
  }

  if (risk === "medium") {
    return "text-amber-300";
  }

  return "text-zinc-500";
}

function initials(identity: string) {
  return identity
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "B";
}

export function ProjectWorkspace({
  view,
  chatCapability,
}: {
  view: ProjectWorkspaceView;
  chatCapability: ChatPostingCapability;
}) {
  const progress = Math.round((view.milestone.completed / view.milestone.total) * 100);

  return (
    <main className="min-h-screen bg-[#080809] text-zinc-100">
      <div className="mx-auto w-full max-w-[1480px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <header>
          <div className="border-b border-zinc-800 pb-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-xs font-semibold uppercase text-zinc-500">{view.eyebrow}</p>
                <span className="rounded-full border border-cyan-900 bg-cyan-950/30 px-2.5 py-1 text-xs font-semibold text-cyan-200">
                  {view.statusLabel}
                </span>
              </div>
              <WalletButton />
            </div>
            <h1 className="mt-5 text-4xl font-semibold leading-tight text-zinc-50 sm:text-5xl">{view.projectName}</h1>
            <p className="mt-3 text-lg leading-8 text-zinc-300 sm:text-xl">{view.tagline}</p>
          </div>

          <dl className="grid grid-cols-2 border-b border-zinc-800 lg:grid-cols-4">
            {view.stats.map((stat) => (
              <div
                key={stat.label}
                className="min-w-0 border-b border-r border-zinc-800 px-3 py-4 even:border-r-0 lg:border-b-0 lg:border-r lg:px-4 lg:even:border-r lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0"
              >
                <dt className="text-xs font-semibold uppercase text-zinc-600">{stat.label}</dt>
                <dd className={`mt-2 truncate text-base font-semibold ${statTone(stat.tone)}`} title={stat.value}>
                  {stat.value}
                </dd>
                <dd className="mt-1 hidden line-clamp-2 text-sm leading-5 text-zinc-500 sm:block">{stat.detail}</dd>
              </div>
            ))}
          </dl>
        </header>

        {view.decision ? (
          <section className="mt-6 border-y border-amber-900/70 bg-amber-950/20 px-4 py-4 sm:px-5" aria-labelledby="decision-title">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-xs font-semibold uppercase text-amber-300">{view.decision.label}</p>
                  <span className="rounded-full border border-amber-800 px-2.5 py-1 text-xs font-semibold text-amber-200">
                    {view.decision.status}
                  </span>
                </div>
                <h2 id="decision-title" className="mt-2 text-xl font-semibold text-zinc-50">
                  {view.decision.title}
                </h2>
                <p className="mt-1 max-w-4xl text-sm leading-6 text-zinc-400">{view.decision.detail}</p>
              </div>
              {view.decision.href ? (
                <a
                  href={view.decision.href}
                  target="_blank"
                  rel="noreferrer"
                  className="min-h-11 rounded-md bg-amber-300 px-4 py-3 text-sm font-bold text-zinc-950 transition hover:bg-amber-200"
                >
                  Review decision
                </a>
              ) : (
                <a
                  href="#project-brief"
                  className="min-h-11 rounded-md border border-amber-700 px-4 py-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-950/60"
                >
                  Review proposed rules
                </a>
              )}
            </div>
          </section>
        ) : null}

        <div className="mt-7 grid items-start gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(25rem,0.85fr)]">
          <section className="overflow-hidden rounded-md border border-zinc-800 bg-[#0c0c0d]" aria-labelledby="build-title">
            <header className="border-b border-zinc-800 px-5 py-5 sm:px-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-lime-300">Build</p>
                  <h2 id="build-title" className="mt-2 text-2xl font-semibold text-zinc-50">
                    {view.milestone.title}
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">{view.milestone.detail}</p>
                </div>
                <p className="font-mono text-xs text-zinc-500">{view.milestone.label}</p>
              </div>
              <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-zinc-900" aria-label={`${progress}% of pilot milestones complete`}>
                <div className="h-full bg-lime-300" style={{ width: `${progress}%` }} />
              </div>
            </header>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-5 py-3 sm:px-6">
                <p className="text-sm font-semibold text-zinc-200">Open work</p>
                <p className="text-xs text-zinc-600">Rewards wait for approved rules and signed membership</p>
              </div>
              <ol className="divide-y divide-zinc-800">
                {view.workItems.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      aria-label={`View ${item.title}, ${item.status}, reward ${item.reward.status}`}
                      className="group block px-5 py-5 transition hover:bg-zinc-900/40 focus-visible:bg-zinc-900/40 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-cyan-300 sm:px-6"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="font-mono text-xs text-zinc-600">{item.displayId}</span>
                            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(item.status)}`}>
                              {item.status}
                            </span>
                            {item.risk ? (
                              <span className={`text-xs font-semibold ${riskClass(item.risk)}`}>{item.risk} risk</span>
                            ) : null}
                          </div>
                          <h3 className="mt-3 text-xl font-semibold text-zinc-100 transition group-hover:text-cyan-100">
                            {item.title}
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-zinc-500">{item.summary}</p>
                          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-zinc-500">
                            <span>{item.stage}</span>
                            {item.roles.map((role) => (
                              <span key={role} className="text-zinc-400">
                                {role}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs uppercase text-zinc-600">Reward</p>
                          <p className="mt-2 text-sm font-semibold text-amber-200">{item.reward.status}</p>
                          <p className="mt-3 text-xs font-semibold text-zinc-500 transition group-hover:text-zinc-300">View work</p>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <ProjectDiscussion
            waveUrl={view.waveUrl}
            summary={view.discussion.summary}
            initialMessages={view.discussion.messages}
            capability={chatCapability}
            sourceReady={view.mode === "live"}
          />
        </div>

        <section className="mt-8 border-y border-zinc-800 py-6" aria-labelledby="pull-requests-title">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase text-orange-300">Code</p>
              <h2 id="pull-requests-title" className="mt-2 text-2xl font-semibold text-zinc-50">
                Pull requests
              </h2>
            </div>
            {view.repoUrl ? (
              <a
                href={view.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-zinc-300 underline decoration-zinc-700 underline-offset-4 hover:text-zinc-50"
              >
                Open repository
              </a>
            ) : null}
          </div>

          {view.pullRequests.length ? (
            <div className="mt-5 divide-y divide-zinc-800 border-t border-zinc-800">
              {view.pullRequests.map((pullRequest) => (
                <article key={pullRequest.id} className="grid gap-4 py-5 lg:grid-cols-[minmax(0,1fr)_auto]">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-100">{pullRequest.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">{pullRequest.reason}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <span className="rounded-full border border-cyan-900 px-2.5 py-1 text-xs font-semibold text-cyan-200">
                      daemon: {pullRequest.daemonStatus}
                    </span>
                    <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs font-semibold text-zinc-300">
                      reviewer: {pullRequest.reviewerStatus}
                    </span>
                    {pullRequest.url ? (
                      <a
                        href={pullRequest.url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-900"
                      >
                        Open PR
                      </a>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-5 border-t border-zinc-800 py-6">
              <p className="text-base font-semibold text-zinc-200">No real pull requests yet</p>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                PRs will appear here after the repository is selected and builders approve the first scoped change.
              </p>
            </div>
          )}
        </section>

        <section className="mt-8" aria-labelledby="contributors-title">
          <div>
            <p className="text-xs font-semibold uppercase text-lime-300">People</p>
            <h2 id="contributors-title" className="mt-2 text-2xl font-semibold text-zinc-50">
              Contributors
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Profiles will show accepted work, reviews, decisions, and finalized credits. Raw chat activity does not determine rewards.
            </p>
          </div>

          {view.contributors.length ? (
            <div className="mt-5 grid gap-px overflow-hidden rounded-md border border-zinc-800 bg-zinc-800 sm:grid-cols-2 xl:grid-cols-3">
              {view.contributors.map((contributor) => (
                <article key={contributor.identity} className="min-w-0 bg-[#0c0c0d] p-5">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 font-mono text-xs font-bold text-zinc-200">
                      {initials(contributor.identity)}
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-zinc-100">{contributor.identity}</h3>
                      <p className="mt-0.5 text-xs text-zinc-500">{contributor.role}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-zinc-400">{contributor.contribution}</p>
                  <p className="mt-3 border-t border-zinc-800 pt-3 text-xs text-zinc-600">{contributor.vote}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-md border border-dashed border-zinc-800 px-5 py-8">
              <p className="text-base font-semibold text-zinc-200">Builder enrollment has not opened</p>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Verified profiles will appear after admission rules are approved and signed membership is live.
              </p>
            </div>
          )}
        </section>

        <section
          id="project-brief"
          className="mt-8 grid items-start gap-4 lg:grid-cols-2"
          aria-label="Project brief and public proof"
        >
          <details className="rounded-md border border-zinc-800 bg-[#0c0c0d] px-5 py-4" open>
            <summary className="flex min-h-8 items-center justify-between gap-4 text-base font-semibold text-zinc-100">
              <span>Project brief and rules</span>
              <span className="text-xs font-normal text-zinc-600">Proposed</span>
            </summary>
            <div className="mt-4 border-t border-zinc-800 pt-4">
              {view.brief.paragraphs.map((paragraph) => (
                <p key={paragraph} className="mt-2 first:mt-0 text-sm leading-6 text-zinc-400">
                  {paragraph}
                </p>
              ))}
              <ul className="mt-4 divide-y divide-zinc-800 border-y border-zinc-800">
                {view.brief.rules.map((rule) => (
                  <li key={rule} className="py-3 text-sm leading-6 text-zinc-300">
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          </details>

          <details className="rounded-md border border-zinc-800 bg-[#0c0c0d] px-5 py-4">
            <summary className="flex min-h-8 items-center justify-between gap-4 text-base font-semibold text-zinc-100">
              <span>Public proof</span>
              <span className="text-xs font-normal text-zinc-600">{view.proof.status}</span>
            </summary>
            <dl className="mt-4 divide-y divide-zinc-800 border-t border-zinc-800 text-sm">
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-zinc-500">Rules</dt>
                <dd className="font-mono text-zinc-300">{view.proof.rules}</dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-zinc-500">Events</dt>
                <dd className="text-right text-zinc-300">{view.proof.events}</dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-zinc-500">Rewards</dt>
                <dd className="text-right text-zinc-300">{view.proof.reward}</dd>
              </div>
            </dl>
          </details>
        </section>

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-800 py-6 text-xs text-zinc-600">
          <p>Built in public. Humans control merges, deployment, and economics.</p>
          <p>daemon coordinates. Independent review is still being selected.</p>
        </footer>
      </div>
    </main>
  );
}
