---
name: pr
description: "Create a pull request - rebases on staging, runs tests, intelligently splits changes into logical commits, creates a feature branch, pushes, and opens a PR. Use this skill when the user says 'create a PR', 'push to staging', 'open a pull request', 'make a PR', '/pr', or wants to ship their current branch changes."
user-invocable: true
allowed-tools: Bash, Read, Grep, Glob
---

# Pull Request Creation

Rebase on staging, run tests, organize commits logically, and create a PR targeting `staging`.

## Instructions

### Step 1: Rebase on Staging

```bash
git fetch origin staging
git rebase origin/staging
```

If there are conflicts, resolve them. If conflicts are complex, ask the user for guidance.

### Step 2: Run Tests

Invoke the `/run:tests` skill to run all unit and E2E tests. If tests fail, report the failures and wait for the user to decide how to proceed.

### Step 3: Analyze Changes for Commit Strategy

Understand the full scope of what's being shipped:

```bash
BASE=$(git merge-base HEAD staging 2>/dev/null || git merge-base HEAD main)
git log --oneline $BASE..HEAD
git diff --stat $BASE..HEAD
git status
```

Read the actual diffs and changed files to understand what was done. Then decide on a commit strategy — how to split the work into clean, logical commits that tell a clear story. Think about it like a reviewer reading the PR commit by commit:

- **Database migrations** should be their own commit(s)
- **Backend feature work** (types, schemas, repository, service, controller, routes) can be one commit per feature/module
- **Frontend feature work** (components, pages, hooks, translations) can be one commit per feature/page
- **Bug fixes** should be separate commits from features
- **Refactoring** should be separate from new functionality
- **Test additions** can go with the feature they test, or be their own commit if substantial

Each commit should be self-contained and buildable — no commit should break the build if checked out independently.

### Step 4: Create Commits

If there are uncommitted changes or if the existing commits should be reorganized:

1. Soft-reset all branch commits back to the base:
   ```bash
   git reset $BASE
   ```

2. Stage and commit in logical groups following the strategy from Step 3. For each commit:
   - Stage only the relevant files: `git add <specific files>`
   - Write a clear commit message with imperative subject line
   - End each commit message with: `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`
   - Use a HEREDOC for the message

If the existing commits are already well-organized, skip the reset and just commit any uncommitted changes.

### Step 5: Create Branch (if needed)

If the current branch is `staging` or `main`, create a new branch from HEAD:

```bash
git checkout -b <descriptive-branch-name>
```

Use a descriptive name based on the changes (e.g., `feat/supplier-management`, `fix/payment-amount-bug`).

### Step 6: Push and Create PR

```bash
git push -u origin <branch-name>
```

Create the PR targeting `staging`. Write a summary based on the actual changes — read the commits and diffs, don't just guess:

```bash
gh pr create --base staging --title "<short title>" --body "$(cat <<'EOF'
## Summary
<1-3 bullet points describing the changes>

## Changes
<list of commits with brief descriptions>

## Test plan
<checklist of testing steps>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### Step 7: Return the PR Link

Output the PR URL so the user can review it.
