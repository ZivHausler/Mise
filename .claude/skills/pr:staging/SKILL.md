---
name: pr:staging
description: Rebase on staging, organize commits, and create a PR to staging
user-invocable: true
allowed-tools: Bash, Read, Grep, Glob
---

Create a pull request targeting the `staging` branch.

## Steps

### 1. Fetch and rebase onto latest staging

```
git fetch origin staging
git rebase origin/staging
```

If there are conflicts, resolve them and continue the rebase. If conflicts are complex, ask the user for guidance.

### 2. Review uncommitted changes

Run `git status` and `git diff` to check for any uncommitted work. If there are unstaged or staged changes, organize them into logical commits:

- Group related changes together (e.g., a feature + its tests in one commit, a separate bugfix in another)
- Write clear commit messages: short imperative subject line, optional body explaining *why*
- Each commit message must end with: `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`
- Use a HEREDOC for the commit message

If all changes are already committed, skip this step.

### 3. Create a feature branch (if needed)

If the current branch is `staging` or `main`, create a new branch from HEAD:

```
git checkout -b <descriptive-branch-name>
```

Use a descriptive name based on the changes (e.g., `feat/resend-custom-domain`, `fix/payment-amount-bug`).

### 4. Push and create PR

```
git push -u origin <branch-name>
```

Create the PR targeting `staging`:

```
gh pr create --base staging --title "<short title>" --body "$(cat <<'EOF'
## Summary
<1-3 bullet points describing the changes>

## Test plan
<checklist of testing steps>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### 5. Return the PR link

Output the PR URL so the user can review it.
