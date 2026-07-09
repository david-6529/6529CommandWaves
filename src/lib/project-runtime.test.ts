import { describe, expect, it } from "vitest";
import { isProjectPreviewMode } from "./project-runtime";

describe("project runtime", () => {
  it("uses the honest preview until both live mode and a project source are configured", () => {
    expect(isProjectPreviewMode({})).toBe(true);
    expect(isProjectPreviewMode({ "6529_MOCK_MODE": "true", COMMAND_WAVE_INITIAL_WAVE_URL: "https://6529.io/waves/build" })).toBe(true);
    expect(isProjectPreviewMode({ "6529_MOCK_MODE": "false" })).toBe(true);
    expect(
      isProjectPreviewMode({
        "6529_MOCK_MODE": "false",
        COMMAND_WAVE_INITIAL_WAVE_URL: "https://6529.io/waves/your-hook-project",
      }),
    ).toBe(true);
    expect(
      isProjectPreviewMode({
        "6529_MOCK_MODE": "false",
        COMMAND_WAVE_INITIAL_WAVE_URL: "https://6529.io/waves/build",
      }),
    ).toBe(false);
  });
});
