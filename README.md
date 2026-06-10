# repo-skills

CLI to scaffold repository skills with a single canonical location and symlinks into each AI provider's skills directory.

Skills are created at `.agents/skills/<skill-name>/` (the source of truth). For providers that use a different path, `repo-skills` creates relative symlinks so every tool sees the same skill content.

## Supported providers

| Provider     | ID         | Skills directory   | Symlink |
| ------------ | ---------- | ------------------ | ------- |
| Cursor       | `cursor`   | `.cursor/skills`   | Yes     |
| Claude Code  | `claude`   | `.claude/skills`   | Yes     |
| Codex        | `codex`    | `.agents/skills`   | No      |
| Windsurf     | `windsurf` | `.windsurf/skills` | Yes     |

Codex reads `.agents/skills/` directly, so no symlink is created for it.

## Requirements

- Node.js 22.14+
- Git (optional — used to resolve the project root when run inside a repo)

## Local setup

```bash
git clone <repo-url>
cd repo-skills-cli
npm install
npm run build
```

Run the CLI from the project directory:

```bash
node dist/index.js <skill-name>
```

Link it globally for local development:

```bash
npm link
repo-skills <skill-name>
```

## CLI usage

```bash
repo-skills <skill-name> [options]
```

### Arguments

- `<skill-name>` — Skill name in **kebab-case** (e.g. `my-skill`, `speckit-plan`). Lowercase letters, numbers, and hyphens only.

### Options

| Option | Description |
| ------ | ----------- |
| `-a, --agent <agents...>` | Target providers. Comma-separated and/or repeatable. |
| `-y, --yes` | Replace broken symlinks without prompting. |
| `--cwd <path>` | Use this directory as the project root instead of auto-detection. |
| `-h, --help` | Show help. |

### Interactive mode

Omit `--agent` to get a multiselect prompt for which providers to wire up:

```bash
repo-skills my-skill
```

### Non-interactive examples

```bash
# Cursor and Claude only
repo-skills my-skill --agent cursor,claude

# All providers (repeatable flag)
repo-skills my-skill -a cursor -a claude -a codex -a windsurf

# Replace an existing broken symlink
repo-skills my-skill --agent cursor --yes

# Scaffold inside a specific directory
repo-skills my-skill --agent cursor --cwd ./examples
```

### What gets created

Running `repo-skills my-skill --agent cursor,claude` produces:

```
.agents/skills/my-skill/SKILL.md   # canonical skill (created)
.cursor/skills/my-skill            # symlink → .agents/skills/my-skill
.claude/skills/my-skill            # symlink → .agents/skills/my-skill
```

`SKILL.md` is scaffolded with frontmatter:

```yaml
---
name: my-skill
description: ""
---
```

Edit `description` and add the skill body after the frontmatter.

### Project root

By default, `repo-skills` resolves the project root as:

1. The git repository root (when `cwd` is inside a git repo), or
2. The current working directory (when not in a git repo).

Use `--cwd` to override this — useful for monorepos or non-git layouts.

### Errors

- **Skill already exists** — The canonical path `.agents/skills/<name>/` is present. Remove it or pick another name.
- **Invalid skill name** — Use kebab-case only.
- **Unknown provider** — Check the provider IDs in the table above.
- **Symlink already exists** — A path exists but points elsewhere. Pass `-y` to replace it, or remove the path manually.
- **Windows symlinks** — Enable Developer Mode or run the terminal as Administrator.

## Development

```bash
npm install
npm run build    # compile to dist/
npm test         # vitest
```

The published binary is `dist/index.js`, exposed as the `repo-skills` command via `package.json` `bin`.
