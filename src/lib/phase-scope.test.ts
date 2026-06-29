import { describe, expect, it } from "vitest";
import { firstPhaseScopeInventory } from "./phase-scope";

describe("first phase scope inventory", () => {
  it("keeps the launch focused on one builder wave and one hook repo", () => {
    expect(firstPhaseScopeInventory.useNow).toContain("One 6529 builder wave and one GitHub hook repo.");
    expect(firstPhaseScopeInventory.useNow).toContain("Manual 6529 decision receipts before PR work runs.");
    expect(firstPhaseScopeInventory.parkLater).toContain("Broad swarm marketplace flows or external agent endpoints.");
    expect(firstPhaseScopeInventory.parkLater).toContain("Upgradeable hook contracts by default.");
  });

  it("does not claim live holder authority or automatic payout behavior", () => {
    const useNow = firstPhaseScopeInventory.useNow.join(" ").toLowerCase();
    const parkLater = firstPhaseScopeInventory.parkLater.join(" ").toLowerCase();

    expect(useNow).not.toContain("automatic payout");
    expect(useNow).not.toContain("live rep");
    expect(useNow).not.toContain("live tdh");
    expect(parkLater).toContain("live rep");
    expect(parkLater).toContain("tdh");
    expect(parkLater).toContain("automatic payouts");
  });

  it("does not emit U+2014 characters", () => {
    expect(JSON.stringify(firstPhaseScopeInventory)).not.toContain("\u2014");
  });
});
