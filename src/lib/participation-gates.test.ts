import { describe, expect, it } from "vitest";
import {
  createParticipationAccessSnapshot,
  defaultParticipationGates,
  normalizeParticipationGates,
  participationGateNeedsAdvisoryNote,
  summarizeParticipationAccess,
} from "./participation-gates";

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

  it("detects only authority notes that need advisory wording", () => {
    expect(participationGateNeedsAdvisoryNote("30% of TDH holders can contribute")).toBe(true);
    expect(participationGateNeedsAdvisoryNote("REP or TDH planned, not enforced here")).toBe(false);
    expect(participationGateNeedsAdvisoryNote("Community builders welcome")).toBe(false);
  });

  it("summarizes manual phase 1 access without claiming live gates", () => {
    expect(summarizeParticipationAccess(defaultParticipationGates)).toBe(
      "Ask in chat to join. Access is reviewed manually for now.",
    );
    expect(summarizeParticipationAccess(["Community builders welcome"])).toBe("Community builders welcome");
  });

  it("creates a compact participation snapshot for the workspace", () => {
    const snapshot = createParticipationAccessSnapshot(defaultParticipationGates);

    expect(snapshot).toMatchObject({
      label: "manual review",
      summary: "Ask in chat to join. Access is reviewed manually for now.",
    });
    expect(snapshot.summary).not.toMatch(/\b(REP|TDH|QnA)\b/);
    expect(createParticipationAccessSnapshot(["Community builders welcome"])).toMatchObject({
      label: "open",
      summary: "Community builders welcome",
    });
  });
});
