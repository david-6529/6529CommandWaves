import { randomUUID } from "node:crypto";

const noStoreCacheControl = "no-store, max-age=0";

function withDefaultNoStore(init?: ResponseInit): ResponseInit {
  const headers = new Headers(init?.headers);

  if (!headers.has("Cache-Control")) {
    headers.set("Cache-Control", noStoreCacheControl);
  }

  if (!headers.has("X-Content-Type-Options")) {
    headers.set("X-Content-Type-Options", "nosniff");
  }

  return {
    ...init,
    headers,
  };
}

export function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, withDefaultNoStore(init));
}

function getErrorStatus(error: unknown) {
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status: unknown }).status)
      : 500;

  return Number.isFinite(status) && status >= 400 && status <= 599 ? status : 500;
}

function getErrorHeaders(error: unknown) {
  const headers =
    typeof error === "object" && error !== null && "headers" in error
      ? (error as { headers: unknown }).headers
      : undefined;

  return headers instanceof Headers || Array.isArray(headers) || (headers && typeof headers === "object")
    ? (headers as HeadersInit)
    : undefined;
}

export function handleRouteError(error: unknown) {
  const errorId = randomUUID();
  const status = getErrorStatus(error);
  const message = error instanceof Error ? error.message : "Unexpected error";
  const responseMessage = status >= 500 ? "Unexpected error" : message;

  if (status >= 500) {
    console.error(`[api.route_error:${errorId}]`, error);
  }

  return json({ error: responseMessage, errorId }, { status, headers: getErrorHeaders(error) });
}
