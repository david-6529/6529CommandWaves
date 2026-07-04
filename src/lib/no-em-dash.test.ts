import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const textFilePattern =
  /\.(?:css|cjs|example|html|js|json|jsx|md|mjs|sql|ts|tsx|txt|yaml|yml)$/;

function projectTextFiles() {
  return execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" })
    .split("\n")
    .map((path) => path.trim())
    .filter((path) => path && textFilePattern.test(path) && existsSync(path));
}

function emDashMatches(path: string) {
  const content = readFileSync(path, "utf8");
  const lines = content.split(/\r?\n/);

  return lines.flatMap((line, index) =>
    line.includes("\u2014") ? [`${path}:${index + 1}: contains U+2014`] : [],
  );
}

describe("project text characters", () => {
  it("rejects U+2014 in project text", () => {
    const matches = projectTextFiles().flatMap(emDashMatches);

    expect(matches).toEqual([]);
  });
});
