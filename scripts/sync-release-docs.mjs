import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const version = process.argv[2];

if (!version) {
  throw new Error('Usage: node scripts/sync-release-docs.mjs <version>');
}

const releaseSlug = `v${version.replaceAll('.', '-')}`;
const releaseTitle = `v${version}`;
const releasePath = `docs-site/src/content/docs/releases/${releaseSlug}.md`;

function read(path) {
  return readFileSync(path, 'utf8');
}

function write(path, content) {
  writeFileSync(path, content);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractChangelogSection() {
  const changelog = read('CHANGELOG.md');
  const escaped = escapeRegex(version);
  const patterns = [
    new RegExp(`^# \\[${escaped}\\][^\\n]*\\n+([\\s\\S]*?)(?=\\n# \\[|\\n# Changelog|\\n## \\[Unreleased\\]|$)`, 'm'),
    new RegExp(`^## \\[${escaped}\\][^\\n]*\\n+([\\s\\S]*?)(?=\\n## \\[|\\n# \\[|$)`, 'm'),
  ];

  for (const pattern of patterns) {
    const match = changelog.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return '- Release notes are available in `CHANGELOG.md`.';
}

function syncReleasePage() {
  if (existsSync(releasePath)) {
    return;
  }

  const body = extractChangelogSection();
  const content = `---\ntitle: ${releaseTitle}\ndescription: Release notes for Galley Editor ${releaseTitle}.\n---\n\n${releaseTitle} release notes.\n\n${body}\n`;
  write(releasePath, content);
}

function syncOverviewVersion() {
  const path = 'docs-site/src/content/docs/index.mdx';
  const content = read(path).replace(
    /Galley is currently `v[^`]+` and still pre-1\.0\./,
    `Galley is currently \`${releaseTitle}\` and still pre-1.0.`,
  );
  write(path, content);
}

function syncDocsRoadmap() {
  const path = 'docs-site/src/content/docs/releases/roadmap.md';
  const content = read(path).replace(
    /^Galley Editor is currently `v[^`]+` and still pre-1\.0\.$/m,
    `Galley Editor is currently \`${releaseTitle}\` and still pre-1.0.`,
  );
  write(path, content);
}

function syncAstroSidebar() {
  const path = 'docs-site/astro.config.mjs';
  const content = read(path);
  const entry = `{ label: '${releaseTitle}', slug: 'releases/${releaseSlug}' }`;

  if (content.includes(entry)) {
    return;
  }

  write(
    path,
    content.replace(
      /(\{ label: 'Roadmap', slug: 'releases\/roadmap' \},\n)/,
      `$1            ${entry},\n`,
    ),
  );
}

function syncLegacyDocsRoadmap() {
  const path = 'docs/specs/ROADMAP.md';

  if (!existsSync(path)) {
    return;
  }

  const content = read(path).replace(
    /\| 0\.10\.0 \| KaTeX\/Mermaid Renderer Examples \| draft \| — \| — \|/,
    '| 0.10.0 | KaTeX/Mermaid Renderer Examples | shipped 2026-06-27 | — | v0.10.0 |',
  );

  write(path, content);
}

syncReleasePage();
syncOverviewVersion();
syncDocsRoadmap();
syncAstroSidebar();
syncLegacyDocsRoadmap();
