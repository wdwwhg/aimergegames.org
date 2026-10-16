---
name: sync-upstream
description: Pull the latest ShipAny Next template changes from the upstream repo (git@github.com:shipany-ai/shipany-next) into this project, preferring the project's own changes when they conflict. Use when the user asks to "update from upstream", "sync the template", "拉取上游更新", "更新模板", or wants the newest ShipAny features in an existing project.
---

# Sync Upstream

Merge the latest template improvements from `shipany-ai/shipany-next` into this
project. Local changes always win on conflict — the project's blocks, pages, and
customizations are the product; upstream provides engine updates.

## Workflow

### 1. Preflight

```bash
git status --porcelain       # must be empty — ask the user to commit/stash first
git remote get-url origin
```

- If `origin` already points at `shipany-ai/shipany-next`, this IS the template
  repo — there is no upstream to sync. Just `git pull origin main` and stop.
- Working tree dirty → stop and ask the user to commit or stash.

### 2. Ensure the upstream remote

```bash
git remote get-url upstream 2>/dev/null \
  || git remote add upstream git@github.com:shipany-ai/shipany-next.git
git fetch upstream main
```

If the SSH fetch fails (no key configured), switch to HTTPS and retry:

```bash
git remote set-url upstream https://github.com/shipany-ai/shipany-next.git
git fetch upstream main
```

### 3. Preview what's incoming

```bash
git log --oneline HEAD..upstream/main
```

- Empty → already up to date; report and stop.
- Otherwise show the user the incoming commits before merging.

### 4. Merge, preferring local changes

Run a plain merge first so conflicts are *visible* (don't use `-X ours` blindly —
it silently discards upstream hunks with no record of where):

```bash
git merge upstream/main --no-edit
```

If the project was started from a copy instead of a clone (no shared history),
add `--allow-unrelated-histories`.

On conflict, resolve every conflicted path in favor of the local version and
record the list for the report:

```bash
git diff --name-only --diff-filter=U          # the conflict list — save it
git checkout --ours -- <each conflicted file> # keep local content
git rm <file>                                 # for files deleted locally ("deleted by us")
git add -A && git commit --no-edit
```

Special cases:
- **`pnpm-lock.yaml` conflicts** — don't hand-resolve: take either side, then let
  `pnpm install` regenerate it in step 5.
- **Translation JSON conflicts** — prefer local, but check the upstream side for
  NEW keys (added features need them); merge new keys in manually.

### 5. Post-merge integration

```bash
pnpm install                 # lockfile / new dependencies
```

- **Schema templates changed?** (`git diff HEAD@{1} -- src/config/db/schema.*.ts`)
  `schema.ts` is the user's gitignored working copy — do NOT run `db:setup` over
  it (that would clobber custom tables). Port the template's new columns/tables
  into `schema.ts` manually, then `pnpm db:push` (dev) or generate a migration.
- **New env vars?** Check `.env.example` diff; tell the user what to add to
  `.env.development`.

```bash
pnpm build                   # must pass before reporting success
```

If the build fails because a kept-local file references a changed upstream API,
fix forward (adapt the local file) — do not re-introduce the upstream version
wholesale.

### 6. Report

- Incoming commits (count + notable features)
- Files merged cleanly vs. conflicts kept-local (the saved list from step 4)
- Schema/env follow-ups the user must do
- Build status

Do NOT push — let the user review the merge first.

## Rules

1. **Local wins.** Never let upstream overwrite a file the project customized —
   `blocks/`, `page.tsx`, translations, and branding are always the user's.
2. **Conflicts must be visible.** Plain merge + per-file `--ours`, never `-X ours`.
3. **Never touch `schema.ts` automatically** — it's the user's working copy.
4. **`pnpm build` must pass** before declaring the sync done.
