function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function fromRequiredStatusCheckObject(value: unknown) {
  const record = isRecord(value) ? value : null;

  if (!record) {
    return [];
  }

  return [asString(record.context), asString(record.name), asString(record.check_name), asString(record.checkName)].filter(
    (item): item is string => Boolean(item),
  );
}

function collectFromRequiredStatusContainer(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) =>
      typeof item === "string" ? [item] : fromRequiredStatusCheckObject(item).concat(collectFromRequiredStatusContainer(item)),
    );
  }

  if (!isRecord(value)) {
    return [];
  }

  return [
    ...fromRequiredStatusCheckObject(value),
    ...collectFromRequiredStatusContainer(value.contexts),
    ...collectFromRequiredStatusContainer(value.checks),
    ...collectFromRequiredStatusContainer(value.required_status_checks),
    ...collectFromRequiredStatusContainer(value.requiredStatusChecks),
  ];
}

function collectRequiredChecksFromRule(value: unknown): string[] {
  if (!isRecord(value)) {
    return [];
  }

  const type = asString(value.type);
  const parameterChecks = collectFromRequiredStatusContainer(value.parameters);

  if (type === "required_status_checks") {
    return parameterChecks;
  }

  return [
    ...collectFromRequiredStatusContainer(value.required_status_checks),
    ...collectFromRequiredStatusContainer(value.requiredStatusChecks),
  ];
}

export function extractRequiredStatusChecks(payloads: unknown[]) {
  const found = new Set<string>();

  function visit(value: unknown, keyHint = "") {
    if (keyHint === "required_status_checks" || keyHint === "requiredStatusChecks") {
      for (const item of collectFromRequiredStatusContainer(value)) {
        found.add(item);
      }
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item, keyHint);
      }

      return;
    }

    if (!isRecord(value)) {
      return;
    }

    for (const item of collectRequiredChecksFromRule(value)) {
      found.add(item);
    }

    for (const [key, item] of Object.entries(value)) {
      visit(item, key);
    }
  }

  for (const payload of payloads) {
    visit(payload);
  }

  return [...found].sort((a, b) => a.localeCompare(b));
}
