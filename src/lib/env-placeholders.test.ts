import { describe, expect, it } from "vitest";
import { hasProductionValue, isPlaceholderValue } from "./env-placeholders";

describe("env placeholder detection", () => {
  it("detects launch placeholder values", () => {
    expect(isPlaceholderValue("replace-with-a-strong-random-key")).toBe(true);
    expect(isPlaceholderValue("https://your-app.example/api/command-wave/state")).toBe(true);
    expect(isPlaceholderValue("postgresql://user:password@host:5432/command_waves")).toBe(true);
  });

  it("only blocks placeholders in production mode", () => {
    expect(hasProductionValue("https://your-app.example", { NODE_ENV: "development" })).toBe(true);
    expect(hasProductionValue("https://your-app.example", { NODE_ENV: "production" })).toBe(false);
    expect(hasProductionValue("https://command-waves.6529.io", { NODE_ENV: "production" })).toBe(true);
  });
});
