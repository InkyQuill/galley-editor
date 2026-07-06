#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const commitMessagePath = process.argv[2];

if (!commitMessagePath) {
  console.error('Usage: validate-commit-msg <commit-msg-file>');
  process.exit(2);
}

const message = readFileSync(commitMessagePath, 'utf8');
const subject = message
  .split(/\r?\n/)
  .map((line) => line.trim())
  .find((line) => line && !line.startsWith('#'));

if (!subject) {
  console.error('Commit message is empty.');
  process.exit(1);
}

if (/^Merge\b/.test(subject)) {
  process.exit(0);
}

const conventionalSubject =
  /^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)(\([a-z0-9._-]+\))?!?: .+/;

if (conventionalSubject.test(subject)) {
  process.exit(0);
}

console.error(`Invalid commit message: "${subject}"`);
console.error('');
console.error('Use Conventional Commits so semantic-release can publish versions.');
console.error('Expected: <type>[optional scope]: <description>');
console.error('Allowed types: build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test');
console.error('Examples:');
console.error('  fix: handle empty table control icons');
console.error('  docs(api): document table control icons');
console.error('  feat!: remove deprecated editor prop');
console.error('');
console.error('Merge commits are allowed.');
process.exit(1);
