import { describe, expect, it } from "vitest";
import { commandKindLabel } from "./command-kind-copy";

describe("command kind copy", () => {
  it("uses human labels for public command kinds", () => {
    expect(commandKindLabel("post_to_wave")).toBe("Discussion update");
    expect(commandKindLabel("open_pr")).toBe("Open PR");
    expect(commandKindLabel("post_to_wave")).not.toBe("post to wave");
  });

  it("does not emit em dash characters", () => {
    expect(commandKindLabel("post_to_wave")).not.toContain("\u2014");
  });
});
