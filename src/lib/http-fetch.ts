type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export type TimedFetchOptions = Omit<RequestInit, "signal"> & {
  fetchImpl?: FetchLike;
  maxBytes?: number;
  timeoutMs?: number;
};

export type TimedFetchError = Error & {
  status?: number;
  statusText?: string;
  url?: string;
};

const defaultTimeoutMs = 10_000;
const defaultMaxBytes = 1_000_000;

function httpUrl(input: string | URL) {
  const url = input instanceof URL ? input : new URL(input);

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw Object.assign(new Error("Fetch URL must use HTTP or HTTPS."), { url: url.toString() });
  }

  return url;
}

function fetchError(message: string, options: Partial<TimedFetchError> = {}) {
  return Object.assign(new Error(message), options);
}

function contentLength(response: Response) {
  const value = response.headers.get("content-length")?.trim();

  if (!value) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function responseTooLargeError(url: string, maxBytes: number) {
  return fetchError(`Response body from ${url} must be ${maxBytes} bytes or less.`, { url });
}

async function responseText(response: Response, url: string, maxBytes: number) {
  const declaredLength = contentLength(response);

  if (declaredLength !== null && declaredLength > maxBytes) {
    throw responseTooLargeError(url, maxBytes);
  }

  if (!response.body) {
    return "";
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      size += value.byteLength;

      if (size > maxBytes) {
        throw responseTooLargeError(url, maxBytes);
      }

      text += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }

  return text + decoder.decode();
}

export async function fetchTextWithTimeout(input: string | URL, options: TimedFetchOptions = {}) {
  const { fetchImpl = fetch, maxBytes = defaultMaxBytes, timeoutMs = defaultTimeoutMs, ...init } = options;
  const url = httpUrl(input);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      ...init,
      cache: init.cache ?? "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw fetchError(`Could not fetch ${url.toString()}: ${response.status} ${response.statusText}`, {
        status: response.status,
        statusText: response.statusText,
        url: url.toString(),
      });
    }

    return await responseText(response, url.toString(), maxBytes);
  } catch (error) {
    if (controller.signal.aborted) {
      throw fetchError(`Request timed out after ${timeoutMs}ms: ${url.toString()}`, { url: url.toString() });
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchJsonWithTimeout<T = unknown>(input: string | URL, options: TimedFetchOptions = {}) {
  const url = input instanceof URL ? input.toString() : input;
  const text = await fetchTextWithTimeout(input, options);

  try {
    return JSON.parse(text) as T;
  } catch {
    throw fetchError(`Response from ${url} must be valid JSON.`, { url });
  }
}
