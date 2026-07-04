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

    expect(text).toContain("Decentralized Coding");
    expect(text).toContain("Project overview");
    expect(text).toContain("A new form of swarm development for the age of AI");
    expect(text).toContain("Use this like a normal project room.");
    expect(text).toContain("The project room is the shared record");
    expect(text).toContain("Project Discuss Decide PR Review Log");
    expect(text).toContain("Work and decisions");
    expect(text).toContain("What needs attention");
    expect(text).toContain("Talk to the swarm");
    expect(text).toContain("Who is building");
    expect(text).toContain("Activity report:");
    expect(text).toContain("not access or merge authority");
    expect(text).toContain("Project rules");
    expect(text).toContain("Builders use the room to propose, question, and decide.");
  });

  it("does not bring back removed homepage clutter or old positioning copy", () => {
    const text = renderedConsoleText();

    expect(text).not.toContain("Build the 6529 hook together");
    expect(text).not.toContain("Public hook build");
    expect(text).not.toContain("Project details");
    expect(text).not.toContain("All member activity");
    expect(text).not.toContain("\u2014");
  });

  it("keeps optional advanced drawers on a readable light surface", () => {
    const html = renderedConsoleHtml();

    expect(html).toContain('id="more-tools"');
    expect(html).toContain('id="reports"');
    expect(html).toContain("advanced-light-surface");
  });
});
