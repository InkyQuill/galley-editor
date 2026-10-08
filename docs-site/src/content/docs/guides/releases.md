---
title: Releases and CI
description: Review version changes, publish both packages from one commit, and retry partial npm releases.
sidebar:
  order: 60
---

Galley uses one version for `@inkyquill/galley-editor` and
`@inkyquill/galley-themes`. The repository root is private.

## From a change to a release

1. Merge a conventional commit (`fix:`, `feat:`, or a breaking change) into `main`.
2. The release-please workflow proposes a release PR with the next version and
   changelog. Before 1.0, features and breaking changes advance the minor version;
   fixes advance the patch version.
3. Automation synchronizes workspace manifests, the npm lockfile, and release
   documentation. It explicitly runs CI on the release branch, including all three
   browser engines. Review and merge this PR only after its checks pass.
4. The merge creates `v<version>` at that exact commit and dispatches Release on
   the tag. Release reruns the complete CI, validates versions and main ancestry,
   builds both packages and publishes via npm trusted publishing. The GitHub
   release is created only after both packages are available.

`version.txt`, `.release-please-manifest.json`, the root and package manifests,
and the lockfile must agree. The footer reads the editor package version directly.
Historical changelog entries are preserved when release-please adds a new entry.

## Repository setup

Enable **Allow GitHub Actions to create and approve pull requests** in repository
Actions settings. The workflows grant write permissions only to release jobs;
ordinary CI has read access. No personal access token is required.

Set the repository variable `NPM_PUBLISH_ENABLED=true` to enable publication.
Configure npm trusted publishing for **both** packages with owner `InkyQuill`,
repository `galley-editor`, and workflow filename `release.yml`. This workflow uses
Node 24/npm with OIDC support and requests provenance. An npm token is not needed.

The old semantic-release and Publish Current Version workflows have been removed,
so there is only one publication path. Adding this configuration does not publish
an existing version: publication is dispatched when `version.txt` changes after a
release PR is merged.

## Retry a failed publication

Use the original tag, never move it to a later commit:

```bash
gh workflow run release.yml --ref v0.17.0 -f version=0.17.0
```

Replace the example with the actual failed release. The workflow checks that the
tag resolves to the executing commit and that it belongs to `main`. Packages
already published at that version are skipped only if their npm `gitHead` matches
the commit. Only a registry `E404` is treated as a missing package; authentication
errors and outages fail the run. Successful completion reconciles the release PR's
`autorelease: pending` label to `autorelease: tagged`.

## Local verification without publishing

```bash
npm ci --legacy-peer-deps
npm run lint
npm run test:coverage
npm test --workspace @inkyquill/galley-themes
npm run test:release
npm run test:commit-msg
node scripts/release.mjs check "$(cat version.txt)"
node scripts/release.mjs prepare
npm run build:lib
npm run build:themes
npm run test:package-consumer
npx playwright install --with-deps chromium firefox webkit
npm run test:e2e
npm run build-storybook
npm --prefix docs-site ci
npm run docs:build
```

CI runs package checks, browser engines, and documentation in parallel. Superseded
PR runs are cancelled; release publication is serialized. Failed interaction runs
retain traces for seven days. The standalone `scripts/verify-publish.sh` rebuilds
and packs the libraries for an independent manual check; CI already builds once
and runs the stricter consumer test, so it does not repeat that work.
