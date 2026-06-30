import { createBuilderWaveJoinDraft } from "./builder-wave-join-draft";

export type BuilderWaveQuickPostKind = "join" | "question" | "review" | "tests";

export type BuilderWaveQuickPost = {
  id: BuilderWaveQuickPostKind;
  label: string;
  message: string;
};

function clean(value: string, fallback: string) {
  return value.trim().replace(/\s+/g, " ") || fallback;
}

export function createBuilderWaveQuickPosts({
  handle,
  title,
}: {
  handle: string;
  title: string;
}): BuilderWaveQuickPost[] {
  const changeTitle = clean(title, "the next hook change");

  return [
    {
      id: "join",
      label: "Join",
      message: createBuilderWaveJoinDraft(handle),
    },
    {
      id: "question",
      label: "Ask",
      message: [
        "Question for the hook room:",
        `What is the smallest useful next step for ${changeTitle}?`,
        "I can help with tests, review, or discussion.",
      ].join("\n"),
    },
    {
      id: "review",
      label: "Review",
      message: [
        `I can help review the next PR for ${changeTitle}.`,
        "I will check the proposal, tests, and safety limits before giving feedback.",
      ].join("\n"),
    },
    {
      id: "tests",
      label: "Tests",
      message: [
        `Suggestion for ${changeTitle}:`,
        "Add tests for the bounded hook parameter and the zero fee path.",
        "Keep this as one small PR.",
      ].join("\n"),
    },
  ];
}
