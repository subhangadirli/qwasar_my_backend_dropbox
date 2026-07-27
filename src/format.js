const UNITS = ["B", "KB", "MB", "GB"];

/** Human-readable file size. Sizes are missing on pre-folder records. */
export function formatBytes(bytes) {
  if (typeof bytes !== "number" || Number.isNaN(bytes)) {
    return "";
  }
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1);
  return `${rounded} ${UNITS[unit]}`;
}
