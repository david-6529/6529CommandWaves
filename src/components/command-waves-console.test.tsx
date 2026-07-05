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
    expect(text).toContain("Build one hook in public through chat, decisions, pull requests, and review.");
    expect(text).toContain("Project summary");
    expect(text).toContain("orchestrator managed");
    expect(text).toContain("Group discussion sets the work.");
    expect(text).toContain("Builders can submit PRs to the repo and discuss scope, risks, and review in chat.");
    expect(text).toContain("Changelog");
    expect(text).toContain("Project chat");
    expect(text).toContain("Code repo");
    expect(text).toContain("Access");
    expect(text).toContain("Current focus");
    expect(text).toContain("Work");
    expect(text).toContain("Being discussed");
    expect(text).toContain("Chat with builders");
    expect(text).toContain("Save work item");
    expect(text).toContain("Builders");
    expect(text).toContain("Profiles show visible activity in chat and GitHub.");
    expect(text).toContain("Visible contribution");
    expect(text).toContain("Rules of the build");
    expect(text).toContain("Gate");
    expect(text).toContain("Important or risky changes need a visible project decision.");
    expect(text).toContain("Report points summarize visible work only.");
    expect(text).toContain("They do not grant access, payouts, or merge rights.");
    expect(text).toContain("Start in chat so builders can shape the idea.");
    expect(text).toContain("Use GitHub PRs for code changes.");
  });

  it("does not bring back removed homepage clutter or old positioning copy", () => {
    const text = renderedConsoleText();

    expect(text).not.toContain("Build the 6529 hook together");
    expect(text).not.toContain("Public hook build");
    expect(text).not.toContain("A public build room for the 6529 hook.");
    expect(text).not.toContain("6529 profile");
    expect(text).not.toContain("Use this like a normal project room");
    expect(text).not.toContain("Project details");
    expect(text).not.toContain("All member activity");
    expect(text).not.toContain("Activity report:");
    expect(text).not.toContain("not access or merge authority");
    expect(text).not.toContain("What needs attention");
    expect(text).not.toContain("Next move");
    expect(text).not.toContain("Swarm chat");
    expect(text).not.toContain("Suggest work");
    expect(text).not.toContain("A shared room for people and agents");
    expect(text).not.toContain("Open room");
    expect(text).not.toContain("Room discussion");
    expect(text).not.toContain("\u2014");
  });

  it("keeps optional advanced drawers on the dark app surface", () => {
    const html = renderedConsoleHtml();

    expect(html).toContain('id="more-tools"');
    expect(html).toContain('id="reports"');
    expect(html).toContain("dark-app");
    expect(html).toContain("advanced-dark-surface");
    expect(html).toContain("bg-zinc-950");
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
