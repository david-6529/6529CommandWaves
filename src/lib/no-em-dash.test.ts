import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const textFilePattern =
  /\.(?:css|cjs|example|html|js|json|jsx|md|mjs|sql|ts|tsx|txt|yaml|yml)$/;
const forbiddenCharacters = [
  { character: "\u2014", codePoint: "U+2014" },
  { character: "\u2013", codePoint: "U+2013" },
];

function projectTextFiles() {
  return execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" })
    .split("\n")
    .map((path) => path.trim())
    .filter((path) => path && textFilePattern.test(path) && existsSync(path));
}

function forbiddenDashMatches(path: string) {
  const content = readFileSync(path, "utf8");
  const lines = content.split(/\r?\n/);

  return lines.flatMap((line, index) =>
    forbiddenCharacters.flatMap((forbidden) =>
      line.includes(forbidden.character) ? [`${path}:${index + 1}: contains ${forbidden.codePoint}`] : [],
    ),
  );
}

describe("project text characters", () => {
  it("rejects U+2014 and U+2013 in project text", () => {
    const matches = projectTextFiles().flatMap(forbiddenDashMatches);

    expect(matches).toEqual([]);
  });
});
