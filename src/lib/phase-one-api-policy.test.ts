import { describe, expect, it } from "vitest";
import { phaseOneStateReplacementMessage, rejectPhaseOneStateReplacement } from "./phase-one-api-policy";

describe("phase one API policy", () => {
  it("blocks full command-wave state replacement", () => {
    expect(() => rejectPhaseOneStateReplacement()).toThrow(phaseOneStateReplacementMessage);

    try {
      rejectPhaseOneStateReplacement();
    } catch (error) {
      expect(error).toMatchObject({ status: 405 });
    }
  });

  it("does not emit em dash characters", () => {
    expect(phaseOneStateReplacementMessage).not.toContain("\u2014");
  });
});
