export type ApiErrorPayload = {
  error?: string;
  errorId?: string;
};

export function formatApiError(payload: ApiErrorPayload | null | undefined, fallback: string) {
  const message = payload?.error?.trim() || fallback;
  const errorId = payload?.errorId?.trim();

  if (!errorId) {
    return message;
  }

  const punctuatedMessage = /[.!?]$/.test(message) ? message : `${message}.`;

  return `${punctuatedMessage} Error ID: ${errorId}.`;
}
