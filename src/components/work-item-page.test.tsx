import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { demoWave } from "@/lib/demo-wave";
import { createProjectWorkspaceView } from "@/lib/project-workspace-view";
import { WalletIdentityProvider } from "./wallet-identity";
import { WorkItemPage } from "./work-item-page";

function renderWorkItem() {
  const view = createProjectWorkspaceView(demoWave, { previewMode: true });

  return renderToStaticMarkup(
    <WalletIdentityProvider>
      <WorkItemPage view={view} item={view.workItems[0]} />
    </WalletIdentityProvider>,
  );
}

describe("WorkItemPage", () => {
  it("shows the work scope, decision, code, roles, reward boundary, and evidence state", () => {
    const html = renderWorkItem();
    const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

    expect(text).toContain("Pilot: 6529 AMM Hook");
    expect(text).toContain("Define immutable fee behavior");
    expect(text).toContain("What this should deliver");
    expect(text).toContain("No proxy or delegatecall upgrade path.");
    expect(text).toContain("Roles are descriptive until signed membership and task credits are active.");
    expect(text).toContain("Needs group decision");
    expect(text).toContain("Code and review");
    expect(text).toContain("Not claimable");
    expect(text).toContain("No group decision, pull request, or repo-bound review proof is recorded for this work.");
  });

  it("provides real navigation without a fake claim control", () => {
    const html = renderWorkItem();

    expect(html).toContain('href="/"');
    expect(html).toContain('href="/#discussion"');
    expect(html).not.toContain("Claim work");
    expect(html).not.toContain("Open pull request");
    expect(html).not.toContain("Open repository");
  });
});
