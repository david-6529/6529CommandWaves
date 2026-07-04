export function launchAuditRemoteEnabled(value: string | undefined) {
  return value?.trim() === "0" ? false : true;
}

export function launchAuditUrlFromAppUrl(appUrl: string | undefined, options: { remote?: boolean } = {}) {
  const trimmedAppUrl = appUrl?.trim();

  if (!trimmedAppUrl) {
    return null;
  }

  const baseUrl = trimmedAppUrl.replace(/\/+$/, "");
  const remote = options.remote ?? true;

  return `${baseUrl}/api/command-wave/launch/audit${remote ? "?remote=1" : ""}`;
}
