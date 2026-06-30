import { describe, expect, it } from "vitest";
import { createBuilderWaveQuickPosts } from "./builder-wave-quick-posts";

describe("builder wave quick posts", () => {
  it("creates simple room drafts for common contributor actions", () => {
    const posts = createBuilderWaveQuickPosts({
      handle: " david ",
      title: " Add fee cap tests ",
    });

    expect(posts.map((post) => post.label)).toEqual(["Join", "Ask", "Review", "Tests"]);
    expect(posts[0].message).toContain("Handle: david.");
    expect(posts[1].message).toContain("smallest useful next step for Add fee cap tests");
    expect(posts[2].message).toContain("review the next PR for Add fee cap tests");
    expect(posts[3].message).toContain("bounded hook parameter");
    expect(posts.map((post) => post.message).join("\n")).not.toContain("\u2014");
  });

  it("uses a clear fallback when the change title is empty", () => {
    const posts = createBuilderWaveQuickPosts({
      handle: "",
      title: "",
    });

    expect(posts[1].message).toContain("the next hook change");
    expect(posts[2].message).toContain("the next hook change");
    expect(posts[3].message).toContain("the next hook change");
  });
});
