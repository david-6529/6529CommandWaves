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
    expect(text).toContain("Project summary");
    expect(text).toContain("orchestrator managed");
    expect(text).toContain("This pilot coordinates the design of a 6529 AMM hook through group chat");
    expect(text).toContain("Current work: Add fee cap tests.");
    expect(text).toContain("The orchestrator keeps this summary and changelog current");
    expect(text).toContain("Builders can discuss ideas here, submit pull requests");
    expect(text).toContain("Open the code repo");
    expect(text).toContain("Changelog");
    expect(text).toContain("Rules");
    expect(text).toContain("Who can join?");
    expect(text).toContain("How do I join?");
    expect(text).toContain("How does work start?");
    expect(text).toContain("How are PRs approved?");
    expect(text).toContain("Who merges?");
    expect(text).toContain("Everything starts in chat.");
    expect(text).toContain("Use Request access in chat.");
    expect(text).toContain("Current work");
    expect(text).toContain("Decision");
    expect(text).toContain("Confirm scope in chat before saving a proposal.");
    expect(text).toContain("Code repo");
    expect(text).toContain("Chat with builders");
    expect(text).toContain("The same box starts the work.");
    expect(text).toContain("Discuss PR");
    expect(text).toContain("Add to discussion");
    expect(text).toContain("Post to chat");
    expect(text).toContain("Builders");
    expect(text).toContain("Profiles show visible chat, PR, and review activity.");
    expect(text).toContain("Visible contribution");
    expect(text).toContain("Build reference");
    expect(text).toContain("The top Rules accordion is the plain-English source.");
    expect(text).toContain("without making them the default view");
    expect(text).toContain("The group records a project decision before approved PR work starts.");
    expect(text).toContain("Report points summarize visible work only.");
    expect(text).toContain("They do not grant access, payouts, or merge rights.");
    expect(text).toContain("Start in chat so builders can shape the idea.");
    expect(text).toContain("Save the scoped work once builders can see it.");
    expect(text).toContain("Use GitHub PRs for code changes.");
    expect(text).toContain("Scope work");
    expect(text).toContain("Save scoped work");
    expect(text).toContain("Project log");
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
    expect(text).not.toContain("\u2014");
    expect(text).not.toContain("Gate");
    expect(text).not.toContain("gate unset");
    expect(text).not.toContain("Participation gate is not set yet.");
    expect(text).not.toContain("Build details");
  });

  it("keeps optional advanced drawers on the dark app surface", () => {
    const html = renderedConsoleHtml();

    expect(html).toContain('id="more-tools"');
    expect(html).toContain('id="reports"');
    expect(html).toContain("dark-app");
    expect(html).toContain("advanced-dark-surface");
    expect(html).toContain("bg-zinc-950");
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
  });
});
