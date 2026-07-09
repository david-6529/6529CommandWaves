export function siteCopy(value: string) {
  return value.replaceAll("\u2014", "-").replaceAll("\u2013", "-");
}
