export function attachAdminApiKey(headers: Headers, accessKey: string | null | undefined) {
  const trimmed = accessKey?.trim();

  if (trimmed) {
    headers.set("x-admin-api-key", trimmed);
  }

  return headers;
}
