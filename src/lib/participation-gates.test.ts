import { describe, expect, it } from "vitest";
import { defaultParticipationGates, normalizeParticipationGates } from "./participation-gates";

describe("participation gates", () => {
  it("keeps default gate notes advisory", () => {
    expect(normalizeParticipationGates([])).toEqual(defaultParticipationGates);
  });

  it("marks REP, TDH, holder, allowlist, and QnA notes as manual when needed", () => {
    expect(
      normalizeParticipationGates([
        "30% of TDH holders can contribute",
        "AMM QnA pass required",
        "Builder allowlist",
      ]),
    ).toEqual([
      "30% of TDH holders can contribute (manual note only, not enforced by this app)",
      "AMM QnA pass required (manual note only, not enforced by this app)",
      "Builder allowlist (manual note only, not enforced by this app)",
    ]);
  });

  it("does not duplicate an existing advisory note", () => {
    expect(normalizeParticipationGates("REP or TDH planned, not enforced here")).toEqual([
      "REP or TDH planned, not enforced here",
    ]);
  });
});
