---
name: cr
description: "Code review - analyzes branch changes for complexity, readability, regression risks, logic correctness, translations, dead code, and duplications. Use this skill when the user wants a code review, says 'review my code', 'CR', 'code review', 'check my changes', or wants feedback on their current branch changes before creating a PR."
user-invocable: true
allowed-tools: Bash, Read, Grep, Glob
---

# Code Review

Comprehensive code review of all changes on the current branch compared to staging.

## Instructions

### Step 1: Handle Uncommitted Changes

Check for uncommitted work first:

```bash
git status
git diff --cached
git diff
```

If there are uncommitted changes, inform the user: **"You have uncommitted changes. Would you like to continue with the review including these changes, or commit/stash them first?"**

Wait for their answer before proceeding.

### Step 2: Gather Changes

```bash
# Get the base branch
BASE=$(git merge-base HEAD staging 2>/dev/null || git merge-base HEAD main)

# Get all commits on this branch
git log --oneline $BASE..HEAD

# Get the full diff
git diff $BASE..HEAD

# Include uncommitted changes in the review if any
git diff
```

### Step 3: Analyze and Review

Review all changes against these 8 criteria:

#### 1. Time Complexity
- Look for nested loops, repeated iterations, or inefficient algorithms
- Check for unnecessary re-renders in React components (missing `useMemo`, `useCallback`, `React.memo`)
- Identify opportunities to use Maps/Sets instead of array searches
- Flag any O(n^2) or worse operations that could be optimized
- Check for N+1 query patterns in repository methods

#### 2. Readability
- Variable names: Are they descriptive and consistent?
- Function names: Do they clearly describe what the function does?
- Code complexity: Is any function too long or doing too many things?
- Magic numbers/strings: Should they be constants?
- Comments: Is complex logic explained? Are there misleading comments?

#### 3. Regression Risk
- Changed function signatures: Are all callers updated?
- Renamed exports: Are all imports updated?
- Modified return values: Do consumers handle the new format?
- Removed code: Was it actually unused?
- Changed behavior: Could existing features break?
- API contract changes: Do frontend hooks match backend response shapes?
- Shared types: Are `packages/shared` changes reflected in both `apps/api` and `apps/web`?

Use grep/glob to verify all references are updated when names change.

#### 4. Logic Correctness
- Check edge cases: null/undefined handling, empty arrays, boundary conditions
- Verify error handling uses the `AppError` hierarchy (not raw throws)
- Ensure store-scoped queries always filter by `store_id` (multi-tenancy)
- Verify auth middleware is applied on new routes (`requireAuth`, `requireTier`, role checks)
- Check that SQL queries are parameterized (never concatenated user input)

#### 5. Translations (i18n) — Completeness Check
This is critical — missing translation keys show up as raw keys in the UI.

- Read the full diff of `apps/web/src/i18n/locales/en.json` and `he.json`
- Search all changed `.tsx` and `.ts` files for `t('` and `t("` calls
- For EVERY translation key used in changed files, verify:
  - The key exists in `en.json`
  - The key exists in `he.json`
  - Neither value is empty or a placeholder
- Flag any hardcoded English or Hebrew strings that should use `t()`
- Check that translation keys follow existing namespace conventions
- Verify RTL considerations: CSS logical properties (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start`, `end`) — never `left`/`right`

If missing keys are found, list them clearly:
```
Missing translation keys:
- `subscription.planName` — missing in he.json
- `orders.bulkAction` — missing in both en.json and he.json
```

#### 6. Dead Code & Redundant Comments
- Look for debugging statements left in: `debugger`, `console.log`, `console.warn` (unless intentional)
- Find commented-out code blocks that should be removed
- Detect TODO/FIXME comments that should be addressed or removed
- Flag any `// eslint-disable` without justification
- Check for unused imports, variables, or functions introduced in this PR

#### 7. Code Duplication
- Identify copy-pasted code blocks that should be extracted into shared functions
- Check if similar logic exists elsewhere in the codebase that could be reused
- Look for repeated patterns within the PR that could be abstracted
- Verify utility functions are used instead of inline implementations
- Check if new Zod schemas duplicate existing ones in `packages/shared`

#### 8. TypeScript Compilation
Run the TypeScript compiler to catch type errors:

```bash
cd apps/api && npx tsc --noEmit 2>&1 | head -50
cd apps/web && npx tsc --noEmit 2>&1 | head -50
```

Report any type errors in the changed files.

### Step 4: Present Review

Format the review as:

```
## Code Review: {branch-name}

**Files Changed:** {count}
**Lines:** +{added} / -{removed}

---

### Time Complexity
{findings or "No issues found"}

### Readability
{findings or "No issues found"}

### Regression Risk
{findings or "No issues found"}

### Logic Review
{findings or "No issues found"}

### Translations
{findings or "All keys present in both en.json and he.json"}

### Dead Code & Redundant Comments
{findings or "No issues found"}

### Code Duplication
{findings or "No issues found"}

### TypeScript Compilation
{errors in changed files or "Clean — no type errors"}

---

### Blocking Issues
{list each issue with the problematic code snippet, file path, and line number — or "None"}

### Suggestions (Non-blocking)
{improvements for consideration — or "None"}
```

### Important Review Notes

- Be specific: show the problematic code snippet with file path and line number
- Be constructive: explain WHY something is an issue and HOW to fix it
- Prioritize: clearly separate **blocking issues** (must fix) from **suggestions** (nice to have)
- If changes look good, say so briefly — don't invent problems
- Do NOT auto-fix issues. Present them clearly so the user can decide what to do.

### Step 5: Wait for User

After presenting the review, wait for the user to respond:
- If there are blocking issues, the user may fix them or ask you to fix specific ones
- If they ask you to fix, fix only what they request, then re-run the relevant checks
- Once the user is satisfied, suggest running `/pr` to create the pull request
