import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getChatPostingCapability } from "@/lib/6529/chat-post";
import { demoWave } from "@/lib/demo-wave";
import { createProjectWorkspaceView } from "@/lib/project-workspace-view";
import { ProjectWorkspace } from "./project-workspace";
import { WalletIdentityProvider } from "./wallet-identity";

function renderWorkspace() {
  const view = createProjectWorkspaceView(demoWave, { previewMode: true });

  return renderToStaticMarkup(
    <WalletIdentityProvider>
      <ProjectWorkspace view={view} chatCapability={getChatPostingCapability({ "6529_MOCK_MODE": "true" })} />
    </WalletIdentityProvider>,
  );
}

describe("ProjectWorkspace", () => {
  it("leads with the build, decision, discussion, people, and reward state", () => {
    const html = renderWorkspace();
    const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

    expect(text).toContain("Decentralized Coding / Beta");
    expect(text).toContain("6529 AMM Hook");
    expect(text).toContain("50 builders. One immutable hook. Fees shared by accepted contribution.");
    expect(text).toContain("Connect wallet");
    expect(text).toContain("Contributor share Needs approval");
    expect(text).toContain("Approve the pilot rules");
    expect(text).toContain("Open work");
    expect(text).toContain("Live discussion");
    expect(text).toContain("Source not connected");
    expect(text).toContain("Pull requests");
    expect(text).toContain("Contributors");
    expect(text).toContain("Raw chat activity does not determine rewards.");
  });

  it("does not expose the old operator console or seeded demo people", () => {
    const text = renderWorkspace().replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

    expect(text).not.toContain("Current loop");
    expect(text).not.toContain("Launch checklist");
    expect(text).not.toContain("Maintainer setup");
    expect(text).not.toContain("Proposal tools");
    expect(text).not.toContain("gpebbles");
    expect(text).not.toContain("blocknoob");
    expect(text).not.toContain("runtime-check");
  });

  it("renders accessible discussion filters and composer controls", () => {
    const html = renderWorkspace();

    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-label="Discussion filters"');
    expect(html).toContain('aria-label="Builder discussion"');
    expect(html).toContain('id="project-message"');
    expect(html).toContain('type="submit"');
  });
});
