---
title: Storybook
description: Preview Galley Editor examples alongside the documentation.
---

Storybook is the best place to see Galley working with real props, themes, images, code fences, toolbar slots, footer widgets, and preview modes.

The published docs include Storybook in the same GitLab Pages site:

[Open Storybook](../../storybook/)

## Local Development

Run Storybook when you want to test component states while editing the library:

```bash
npm run storybook
```

Run the Starlight docs site separately:

```bash
npm run docs:dev
```

The GitLab Pages pipeline builds both outputs and publishes them together. Starlight is served from the Pages root, and Storybook is served from `/storybook/`.
