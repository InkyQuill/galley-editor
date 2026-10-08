import { execFileSync } from 'node:child_process';
import { copyFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const packageDirs = ['packages/galley-editor', 'packages/galley-themes'];
const json = path => JSON.parse(readFileSync(path, 'utf8'));

export function checkVersion(expected) {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(expected ?? '')) {
    throw new Error('A stable semver version is required');
  }
  const versions = [
    readFileSync('version.txt', 'utf8').trim(),
    json('.release-please-manifest.json')['.'],
    ...['.', ...packageDirs].map(dir => json(`${dir}/package.json`).version),
    ...['', ...packageDirs].map(dir => json('package-lock.json').packages[dir].version),
  ];
  if (versions.some(version => version !== expected)) throw new Error('Release versions are not synchronized');
  if (!json('package.json').private) throw new Error('The workspace root must remain private');
  return expected;
}

export function isMissingVersion(error) {
  try {
    return JSON.parse(String(error.stdout)).error?.code === 'E404';
  } catch {
    return false;
  }
}

function publish() {
  const version = checkVersion(readFileSync('version.txt', 'utf8').trim());
  const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  for (const dir of packageDirs) {
    const name = json(`${dir}/package.json`).name;
    let existing;
    try {
      existing = JSON.parse(execFileSync('npm', ['view', `${name}@${version}`, 'version', 'gitHead', '--json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
    } catch (error) {
      // Authentication, registry outages and malformed responses must not be
      // mistaken for a missing version during a partial-release retry.
      if (!isMissingVersion(error)) throw error;
    }
    if (existing) {
      if (existing.version !== version || existing.gitHead !== sha) {
        throw new Error(`${name}@${version} does not belong to this commit`);
      }
      console.log(`${name}@${version} already published from ${sha}`);
    } else {
      execFileSync('npm', ['publish', '--workspace', name, '--access', 'public', '--provenance'], { stdio: 'inherit' });
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const command = process.argv[2];
  if (command === 'check') checkVersion(process.argv[3]);
  else if (command === 'prepare') {
    checkVersion(readFileSync('version.txt', 'utf8').trim());
    for (const dir of packageDirs) copyFileSync('CHANGELOG.md', `${dir}/CHANGELOG.md`);
  } else if (command === 'publish') publish();
  else throw new Error('Usage: node scripts/release.mjs check <version> | prepare | publish');
}
