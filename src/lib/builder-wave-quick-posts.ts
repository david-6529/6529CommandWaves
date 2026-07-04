import { createBuilderWaveJoinDraft } from "./builder-wave-join-draft";

export type BuilderWaveQuickPostKind = "join" | "question" | "idea" | "review";

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
  gates,
}: {
  handle: string;
  title: string;
  gates?: unknown;
}): BuilderWaveQuickPost[] {
  const changeTitle = clean(title, "the next hook change");

  return [
    {
      id: "join",
      label: "Join",
      message: createBuilderWaveJoinDraft(handle, gates),
    },
    {
      id: "question",
      label: "Ask",
      message: [
        "Question for the room:",
        `What needs a decision before anyone opens a PR for ${changeTitle}?`,
        "I can help once the next step is clear.",
      ].join("\n"),
    },
    {
      id: "idea",
      label: "Idea",
      message: [
        "Idea for the room:",
        `I think ${changeTitle} should consider ...`,
        "This is for discussion first, not a PR yet.",
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
  ];
}
