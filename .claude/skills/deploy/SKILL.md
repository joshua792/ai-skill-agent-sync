---
name: deploy
description: Commit changes, push to GitHub, generate tests for new functionality, and update CLAUDE.md changelog. Use when ready to deploy work.
disable-model-invocation: true
argument-hint: "[optional commit message]"
---

# Deploy Skill

Execute the following four-phase deployment pipeline in strict order. Do NOT skip phases. If a phase fails, stop and report the failure to the user.

## Phase 1: Create Commit

### 1a. Analyze Changes

Run `git status` and `git diff` (for unstaged changes) and `git diff --cached` (for staged changes) to understand what has changed.

- If there are NO changes (no untracked files, no modifications, no staged changes), report "Nothing to deploy -- working tree is clean" and STOP.

### 1b. Generate Commit Message

Analyze all changes and produce a commit message following this format:

```
<type>: <concise summary under 72 chars>

<body explaining what changed and why, wrapped at 72 chars>

Files changed:
- <list of files>
```

Where `<type>` is one of: feat, fix, refactor, test, docs, chore, style.

If `$ARGUMENTS` was provided, use it as the basis for the commit message while still following the format above. If no arguments were provided, generate the message entirely from the diff analysis.

### 1c. Stage and Commit

- Stage all relevant files using `git add` with specific file paths (NEVER use `git add -A` or `git add .`).
- Do NOT stage files containing secrets, credentials, API keys, or `.env` files.
- Do NOT stage binary output files (PDFs, images) unless they are clearly intentional project assets.
- Create the commit with the generated message. Always include at the end of the commit message:

```
Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

### 1d. Handle Initial Commit

If this is the very first commit (check with `git rev-parse HEAD` -- if it fails, there are no prior commits):
- Stage all project source files, configs, and documentation.
- Use type `feat` with summary "Initial commit -- jersey production design tool".

## Phase 2: Push to GitHub

- If this is the first push (no upstream tracking), run `git push -u origin master`.
- Otherwise, run `git push origin master`.
- If the push fails due to authentication, report the error clearly and suggest the user configure their GitHub credentials. STOP.
- If the push fails because the remote branch has diverged, report the conflict and ask the user how to proceed. Do NOT force push. STOP.

## Phase 3: Run Test Agent

Invoke the `/test` skill by using the Skill tool with `skill: "test"`. Pass the summary of what changed in this commit as the argument so the test agent can focus on the new/modified functionality.

The test agent will:
1. Create or update pytest test cases covering **security**, **functionality**, and **integration contracts**
2. Run the full test suite and report results
3. See `.claude/skills/test/SKILL.md` for full test agent behavior

After the test agent completes:
- If new test files were created or updated, stage them with specific file paths and commit with message: `test: add tests for <description of what was tested>`
- Push the test commit to origin.
- If tests fail and cannot be fixed, report the failures but continue to Phase 4.

## Phase 4: Update CLAUDE.md

Read the existing `CLAUDE.md` file at the project root.

Append a new entry to the `## Changelog` section with this format:

```markdown
### <YYYY-MM-DD>
- **Commit**: `<first 7 chars of hash>` -- <commit summary>
- **Changes**: <1-2 sentence description of what was done>
- **Tests**: <status, e.g. "Added 5 tests, all passing" or "No new tests">
- **Files**: <comma-separated list of changed files>
```

Do NOT overwrite or restructure existing CLAUDE.md content. Only append to the Changelog section.

Then:
- Stage CLAUDE.md: `git add CLAUDE.md`
- Commit: `docs: update CLAUDE.md changelog for <commit summary>`
- Push to origin.

## Completion

Report a summary to the user:
- Commit hash and message
- Push status (success/failure)
- Test results (pass/fail count, new tests created)
- CLAUDE.md update status