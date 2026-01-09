# Best Practices for AI Agent Documents

This document provides actionable best practices for creating and maintaining documents consumed by AI agents (e.g., AGENTS.md, Claude.md, custom instructions).

## Table of Contents
1. [Document Structure](#document-structure)
2. [Front-Loading Critical Information](#front-loading-critical-information)
3. [Progressive Disclosure](#progressive-disclosure)
4. [Clarity and Conciseness](#clarity-and-conciseness)
5. [Maintenance and Evolution](#maintenance-and-evolution)

---

## Document Structure

### Keep Documents Lean

**Target**: Main instruction files should be under 500 lines.

**Why**: AI agents often read sequentially and may not reach the end of long documents. Shorter documents ensure critical instructions are not missed.

**How**:
- Use progressive disclosure (split into multiple files)
- Remove redundant content
- Be concise and direct

### Use Clear Hierarchy

**Good hierarchy**:
```markdown
# Main Topic
## Subtopic 1
### Detail A
### Detail B
## Subtopic 2
### Detail C
```

**Avoid**:
- Deep nesting (>4 levels)
- Single-item sections
- Inconsistent heading levels

### Logical Section Order

1. **Overview/Summary** - What this document covers
2. **Core Principles** - Must-follow rules (front-loaded)
3. **Common Tasks** - Frequent operations
4. **Detailed Guidelines** - In-depth explanations
5. **References** - Links to other documents

---

## Front-Loading Critical Information

### The First 100 Lines Are Critical

**Why**: Agents may process documents partially. The first ~20% is most likely to be read.

**What to front-load**:
- Absolute requirements ("MUST", "NEVER")
- Common operations
- Navigation guide (what's in this document, what's elsewhere)

**Example**:
```markdown
# Agent Instructions

## Core Rules (Read This First)
1. Always run tests before committing
2. Never commit secrets or credentials
3. Use conventional commit format
4. Ask for clarification when requirements are unclear

## Document Navigation
- For testing details: See [TESTING.md](TESTING.md)
- For API standards: See [API.md](API.md)
- For deployment: See [DEPLOY.md](DEPLOY.md)

## Common Tasks
[Most frequent operations here]

## Detailed Guidelines
[In-depth explanations below]
```

### Use Summary Sections

Provide quick-reference summaries at the top:
```markdown
## Quick Reference

| Task | Command | Notes |
|------|---------|-------|
| Run tests | `npm test` | Required before commit |
| Build | `npm run build` | Check for type errors |
| Commit | `git commit` | Use conventional format |
```

---

## Progressive Disclosure

### Split Large Documents

**When to split**:
- Document exceeds 500 lines
- Contains distinct topic areas
- Some sections are rarely needed

**How to split**:
```markdown
# Main Document (AGENTS.md)

## Core Workflow
[Essential daily operations]

## Specialized Topics
- **Testing**: See [TESTING.md](TESTING.md) for test strategies, fixtures, and mocking
- **API Development**: See [API.md](API.md) for REST conventions, authentication, and versioning
- **Database**: See [DATABASE.md](DATABASE.md) for schema, migrations, and queries
```

### Make Links Actionable

**Good links** - Clear trigger and value:
```markdown
For database migrations, see [MIGRATIONS.md](MIGRATIONS.md)
When writing API endpoints, consult [API.md](API.md) for authentication patterns
```

**Bad links** - Vague or no context:
```markdown
See [OTHER.md](OTHER.md)
More info [here](DETAILS.md)
```

### Keep Referenced Documents Self-Contained

Each linked document should:
- Have a clear scope
- Be readable standalone
- Not require reading the main document first

---

## Clarity and Conciseness

### Be Direct and Specific

**Good**:
```markdown
Run `npm test` before committing. All tests must pass.
```

**Bad**:
```markdown
It's generally a good idea to run the test suite before you commit your changes,
as this helps ensure that you haven't introduced any regressions. Ideally, all
tests should pass, though in some cases...
```

### Use Examples Sparingly

**One good example > three similar examples**

**Good**:
```markdown
Use conventional commits:
```
feat: add user authentication
```

**Excessive**:
```markdown
Use conventional commits:
```
feat: add user authentication
fix: resolve login bug
docs: update README
chore: bump dependencies
```
(The last 3 add little value)

### Avoid Redundancy

**Bad** - Same concept repeated:
```markdown
## Testing
Always write tests for new features.

## Development Workflow
Remember to write tests for new features.

## Code Quality
Don't forget to write tests for new features.
```

**Good** - State once, reference elsewhere:
```markdown
## Testing
Always write tests for new features. See [TESTING.md](TESTING.md) for guidelines.

## Development Workflow
1. Write code
2. Write tests (see [TESTING.md](TESTING.md))
3. Commit changes
```

---

## Maintenance and Evolution

### Regular Audits

**Quarterly review checklist**:
- [ ] Document still under target line count?
- [ ] New repeated content that could be consolidated?
- [ ] Outdated sections that can be removed?
- [ ] New patterns that should be documented?

### Incremental Improvements

**When adding content**:
1. Check if it fits existing sections
2. If adding >50 lines, consider creating a separate file
3. Update navigation/TOC when adding new sections

**When removing content**:
- Prefer removing over adding
- Archive in git history, don't comment out

### Version Control Best Practices

**Good commit messages**:
```
docs: consolidate testing guidelines into TESTING.md

Moved 200 lines of test-specific content from AGENTS.md to TESTING.md
to improve progressive disclosure. Main document now 450 lines (was 650).
```

**Track metrics over time**:
- Monitor document line count trends
- Flag when documents exceed thresholds
- Celebrate reductions in size

---

## Anti-Patterns to Avoid

### ❌ Everything in One File
Large monolithic documents (>1000 lines) are hard to maintain and navigate.

### ❌ Too Much Fragmentation
Splitting into 20+ files makes it hard to know where anything is.

### ❌ Unclear Link Purposes
Links without context leave readers guessing when to follow them.

### ❌ Burying Critical Rules
Important requirements should be front-loaded, not buried.

### ❌ Excessive Examples
One clear example > five similar ones.

### ❌ Contradictory Instructions
Sequential readers may miss corrections later in the document.

### ❌ Stale Content
Outdated instructions are worse than no instructions.

---

## Templates

### Minimal AGENTS.md Template

```markdown
# Agent Instructions

## Core Principles
1. [Critical rule 1]
2. [Critical rule 2]
3. [Critical rule 3]

## Common Tasks

### Task 1
[Concise instructions]

### Task 2
[Concise instructions]

## Detailed Guidelines

For specialized topics, see:
- [TOPIC1.md](TOPIC1.md) - [when to read this]
- [TOPIC2.md](TOPIC2.md) - [when to read this]

## Quick Reference

| Task | Command | Notes |
|------|---------|-------|
| ... | ... | ... |
```

### Specialized Document Template

```markdown
# [Topic Name]

## Overview
[1-2 sentences: what this document covers]

## When to Use This
[Clear triggers for reading this document]

## [Primary Section]
[Core content]

## [Secondary Section]
[Supporting content]

## Examples
[One good example, if needed]

## Related Documents
- [OTHER.md](OTHER.md) - [relationship]
```

---

## Measuring Success

A well-structured AI agent document should:
- ✅ Be under 500 lines (or split with clear progressive disclosure)
- ✅ Front-load critical requirements
- ✅ Have clear, actionable internal links
- ✅ Contain minimal redundancy
- ✅ Use appropriate heading depth (≤4 levels)
- ✅ Provide quick navigation
- ✅ Be maintainable over time

Use the `analyze_document.js` script to track these metrics objectively.
