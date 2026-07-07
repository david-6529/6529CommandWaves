import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CommandWavesConsole } from "./command-waves-console";

function renderedConsoleText() {
  return renderToStaticMarkup(<CommandWavesConsole />)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function renderedConsoleHtml() {
  return renderToStaticMarkup(<CommandWavesConsole />);
}

describe("CommandWavesConsole", () => {
  it("renders the simple public hook workspace contract", () => {
    const text = renderedConsoleText();

    expect(text).toContain("Decentralized Coding: Beta");
    expect(text).toContain("Pilot: 6529 AMM hook");
    expect(text).toContain("Join a swarm of builders creating a hook together through chat, decisions, pull requests, and reviews.");
    expect(text).toContain("Wallet");
    expect(text).toContain("Access is manual for now.");
    expect(text).toContain("Connect wallet");
    expect(text).toContain("Project summary");
    expect(text).toContain("daemon managed");
    expect(text).toContain("Working snapshot for the 6529 AMM hook build.");
    expect(text).toContain("Builders turn chat into decisions, PRs, reviews, and a public log.");
    expect(text).toContain("Focus: Draft the non-upgradeable hook scaffold.");
    expect(text).toContain("Next: Select the GitHub repo before PR work can run.");
    expect(text).toContain("Repo not selected yet. PR work waits.");
    expect(text).toContain("daemon keeps the log current.");
    expect(text).toContain("Review agent and GitHub repo are placeholders for this phase.");
    expect(text).toContain("Select the repo before PR work starts.");
    expect(text).toContain("GitHub repo placeholder");
    expect(text).toContain("Changelog");
    expect(text).toContain("Rules");
    expect(text).toContain("Who can join?");
    expect(text).toContain("How do I join?");
    expect(text).toContain("How does work start?");
    expect(text).toContain("How are PRs approved?");
    expect(text).toContain("Who merges?");
    expect(text).toContain("Everything starts in chat.");
    expect(text).toContain("Connect wallet if you want, then use Request access in chat.");
    expect(text).toContain("Current work");
    expect(text).toContain("repo needed");
    expect(text).toContain("Draft hook scaffold");
    expect(text).toContain("Next");
    expect(text).toContain("Select the repo");
    expect(text).toContain("Select repo");
    expect(text).toContain("Decision");
    expect(text).toContain("5 yes, 1 no. Decision link recorded.");
    expect(text).toContain("GitHub repo");
    expect(text).toContain("Placeholder until selected.");
    expect(text).toContain("This default is only a placeholder. Select the real hook repo before creating PR work.");
    expect(text).toContain("Select the GitHub repo before the PR build step.");
    expect(text).toContain("Repo setup needed");
    expect(text).toContain("Project chat");
    expect(text).toContain("General");
    expect(text).toContain("Build");
    expect(text).toContain("Review");
    expect(text).toContain("Questions, ideas, risks, and work all start here.");
    expect(text).toContain("Repo setup");
    expect(text).toContain("Post to chat");
    expect(text).toContain("Save as work");
    expect(text).toContain("Recent chat");
    expect(text).toContain("Builders");
    expect(text).toContain("Profiles show visible chat, PR, and review activity.");
    expect(text).toContain("Visible contribution");
    expect(text).toContain("1 report point");
    expect(text).not.toContain("1 report points");
    expect(text).toContain("Build reference");
    expect(text).toContain("Access notes, reports, and code checks for builders who want the details.");
    expect(text).toContain("The group records a project decision before PR work starts.");
    expect(text).toContain("Review approval is manual in this phase.");
    expect(text).toContain("Report points summarize visible work only.");
    expect(text).toContain("They do not grant access, payouts, or merge rights.");
    expect(text).toContain("Start in chat so builders can shape the idea.");
    expect(text).toContain("Save the scoped work once builders can see it.");
    expect(text).toContain("Use GitHub PRs once the repo is connected.");
    expect(text).toContain("Scope work");
    expect(text).toContain("Save scoped work");
    expect(text).toContain("Chat launch");
    expect(text).toContain("PR loop");
    expect(text).toContain("Project log");
    expect(text).toContain("/api/command-wave/verification/manifest");
  });

  it("links the current blocker to the repo setup field", () => {
    const html = renderedConsoleHtml();

    expect(html).toContain(">Select repo</button>");
    expect(html).toContain('id="project-repo-url"');
    expect(html).toContain('id="project-access-key"');
    expect(html).toContain("Maintainer setup");
  });

  it("does not bring back removed homepage clutter or old positioning copy", () => {
    const text = renderedConsoleText();

    expect(text).not.toContain("Build the 6529 hook together");
    expect(text).not.toContain("Public hook build");
    expect(text).not.toContain("A public build room for the 6529 hook.");
    expect(text).not.toContain("6529 profile");
    expect(text).not.toContain("Use this like a normal project chat");
    expect(text).not.toContain("Project details");
    expect(text).not.toContain("All member activity");
    expect(text).not.toContain("Activity report:");
    expect(text).not.toContain("not access or merge authority");
    expect(text).not.toContain("What needs attention");
    expect(text).not.toContain("Next move");
    expect(text).not.toContain("Swarm chat");
    expect(text).not.toContain("Suggest work");
    expect(text).not.toContain("A shared room for people and agents");
    expect(text).not.toContain("Room discussion");
    expect(text).not.toContain("Project discussion");
    expect(text).not.toContain("Chat with builders");
    expect(text).not.toContain("The same box starts the work.");
    expect(text).not.toContain("Discuss repo setup");
    expect(text).not.toContain("Save work item");
    expect(text).not.toContain("Post message");
    expect(text).not.toContain("\u2014");
    expect(text).not.toContain("Gate");
    expect(text).not.toContain("gate unset");
    expect(text).not.toContain("Participation gate is not set yet.");
    expect(text).not.toContain("Build details");
    expect(text).not.toContain("orchestrator managed");
    expect(text).not.toContain("This project coordinates one hook build through chat, decisions, PRs, review, and a clear log.");
    expect(text).not.toContain("production reviewer service is wired");
    expect(text).not.toContain("Review agent approval is a placeholder until wired");
    expect(text).not.toContain("The top Rules accordion is the plain-English source");
    expect(text).not.toContain("tool access");
    expect(text).not.toContain("Add real repo before PR build.");
    expect(text).not.toContain("Set a real GitHub repo");
    expect(text).not.toContain("Optional demo tally only");
    expect(text).not.toContain("Add demo yes");
    expect(text).not.toContain("Add demo no");
    expect(text).not.toContain("Posted to mock chat");
  });

  it("keeps optional advanced sections on the dark app surface", () => {
    const html = renderedConsoleHtml();

    expect(html).toContain('id="more-tools"');
    expect(html).toContain('id="reports"');
    expect(html).toContain("dark-app");
    expect(html).toContain("advanced-dark-surface");
    expect(html).toContain("bg-zinc-950");
  });

  it("keeps project chat as an open accordion with chat tabs", () => {
    const html = renderedConsoleHtml();

    expect(html).toContain('<details id="project-chat"');
    expect(html).toContain('open="">');
    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-label="Project chat sections"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('id="project-chat-tab-general"');
    expect(html).toContain('aria-controls="project-chat-panel-general"');
    expect(html).toContain('id="project-chat-panel-general"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('aria-labelledby="project-chat-tab-general"');
    expect(html).toContain(">General</button>");
    expect(html).toContain(">Build</button>");
    expect(html).toContain(">Review</button>");
  });

  it("does not render light-mode surface classes", () => {
    const html = renderedConsoleHtml();

    for (const className of [
      "border-zinc-200",
      "border-zinc-300",
      "bg-white",
      "bg-zinc-50",
      "bg-zinc-100",
      "text-zinc-950",
      "text-zinc-900",
      "text-zinc-800",
      "text-zinc-700",
      "text-zinc-600",
      "text-blue-700",
      "text-blue-600",
    ]) {
      expect(html).not.toContain(className);
    }
  });

  it("keeps the top context accordions stacked with only the summary open", () => {
    const html = renderedConsoleHtml();
    const start = html.indexOf('aria-label="Project context"');
    const end = html.indexOf('id="workspace"');
    const contextHtml = html.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(contextHtml.match(/<details\b/g) ?? []).toHaveLength(3);
    expect(contextHtml.match(/<details\b[^>]*\sopen(?:=""|="open")?/g) ?? []).toHaveLength(1);
    expect(contextHtml).toContain("Project summary");
    expect(contextHtml).toContain("Rules");
    expect(contextHtml).toContain("Changelog");
  });

  it("shows the full public launch setup checklist in maintainer tools", () => {
    const text = renderedConsoleText();

    expect(text).toContain("Public launch setup");
    expect(text).toContain("COMMAND_WAVE_INITIAL_WAVE_URL");
    expect(text).toContain("COMMAND_WAVE_INITIAL_REPO_URL");
    expect(text).toContain("COMMAND_WAVE_STORE=postgres");
    expect(text).toContain("DATABASE_URL");
    expect(text).toContain("ADMIN_API_KEY");
    expect(text).toContain("6529_MOCK_MODE=false");
    expect(text).toContain("COMMAND_WAVE_REPO_ADAPTER=github");
    expect(text).toContain("COMMAND_WAVE_GITHUB_TOKEN");
    expect(text).toContain("COMMAND_WAVE_STATE_URL");
    expect(text).toContain("COMMAND_WAVE_GUARDIAN_REQUIRED_CHECK");
    expect(text).toContain("GitHub required check");
    expect(text).toContain("Server key needed before launch");
    expect(text).toContain("Set ADMIN_API_KEY on the server.");
    expect(text).toContain("Copy env checklist");
  });
});
