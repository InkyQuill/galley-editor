# Optional local skills

Agent skills are optional and are not required for builds, tests, or CI.
Their contents are managed separately from this repository. Machine-specific
symlinks are ignored so a clone does not contain broken absolute paths.

To enable the skills, run from the repository root after installing their
sources locally. Set each variable to the directory containing its SKILL.md:

```sh
export GALLEY_ASTRO_SKILL_DIR=/absolute/path/to/astro-starlight
export GALLEY_CODEMIRROR_SKILL_DIR=/absolute/path/to/using-codemirror
mkdir -p .agents/skills
test -f "$GALLEY_ASTRO_SKILL_DIR/SKILL.md" && ln -s "$GALLEY_ASTRO_SKILL_DIR" .agents/skills/astro-starlight
test -f "$GALLEY_CODEMIRROR_SKILL_DIR/SKILL.md" && ln -s "$GALLEY_CODEMIRROR_SKILL_DIR" .agents/skills/using-codemirror
```

Existing links can be kept as-is. To change a link, remove only that symlink
before running the corresponding command again.
