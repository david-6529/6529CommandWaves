import { describe, expect, it } from "vitest";
import { siteCopy } from "./site-copy";

describe("site copy", () => {
  it("normalizes forbidden dash characters in runtime content", () => {
    expect(siteCopy("scope\u2014tests and 1\u20133 builders")).toBe("scope-tests and 1-3 builders");
  });
});
