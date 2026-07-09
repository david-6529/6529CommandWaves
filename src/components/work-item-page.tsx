import Link from "next/link";
import type { ProjectWorkspaceView, WorkspaceWorkItem } from "@/lib/project-workspace-view";
import { WalletButton } from "./wallet-identity";

function statusClass(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("recorded") || normalized.includes("approved") || normalized.includes("complete")) {
    return "border-lime-800 bg-lime-950/30 text-lime-200";
  }

  if (normalized.includes("blocked") || normalized.includes("failed")) {
    return "border-red-800 bg-red-950/30 text-red-200";
  }

  if (normalized.includes("open")) {
    return "border-cyan-800 bg-cyan-950/30 text-cyan-200";
  }

  if (
    normalized.includes("need") ||
    normalized.includes("wait") ||
    normalized.includes("not started") ||
    normalized.includes("not connected") ||
    normalized.includes("not claimable")
  ) {
    return "border-amber-800 bg-amber-950/30 text-amber-200";
  }

  return "border-zinc-700 bg-zinc-900 text-zinc-300";
}

function riskLabel(risk: WorkspaceWorkItem["risk"]) {
  return risk ? `${risk} risk` : "Not classified";
}

function riskClass(risk: WorkspaceWorkItem["risk"]) {
  if (risk === "critical") {
    return "text-red-300";
  }

  if (risk === "high") {
    return "text-orange-300";
  }

  if (risk === "medium") {
    return "text-amber-300";
  }

  return "text-zinc-300";
}

function ScopeList({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-[15px] leading-6 text-zinc-300">
          <span className="mt-2.5 size-1.5 shrink-0 bg-zinc-600" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function WorkItemPage({ view, item }: { view: ProjectWorkspaceView; item: WorkspaceWorkItem }) {
  return (
    <main className="min-h-screen bg-[#080809] text-zinc-100">
      <div className="mx-auto w-full max-w-[1320px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <header className="border-b border-zinc-800 pb-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Link
                href="/"
                className="text-sm font-semibold text-zinc-400 underline decoration-zinc-700 underline-offset-4 transition hover:text-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
              >
                Back to project
              </Link>
              <p className="mt-4 text-xs font-semibold uppercase text-zinc-600">{view.eyebrow}</p>
              <p className="mt-1 truncate text-sm font-semibold text-zinc-300">{view.projectName}</p>
            </div>
            <WalletButton />
          </div>

          <div className="mt-9">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-xs text-zinc-600">{item.displayId}</span>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(item.status)}`}>
                {item.status}
              </span>
            </div>
            <h1 className="mt-4 max-w-5xl text-3xl font-semibold leading-tight text-zinc-50 sm:text-5xl">{item.title}</h1>
            <p className="mt-4 max-w-4xl text-lg leading-8 text-zinc-400">{item.summary}</p>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/#discussion"
              className="inline-flex min-h-11 items-center rounded-md bg-cyan-300 px-5 text-sm font-bold text-zinc-950 transition hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
            >
              Join discussion
            </Link>
            {item.code.pullRequestUrl ? (
              <a
                href={item.code.pullRequestUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center rounded-md border border-zinc-700 px-4 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
              >
                Open pull request
              </a>
            ) : item.code.repoUrl ? (
              <a
                href={item.code.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center rounded-md border border-zinc-700 px-4 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
              >
                Open repository
              </a>
            ) : null}
          </div>
        </header>

        <dl className="grid grid-cols-2 border-b border-zinc-800 lg:grid-cols-4">
          <div className="border-b border-r border-zinc-800 px-3 py-4 lg:border-b-0 lg:first:pl-0">
            <dt className="text-xs font-semibold uppercase text-zinc-600">Stage</dt>
            <dd className="mt-2 text-sm font-semibold text-zinc-200">{item.stage}</dd>
          </div>
          <div className="border-b border-zinc-800 px-3 py-4 lg:border-b-0 lg:border-r">
            <dt className="text-xs font-semibold uppercase text-zinc-600">Risk</dt>
            <dd className={`mt-2 text-sm font-semibold ${riskClass(item.risk)}`}>{riskLabel(item.risk)}</dd>
          </div>
          <div className="border-r border-zinc-800 px-3 py-4 lg:border-r">
            <dt className="text-xs font-semibold uppercase text-zinc-600">Decision</dt>
            <dd className="mt-2 text-sm font-semibold text-zinc-200">{item.decision.status}</dd>
          </div>
          <div className="px-3 py-4 lg:last:pr-0">
            <dt className="text-xs font-semibold uppercase text-zinc-600">Reward</dt>
            <dd className="mt-2 text-sm font-semibold text-amber-200">{item.reward.status}</dd>
          </div>
        </dl>

        <div className="mt-8 grid overflow-hidden rounded-md border border-zinc-800 bg-[#0c0c0d] lg:grid-cols-[minmax(0,1.12fr)_minmax(22rem,0.88fr)]">
          <div className="min-w-0 p-5 sm:p-7 lg:border-r lg:border-zinc-800">
            <section aria-labelledby="scope-title">
              <p className="text-xs font-semibold uppercase text-lime-300">Work definition</p>
              <h2 id="scope-title" className="mt-2 text-2xl font-semibold text-zinc-50">
                Scope
              </h2>

              <div className="mt-7 grid gap-7 xl:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">What this should deliver</h3>
                  <ScopeList items={item.deliverables} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">Constraints</h3>
                  <ScopeList items={item.constraints} />
                </div>
              </div>
            </section>

            <section className="mt-8 border-t border-zinc-800 pt-6" aria-labelledby="roles-title">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 id="roles-title" className="text-lg font-semibold text-zinc-100">
                    Roles
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
                    Roles are descriptive until signed membership and task credits are active.
                  </p>
                </div>
                <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs font-semibold text-zinc-400">
                  Not open
                </span>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {item.roles.map((role) => (
                  <span key={role} className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-semibold text-zinc-300">
                    {role}
                  </span>
                ))}
              </div>
            </section>

            <section className="mt-8 border-t border-zinc-800 pt-6" aria-labelledby="reward-title">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="reward-title" className="text-lg font-semibold text-zinc-100">
                  Reward state
                </h2>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(item.reward.status)}`}>
                  {item.reward.status}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-zinc-500">{item.reward.detail}</p>
            </section>
          </div>

          <aside className="min-w-0 border-t border-zinc-800 lg:border-t-0" aria-label="Work status and evidence">
            <section className="p-5 sm:p-7" aria-labelledby="work-decision-title">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="work-decision-title" className="text-lg font-semibold text-zinc-100">
                  Group decision
                </h2>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(item.decision.status)}`}>
                  {item.decision.status}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-zinc-500">{item.decision.detail}</p>
              {item.decision.href ? (
                <a
                  href={item.decision.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-block text-sm font-semibold text-zinc-300 underline decoration-zinc-700 underline-offset-4 hover:text-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
                >
                  Open decision
                </a>
              ) : null}
            </section>

            <section className="border-t border-zinc-800 p-5 sm:p-7" aria-labelledby="code-status-title">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="code-status-title" className="text-lg font-semibold text-zinc-100">
                  Code and review
                </h2>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(item.code.status)}`}>
                  {item.code.status}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-zinc-500">{item.code.detail}</p>
              <dl className="mt-5 divide-y divide-zinc-800 border-y border-zinc-800 text-sm">
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-zinc-500">daemon</dt>
                  <dd className="font-semibold text-zinc-300">{item.code.daemonStatus}</dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-zinc-500">Review agent</dt>
                  <dd className="font-semibold text-zinc-300">{item.code.reviewerStatus}</dd>
                </div>
              </dl>
            </section>

            <section className="border-t border-zinc-800 p-5 sm:p-7" aria-labelledby="evidence-title">
              <h2 id="evidence-title" className="text-lg font-semibold text-zinc-100">
                Evidence
              </h2>
              {item.evidence.length ? (
                <dl className="mt-4 divide-y divide-zinc-800 border-y border-zinc-800">
                  {item.evidence.map((evidence) => (
                    <div key={evidence.label} className="py-3">
                      <dt className="text-xs font-semibold uppercase text-zinc-600">{evidence.label}</dt>
                      <dd className="mt-1 break-all font-mono text-xs leading-5 text-zinc-300">
                        {evidence.href ? (
                          <a
                            href={evidence.href}
                            target="_blank"
                            rel="noreferrer"
                            className="underline decoration-zinc-700 underline-offset-4 hover:text-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
                          >
                            {evidence.value}
                          </a>
                        ) : (
                          evidence.value
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="mt-3 text-sm leading-6 text-zinc-500">
                  No group decision, pull request, or repo-bound review proof is recorded for this work.
                </p>
              )}
            </section>
          </aside>
        </div>

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-800 py-6 text-xs leading-5 text-zinc-600">
          <p>daemon derives this page from project decisions, code records, and review evidence.</p>
          <p>Humans control membership, merges, deployment, and rewards.</p>
        </footer>
      </div>
    </main>
  );
}
