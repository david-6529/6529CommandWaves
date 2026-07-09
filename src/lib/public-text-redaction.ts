const secretAssignmentPattern =
  /\b(api[_-]?key|access[_-]?token|token|secret|password|private[_-]?key|bearer[_-]?token)\s*[:=]\s*([^\s,;]+)/gi;
const bearerPattern = /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi;
const githubTokenPattern = /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g;
const privateKeyPattern = /\b0x[a-fA-F0-9]{64}\b/g;
const sensitiveUrlParamPattern = /([?&](?:api[_-]?key|access[_-]?token|token|secret|password|key)=)[^&#\s]+/gi;

export function redactPublicText(value: string) {
  return value
    .replace(secretAssignmentPattern, (_match, key) => `${key}=[redacted]`)
    .replace(bearerPattern, "Bearer [redacted]")
    .replace(githubTokenPattern, "[redacted-token]")
    .replace(privateKeyPattern, "[redacted-private-key]")
    .replace(sensitiveUrlParamPattern, "$1[redacted]");
}
