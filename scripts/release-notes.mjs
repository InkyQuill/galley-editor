// Extract one release while retaining all paragraphs and subsections. A `$`
// alternative in a multiline regexp would stop at the first line of its body.
export function extractReleaseNotes(changelog, version) {
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const heading = new RegExp(`^#{1,2} \\[${escaped}\\](?:\\s|\\(|$)`);
  const lines = changelog.split('\n');
  const start = lines.findIndex(line => heading.test(line));
  if (start < 0) return null;
  const next = lines.findIndex((line, index) => index > start && /^#{1,2} (?:\[|Changelog\b)/.test(line));
  return lines.slice(start + 1, next < 0 ? undefined : next).join('\n').trim();
}
