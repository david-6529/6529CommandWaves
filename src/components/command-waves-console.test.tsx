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
    expect(text).toContain("daemon updates");
    expect(text).toContain("This workspace is for one hook project.");
    expect(text).toContain(
      "Builders use chat to discuss ideas, record decisions, and turn approved work into reviewed GitHub PRs.",
    );
    expect(text).toContain("Current focus: Draft the non-upgradeable hook scaffold.");
    expect(text).toContain("Next: Keep discussing in chat. Select the hook repo before PR work starts.");
    expect(text).toContain("Repo: not selected yet. PR work waits until maintainers choose it.");
    expect(text).toContain("Latest: Builders approved the hook scaffold with 5 yes and 1 no.");
    expect(text).toContain("No GitHub repo is selected yet. PR work stays blocked until maintainers choose the repo.");
    expect(text).toContain("GitHub repo placeholder");
    expect(text).toContain("Changelog");
    expect(text).toContain("How this works");
    expect(text).toContain("Flow");
    expect(text).toContain("Project, Discuss, Decide, PR, Review, Log");
    expect(text).toContain("Active projects");
    expect(text).toContain("Start with the pilot hook. More hook projects can appear here after this loop works.");
    expect(text).toContain("6529 AMM hook");
    expect(text).toContain("Message builders");
    expect(text).toContain("Discuss");
    expect(text).toContain("PR");
    expect(text).toContain("Log");
    expect(text).toContain("Who can join?");
    expect(text).toContain("Who can join");
    expect(text).toContain("How do I join?");
    expect(text).toContain("How does work start?");
    expect(text).toContain("Who coordinates?");
    expect(text).toContain("How are PRs approved?");
    expect(text).toContain("What about GitHub?");
    expect(text).toContain("Who reviews PRs?");
    expect(text).toContain("Who merges?");
    expect(text).toContain("Everything starts in chat.");
    expect(text).toContain("daemon labels risk and keeps scope small.");
    expect(text).toContain("daemon is the 6529 account that updates the summary, labels risk, and routes work.");
    expect(text).toContain("The GitHub repo is a placeholder for now. Chat can continue. PR work waits until maintainers choose the repo.");
    expect(text).toContain("Review agent is a placeholder for this phase. Humans still merge.");
    expect(text).toContain("A reviewer check must pass before humans merge.");
    expect(text).toContain("Connect wallet if you want, then use Request access in chat.");
    expect(text).toContain("Work being discussed");
    expect(text).toContain("PR waits");
    expect(text).toContain("Draft hook scaffold");
    expect(text).toContain("Next");
    expect(text).toContain("Keep discussing");
    expect(text).toContain("PR work starts after maintainers select the hook repo.");
    expect(text).toContain("GitHub repo placeholder");
    expect(text).toContain("Message builders");
    expect(text).toContain("Decision");
    expect(text).toContain("Builders approved with 5 yes and 1 no.");
    expect(text).toContain("GitHub repo");
    expect(text).toContain("No GitHub repo is selected yet. PR work stays blocked until maintainers choose the repo.");
    expect(text).toContain("No GitHub repo is selected yet. Select the pilot repo before creating PR work.");
    expect(text).toContain("Select the hook repo before PR work starts.");
    expect(text).toContain("Project chat");
    expect(text).toContain("Open chat");
    expect(text).toContain("Find chat");
    expect(text).toContain("Refresh chat to read the latest posts here.");
    expect(text).toContain("First public project chat.");
    expect(text).toContain("Summarize or inspect project state.");
    expect(text).not.toContain("wave/repo state");
    expect(text).not.toContain("Open source");
    expect(text).not.toContain("Project source");
    expect(text).not.toContain("Find a source");
    expect(text).not.toContain("Type a source name");
    expect(text).toContain("General");
    expect(text).toContain("Build");
    expect(text).toContain("Review");
    expect(text).toContain("Questions, ideas, risks, and work all start here.");
    expect(text).not.toContain("Discuss repo");
    expect(text).not.toContain("Add PR note");
    expect(text).toContain("GitHub repo placeholder");
    expect(text).toContain("Post to chat");
    expect(text).toContain("Save as proposal");
    expect(text).toContain("Save proposal");
    expect(text).toContain("Recent chat");
    expect(text).toContain("Builders");
    expect(text).toContain("Profiles show what each builder has done.");
    expect(text).toContain("Activity");
    expect(text).toContain("Report: 1 report point");
    expect(text).toContain("1 report point");
    expect(text).not.toContain("1 report points");
    expect(text).toContain("Decision links: 2 report points");
    expect(text).toContain("Decision link");
    expect(text).not.toContain("receipt https://");
    expect(text).not.toContain("Decision " + "receipts");
    expect(text).not.toContain("Decision " + "receipt");
    expect(text).toContain("Builder details");
    expect(text).toContain("Access notes, reports, and code checks for builders who want the details.");
    expect(text).toContain("The group records a project decision before PR work starts.");
    expect(text).toContain("Review approval is manual in this phase.");
    expect(text).toContain("Report points summarize visible work only.");
    expect(text).toContain("They do not grant access, payouts, or merge rights.");
    expect(text).toContain("Start in chat so builders can shape the idea.");
    expect(text).toContain("Save the proposal once builders can see it.");
    expect(text).toContain("Use GitHub PRs once the repo is connected.");
    expect(text).toContain("Propose work");
    expect(text).toContain("Boundaries and success criteria");
    expect(text).toContain("Details");
    expect(text).toContain("Chat launch");
    expect(text).toContain("PR loop");
    expect(text).toContain("Project log");
    expect(text).toContain("/api/command-wave/verification/manifest");
  });

  it("keeps the current blocker chat-first while setup stays available", () => {
    const html = renderedConsoleHtml();

    expect(html).toContain('href="#project-chat"');
    expect(html).toContain("grid-cols-2");
    expect(html).not.toContain("overflow-x-auto");
    expect(html).toContain('id="project-repo-url"');
    expect(html).toContain('placeholder="Select later, owner/repo or GitHub URL"');
    expect(html).toContain('placeholder="Type a chat name"');
    expect(html).not.toContain("https://github.com/your-org/your-hook-repo");
    expect(html).toContain('id="project-access-key"');
    expect(html).toContain('id="who-can-join"');
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
    expect(text).not.toContain("Scope work");
    expect(text).not.toContain("Save as work");
    expect(text).not.toContain("Save scoped work");
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
    expect(text).not.toContain("Who can play");
    expect(text).not.toContain("Participation gate is not set yet.");
    expect(text).not.toContain("Build details");
    expect(text).not.toContain("Build reference");
    expect(text).not.toContain("Use Codex to draft");
    expect(text).not.toContain("Built cmd-001 through Codex");
    expect(text).not.toContain("Review passed the hook scaffold");
    expect(text).not.toContain("PR #12");
    expect(text).not.toContain("forge test passed");
    expect(text).not.toContain("6529 decision " + "receipt");
    expect(text).not.toContain("decision " + "receipt needed");
    expect(text).not.toContain("Decision " + "receipt needed");
    expect(text).not.toContain("Record the decision " + "receipt before the PR build step.");
    expect(text).not.toContain("cmd-001 passed");
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

  it("orders chat actions from discussion draft to saved proposal", () => {
    const html = renderedConsoleHtml();
    const start = html.indexOf('id="project-chat"');
    const end = html.indexOf('id="active-projects"');
    const chatHtml = html.slice(start, end);
    const copyIndex = chatHtml.indexOf("Copy draft");
    const postIndex = chatHtml.indexOf("Post to chat");
    const saveIndex = chatHtml.indexOf("Save as proposal");

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(copyIndex).toBeGreaterThan(-1);
    expect(postIndex).toBeGreaterThan(copyIndex);
    expect(saveIndex).toBeGreaterThan(postIndex);
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
    const end = html.indexOf('aria-label="Build flow"');
    const contextHtml = html.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(contextHtml.match(/<details\b/g) ?? []).toHaveLength(3);
    expect(contextHtml.match(/<details\b[^>]*\sopen(?:=""|="open")?/g) ?? []).toHaveLength(1);
    expect(contextHtml).toContain("Project summary");
    expect(contextHtml).toContain("How this works");
    expect(contextHtml).toContain("Changelog");
  });

  it("keeps the public active projects list collapsed and placeholder-safe", () => {
    const html = renderedConsoleHtml();
    const workspaceStart = html.indexOf('id="workspace"');
    const start = html.indexOf('id="active-projects"');
    const end = html.indexOf('id="members-and-rules"');
    const activeProjectsHtml = html.slice(start, end);
    const activeProjectsText = activeProjectsHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

    expect(workspaceStart).toBeGreaterThan(-1);
    expect(start).toBeGreaterThan(-1);
    expect(start).toBeGreaterThan(workspaceStart);
    expect(end).toBeGreaterThan(start);
    expect(activeProjectsHtml).toContain("Active projects");
    expect(activeProjectsHtml).toContain("6529 AMM hook");
    expect(activeProjectsHtml).toContain(">Project chat</dd>");
    expect(activeProjectsHtml).toContain("GitHub repo placeholder");
    expect(activeProjectsHtml).toContain(">Open chat</a>");
    expect(activeProjectsHtml).toContain("GitHub repo placeholder");
    expect(activeProjectsText).not.toContain("6529-hook-builder");
    expect(activeProjectsHtml).not.toContain(">Select repo</button>");
    expect(activeProjectsHtml).not.toContain("https://github.com/your-org/your-hook-repo");
    expect(activeProjectsHtml.match(/<details\b[^>]*\sopen(?:=""|="open")?/g) ?? []).toHaveLength(0);
  });

  it("asks for proposal substance before optional proposal details", () => {
    const html = renderedConsoleHtml();
    const start = html.indexOf('id="start-building"');
    const end = html.indexOf('id="recent-activity"');
    const scopeHtml = html.slice(start, end);
    const titleIndex = scopeHtml.indexOf("Title");
    const changeIndex = scopeHtml.indexOf("Change");
    const successIndex = scopeHtml.indexOf("Boundaries and success criteria");
    const detailsIndex = scopeHtml.indexOf("Details");
    const workTypeIndex = scopeHtml.indexOf("Work type");
    const handleIndex = scopeHtml.indexOf("Your handle");

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(titleIndex).toBeGreaterThan(-1);
    expect(changeIndex).toBeGreaterThan(titleIndex);
    expect(successIndex).toBeGreaterThan(changeIndex);
    expect(detailsIndex).toBeGreaterThan(successIndex);
    expect(workTypeIndex).toBeGreaterThan(detailsIndex);
    expect(handleIndex).toBeGreaterThan(workTypeIndex);
    expect(scopeHtml).toContain("Code PR");
    expect(scopeHtml).not.toContain("Boundaries and tests");
    expect(scopeHtml.match(/<details\b[^>]*\sopen(?:=""|="open")?/g) ?? []).toHaveLength(0);
  });

  it("shows the full public launch setup checklist in maintainer tools", () => {
    const text = renderedConsoleText();

    expect(text).toContain("Public launch setup");
    expect(text).toContain("COMMAND_WAVE_INITIAL_WAVE_URL");
    expect(text).toContain("COMMAND_WAVE_INITIAL_REPO_URL");
    expect(text).toContain("Placeholder now. Keep it until maintainers choose the hook repo.");
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
