import { redactPublicText } from "./public-text-redaction";

export type ProjectChatSignal =
  | "pr_link"
  | "decision_request"
  | "review_request"
  | "repo_setup"
  | "suggested_work"
  | "question"
  | "chat";

export type ProjectChatObservation = {
  author: string;
  message: string;
  signal: ProjectChatSignal;
  summary: string;
};

const githubPullRequestPattern = /https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/pull\/\d+(?:[?#][^\s]*)?/i;

export function publicChatAuthor(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "builder";
  }

  return trimmed.length > 32 ? `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}` : trimmed;
}

export function compactPublicChatMessage(value: string, limit = 140) {
  const compact = redactPublicText(value).replace(/\s+/g, " ").trim();

  return compact.length > limit ? `${compact.slice(0, limit - 3)}...` : compact;
}

export function projectChatSignal(content: string): ProjectChatSignal {
  const message = compactPublicChatMessage(content, 400);

  if (githubPullRequestPattern.test(message)) {
    return "pr_link";
  }

  if (/\b(vote|decide|decision|approve|approval)\b/i.test(message) || /\byes\/no\b/i.test(message)) {
    return "decision_request";
  }

  if (/\b(propose|proposal|suggest|next change|next hook change)\b/i.test(message)) {
    return "suggested_work";
  }

  if (/\b(review|check|audit|test|tests|ci|guardian)\b/i.test(message)) {
    return "review_request";
  }

  if (/\b(repo|repository|github|branch)\b/i.test(message)) {
    return "repo_setup";
  }

  if (/\b(should we|can we)\b/i.test(message)) {
    return "suggested_work";
  }

  if (message.includes("?")) {
    return "question";
  }

  return "chat";
}

function signalSummary(signal: ProjectChatSignal, author: string) {
  const labels: Record<ProjectChatSignal, string> = {
    pr_link: `${author} shared a PR link for discussion.`,
    decision_request: `${author} asked for a decision.`,
    review_request: `${author} asked for review.`,
    repo_setup: `${author} discussed repo setup.`,
    suggested_work: `${author} suggested work.`,
    question: `${author} raised a question.`,
    chat: `${author} posted in chat.`,
  };

  return labels[signal];
}

export function createProjectChatObservation(input: { author: string; content: string }): ProjectChatObservation {
  const author = publicChatAuthor(input.author);
  const message = compactPublicChatMessage(input.content);
  const signal = projectChatSignal(input.content);

  return {
    author,
    message,
    signal,
    summary: `${signalSummary(signal, author)} Message: ${message}`,
  };
}

export function signalFromProjectChatObservation(value: string): ProjectChatSignal {
  const normalized = value.trim().toLowerCase();

  if (normalized.includes("shared a pr link")) {
    return "pr_link";
  }

  if (normalized.includes("asked for a decision")) {
    return "decision_request";
  }

  if (normalized.includes("asked for review")) {
    return "review_request";
  }

  if (normalized.includes("discussed repo setup")) {
    return "repo_setup";
  }

  if (normalized.includes("suggested work")) {
    return "suggested_work";
  }

  if (normalized.includes("raised a question")) {
    return "question";
  }

  return projectChatSignal(messageFromProjectChatObservation(value));
}

export function projectChatObservationLabel(value: string) {
  const labels: Record<ProjectChatSignal, string> = {
    pr_link: "PR link",
    decision_request: "decision request",
    review_request: "review request",
    repo_setup: "repo setup",
    suggested_work: "work suggested",
    question: "question",
    chat: "chat observed",
  };

  return labels[signalFromProjectChatObservation(value)];
}

export function messageFromProjectChatObservation(value: string) {
  const normalized = value.trim();
  const modernSeparator = "Message:";
  const modernIndex = normalized.indexOf(modernSeparator);

  if (modernIndex !== -1) {
    return normalized.slice(modernIndex + modernSeparator.length).trim();
  }

  const legacySeparator = "updated the project summary:";
  const legacyIndex = normalized.toLowerCase().indexOf(legacySeparator);

  if (legacyIndex !== -1) {
    return normalized.slice(legacyIndex + legacySeparator.length).trim();
  }

  return normalized;
}
