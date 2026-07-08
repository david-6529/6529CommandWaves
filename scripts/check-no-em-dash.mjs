import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const forbiddenCharacters = [
  { character: "\u2014", name: "em dash", codePoint: "U+2014" },
  { character: "\u2013", name: "en dash", codePoint: "U+2013" },
];
const root = process.cwd();
const ignoredDirectories = new Set([
  ".data",
  ".git",
  ".next",
  ".vercel",
  "build",
  "coverage",
  "node_modules",
  "out",
]);
const ignoredFiles = new Set(["package-lock.json"]);
const binaryExtensions = new Set([
  ".avif",
  ".bmp",
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".pdf",
  ".png",
  ".sqlite",
  ".webp",
  ".woff",
  ".woff2",
]);

function isBinaryBuffer(buffer) {
  return buffer.includes(0);
}

function lineColumnFor(text, index) {
  const before = text.slice(0, index);
  const lines = before.split("\n");

  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

async function scanFile(path, findings) {
  if (ignoredFiles.has(path.split("/").at(-1) ?? "") || binaryExtensions.has(extname(path).toLowerCase())) {
    return;
  }

  const buffer = await readFile(path);

  if (isBinaryBuffer(buffer)) {
    return;
  }

  const text = buffer.toString("utf8");

  for (const forbidden of forbiddenCharacters) {
    let index = text.indexOf(forbidden.character);

    while (index !== -1) {
      const position = lineColumnFor(text, index);

      findings.push({
        file: relative(root, path),
        line: position.line,
        column: position.column,
        name: forbidden.name,
        codePoint: forbidden.codePoint,
      });
      index = text.indexOf(forbidden.character, index + forbidden.character.length);
    }
  }
}

async function scanDirectory(path, findings) {
  const entries = await readdir(path, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        await scanDirectory(join(path, entry.name), findings);
      }
      continue;
    }

    if (entry.isFile()) {
      await scanFile(join(path, entry.name), findings);
    }
  }
}

const findings = [];

await scanDirectory(root, findings);

if (findings.length) {
  console.error("Em dash and en dash characters are not allowed. Use commas, colons, parentheses, or simple hyphens.");
  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line}:${finding.column}: contains ${finding.codePoint} ${finding.name}`);
  }
  process.exitCode = 1;
} else {
  console.log("No em dash or en dash characters found.");
}
