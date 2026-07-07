import { describe, expect, it } from "vitest";
import { firstPhaseScopeInventory } from "./phase-scope";

describe("first phase scope inventory", () => {
  it("keeps the launch focused on one hook chat and one hook repo", () => {
    expect(firstPhaseScopeInventory.useNow).toContain("One public project chat and one GitHub repo.");
    expect(firstPhaseScopeInventory.useNow).toContain("Project snapshot with chat, code, PR, and review state.");
    expect(firstPhaseScopeInventory.useNow).toContain("Manual project decision links before PR work runs.");
    expect(firstPhaseScopeInventory.parkLater).toContain("Broad swarm marketplace flows or external agent endpoints.");
    expect(firstPhaseScopeInventory.parkLater).toContain("Upgradeable hook contracts by default.");
  });

  it("does not claim live holder authority or automatic payout behavior", () => {
    const useNow = firstPhaseScopeInventory.useNow.join(" ").toLowerCase();
    const parkLater = firstPhaseScopeInventory.parkLater.join(" ").toLowerCase();

    expect(useNow).not.toContain("automatic payout");
    expect(useNow).not.toContain("live reputation");
    expect(useNow).not.toContain("live token");
    expect(parkLater).toContain("live reputation");
    expect(parkLater).toContain("token");
    expect(parkLater).toContain("automatic payouts");
  });

  it("does not emit U+2014 characters", () => {
    expect(JSON.stringify(firstPhaseScopeInventory)).not.toContain("\u2014");
  });
});
