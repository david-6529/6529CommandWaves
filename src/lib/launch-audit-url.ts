export const defaultLocalAppUrl = "http://localhost:5001";

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

export function setupProofUrlFromAppUrl(appUrl: string | undefined) {
  const trimmedAppUrl = appUrl?.trim();

  if (!trimmedAppUrl) {
    return null;
  }

  return `${trimmedAppUrl.replace(/\/+$/, "")}/api/command-wave/setup/proof`;
}
