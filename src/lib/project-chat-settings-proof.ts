import { publicProjectChatSettings } from "./public-project-snapshot";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function publicStateChatSettingsReady(value: unknown) {
  const record = isRecord(value) ? value : null;
  const projectSnapshot = isRecord(record?.projectSnapshot) ? record.projectSnapshot : null;
  const chat = isRecord(projectSnapshot?.chat) ? projectSnapshot.chat : null;
  const posting = isRecord(chat?.posting) ? chat.posting : null;
  const pace = isRecord(posting?.pace) ? posting.pace : null;
  const parser = isRecord(chat?.parser) ? chat.parser : null;

  return Boolean(
    chat &&
      asString(chat.id) === publicProjectChatSettings.id &&
      asString(chat.mode) === publicProjectChatSettings.mode &&
      asString(chat.label) === publicProjectChatSettings.label &&
      asString(chat.title) === publicProjectChatSettings.title &&
      asString(chat.detail) === publicProjectChatSettings.detail &&
      asString(chat.composerLabel) === publicProjectChatSettings.composerLabel &&
      asString(chat.placeholder) === publicProjectChatSettings.placeholder &&
      asString(posting?.label) === publicProjectChatSettings.posting.label &&
      asString(posting?.detail) === publicProjectChatSettings.posting.detail &&
      asNumber(pace?.maxPosts) === publicProjectChatSettings.posting.pace.maxPosts &&
      asNumber(pace?.windowSeconds) === publicProjectChatSettings.posting.pace.windowSeconds &&
      asString(pace?.identity) === publicProjectChatSettings.posting.pace.identity &&
      asString(pace?.enforcedBy) === publicProjectChatSettings.posting.pace.enforcedBy &&
      asString(parser?.agent) === publicProjectChatSettings.parser.agent &&
      asString(parser?.detail) === publicProjectChatSettings.parser.detail,
  );
}
