import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CommandWavesConsole } from "./command-waves-console";

function renderedConsoleText() {
  return renderToStaticMarkup(<CommandWavesConsole />)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

describe("CommandWavesConsole", () => {
  it("renders the simple public hook workspace contract", () => {
    const text = renderedConsoleText();

    expect(text).toContain("Decentralized Coding");
    expect(text).toContain("6529 Hook");
    expect(text).toContain("A new form of swarm development for the age of AI");
    expect(text).toContain("What is happening now");
    expect(text).toContain("Talk to the swarm");
    expect(text).toContain("Who is in the swarm");
    expect(text).toContain("How this works");
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
});
