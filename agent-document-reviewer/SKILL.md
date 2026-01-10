---
name: agent-document-reviewer
description: Review and improve AI agent instruction documents (AGENTS.md, Claude.md, etc.) for quality, clarity, and effectiveness. Use when users request review of agent documentation, ask to evaluate document structure, detect bloat, check progressive disclosure, or improve agent instruction quality. Applicable across different AI agent environments.
---

# Agent Document Reviewer

## Overview

This skill helps review and improve documents intended for AI agent consumption (like AGENTS.md, Claude.md, or custom agent instructions). It identifies common issues that reduce document effectiveness:

- **Bloat**: Documents become too long, causing agents to miss critical instructions
- **Poor structure**: Important rules buried late in the document
- **Redundancy**: Repeated information wasting context window
- **Monolithic design**: All details in one file instead of using progressive disclosure

## Workflow

Follow this sequence when reviewing a document:

### 1. Initial Analysis

Run the quantitative analysis script to get objective metrics:

```bash
# Default: Analyze file + all linked files (recommended)
node scripts/analyze_document.js --root-dir <root-directory> <file-path>

# Analyze single file only (skip link analysis)
node scripts/analyze_document.js --no-include-links <file-path>
```

**⚠️ SECURITY**: The `--root-dir` parameter is **REQUIRED** for link analysis. It enforces a security sandbox, preventing malicious documents from accessing sensitive files (like `~/.ssh/id_rsa` or `~/.aws/credentials`) through directory traversal attacks (`../../../etc/passwd`).

**Default behavior**: Link analysis is enabled by default when `--root-dir` is specified. This ensures progressive disclosure evaluation includes the entire documentation system (main doc + linked docs).

Link analysis:
- Follows internal markdown links automatically
- Reports missing files (broken links)
- Blocks links outside root directory (security sandbox)
- Provides aggregate quality metrics across all documents

For detailed usage including path options and output format, see [Using the Analysis Script](#using-the-analysis-script) below.

### 1.5. Scope & Overrides (Convention-Aware)

This skill is not AGENTS.md-only. **Instruction discovery, scope, and overrides vary by tool and filename**. Before expanding scope beyond the requested file, identify which tool consumes it (AGENTS.md / Claude Code / GitHub Copilot / Aider / etc.).

**For AGENTS.md (agents.md open format):**

When reviewing `path/to/AGENTS.md`, treat it as instructions for the directory subtree `path/to/**` — but note that **nested `AGENTS.md` files override parent instructions for their own subtrees**.

- **Scope rule**: Analyze the requested `AGENTS.md` and documents reachable via its internal links
- **Override model**: The closest `AGENTS.md` to the edited file wins; explicit user chat prompts override everything
- **Multiple AGENTS.md**: To analyze all AGENTS.md files in a directory tree:
  ```bash
  # Option 1: Unified analysis (with shared deduplication, recommended)
  # Analyze all together - common references (TESTING.md etc.) are analyzed once
  find /path/to/project -name "AGENTS.md" -exec \
    node scripts/analyze_document.js --root-dir /path/to/project {} +

  # Or use shell glob expansion
  node scripts/analyze_document.js --root-dir /project /project/**/AGENTS.md

  # Option 2: Individual analysis (separate reports)
  # Analyze each one independently
  find /path/to/project -name "AGENTS.md" -print0 | \
    xargs -0 -I {} node scripts/analyze_document.js --no-include-links {}
  ```

**For other instruction files (CLAUDE.md, GitHub Copilot, Aider, etc.):**

Do **not** assume "nearest file wins" or parent-directory discovery unless the tool's documentation says so. See [conventions.md](references/conventions.md) for a quick reference.

Default scope:
- The requested file
- Documents explicitly linked from it

### 2. Qualitative Review

Read the document with these questions in mind:

**Sequential Reading Impact**:
- Would an agent miss critical instructions if it stops at 30% of the document?
- Are "MUST" and "NEVER" rules front-loaded?
- Are early sections contradicted by later sections?

**Redundancy**:
- Are phrases or instructions repeated?
- Could sections be consolidated?
- Are there too many similar examples?

**Progressive Disclosure**:
- Is detailed content split into separate files?
- Are internal links clear about when to read them?
- Is the main document lean enough to be fully loaded?
- **⚠️ CRITICAL**: Review linked files too! Step 1 の `--root-dir` 付き実行（デフォルトでリンク解析有効）で、リンク先ドキュメントも含めて評価してください。内部リンクが多くても、参照先が低品質（例: セクション過多・過分割）だと逆効果になり得ます。

For detailed criteria, see [review-criteria.md](references/review-criteria.md).

### 3. Clarifying Questions (If Needed)

Before proposing changes, ask the user if:
- The document has specific constraints (e.g., must be single-file)
- There are related documents that should be reviewed together
- Certain sections have special importance
- There are known issues they want addressed

### 4. Present Findings

Structure the review output as:

```markdown
## Document Analysis: [filename]

### Quantitative Metrics
- Lines: [count] ([evaluation])
- Sections: [count] ([evaluation])
- Max depth: [level] ([evaluation])
- Internal links: [count] ([evaluation])
- Overall score: [X/10]

### Key Issues
1. [Most critical issue with line references]
2. [Second issue with line references]
3. [Additional issues...]

### Recommendations
[Prioritized list of improvements]

### Detailed Feedback
[Specific observations from qualitative review]
```

### 5. Propose Improvements

Offer concrete, actionable suggestions:
- Specific line ranges to move, consolidate, or split
- Suggested file splits with clear boundaries
- Rewritten sections that fix identified issues

Ask user preference:
- "Would you like me to implement these improvements?"
- "Should we do this in steps, or all at once?"

### 6. Implementation (If Requested)

When implementing improvements:
- Show before/after for major changes
- Create new files for content splits
- Update internal links
- Preserve git history with clear commit messages

## Using the Analysis Script

The `scripts/analyze_document.js` script provides deterministic metrics to support your review.

**Basic usage**:
```bash
# Default: Analyze file + linked files (recommended)
node scripts/analyze_document.js --root-dir <root-directory> <file-path>

# Single file only (skip link analysis)
node scripts/analyze_document.js --no-include-links <file-path>

# Full output format (instead of summary)
node scripts/analyze_document.js --root-dir <root-directory> --format full <file-path>
```

**Advanced options**:
```bash
# Custom limits (for very large documentation systems)
node scripts/analyze_document.js --root-dir <root-directory> --max-depth 5 --max-count 50 <file-path>

# Optional hardening (skip symlink targets when following links)
node scripts/analyze_document.js --root-dir <root-directory> --no-symlinks <file-path>
```

**Multiple files** (unified analysis with shared deduplication):
```bash
# Analyze multiple files together (common references analyzed once)
node scripts/analyze_document.js --root-dir /project \
  /project/AGENTS.md /project/subdir/AGENTS.md

# Use shell glob expansion
node scripts/analyze_document.js --root-dir /project /project/**/AGENTS.md

# With find command
find /project -name "AGENTS.md" -exec \
  node scripts/analyze_document.js --root-dir /project {} +
```

**Path options** (depending on your working directory):
```bash
# Codex standard installation path
node ~/.codex/skills/agent-document-reviewer/scripts/analyze_document.js --root-dir <root-directory> <file-path>

# Claude Code standard installation path
node ~/.claude/skills/agent-document-reviewer/scripts/analyze_document.js --root-dir <root-directory> <file-path>

# Relative path from working directory (from project root)
node scripts/analyze_document.js --root-dir . <file-path>
```

**Important notes**:
- Default output format is `summary` (concise, suitable for LLM contexts)
- Default behavior includes link analysis when `--root-dir` is specified
- `--root-dir` is REQUIRED for link analysis (security sandbox)
- Use `--no-include-links` to skip link analysis (single file only)
- Use `--no-symlinks` to avoid reading through symlink targets during link analysis (best-effort)
- Use `--format full` for detailed output with section arrays

**Output** (single file with `--no-include-links`):
```json
{
  "file": "AGENTS.md",
  "metrics": {
    "totalLines": 450,
    "sectionCount": 12,
    "maxDepth": 3,
    "internalLinks": 5,
    "anchorLinks": 0,
    ...
  },
  "evaluation": {
    "scores": { "overall": 8 },
    "feedback": ["✅ Document length is acceptable..."]
  }
}
```

**Output** (default with `--root-dir`, includes link analysis):
```json
{
  "file": "AGENTS.md",
  "linkedAnalysis": {
    "analyzed": [
      { "file": "AGENTS.md", "depth": 0, "metrics": {...}, "evaluation": {...} },
      { "file": "TESTING.md", "depth": 1, "metrics": {...}, "evaluation": {...} }
    ],
    "notFound": ["references/missing-file.md"],
    "skipped": {
      "maxDepth": ["deeper-file.md"],
      "maxCount": [],
      "outsideRoot": [
        { "url": "../../../etc/passwd", "resolvedPath": "/etc/passwd" }
      ]
    },
    "summary": {
      "totalAnalyzed": 2,
      "averageScore": 7.5,
      "worstScore": 7,
      "worstFile": "/path/to/AGENTS.md"
    }
  }
}
```

**Output** (multiple files with `--root-dir`, unified analysis):
```json
{
  "entryPoints": ["AGENTS.md", "subdir/AGENTS.md"],
  "linkedAnalysis": {
    "analyzed": [
      { "file": "AGENTS.md", "depth": 0, "metrics": {...}, "evaluation": {...} },
      { "file": "COMMON.md", "depth": 1, "metrics": {...}, "evaluation": {...} },
      { "file": "subdir/AGENTS.md", "depth": 0, "metrics": {...}, "evaluation": {...} }
    ],
    "summary": {
      "totalAnalyzed": 3,
      "averageScore": 8.0,
      "worstScore": 7,
      "worstFile": "/path/to/AGENTS.md"
    }
  }
}
```

Note: When analyzing multiple entry points, common references (like COMMON.md) are analyzed only once due to shared deduplication.

**Interpreting scores** (0-10 scale):
- **8-10**: Excellent
- **6-7**: Good, minor improvements possible
- **4-5**: Acceptable, but has issues
- **0-3**: Needs significant improvement

Always run this script first to ground your review in objective data.

## Review Criteria

Key evaluation dimensions:

1. **Sequential vs. Complete Reading**: Does partial reading miss critical info?
2. **Redundancy**: Is content unnecessarily repeated?
3. **Progressive Disclosure**: Are details appropriately split into linked files?
   - ⚠️ **Anchor links** (`#section`) are penalized - LLMs read entire documents at once, making same-document navigation meaningless
   - ✅ Use separate files instead to reduce context size
4. **Quantitative Metrics**: Line count, structure, link ratios

For detailed criteria with examples, see [review-criteria.md](references/review-criteria.md).

## Best Practices

Quick reference for document quality:

- **Target length**: <500 lines for main documents
- **Front-load**: Critical rules in first 100 lines
- **Progressive disclosure**: Split details into separate files with clear triggers
- **Minimal redundancy**: State each instruction once
- **Clear hierarchy**: ≤3 heading levels preferred

For comprehensive best practices with templates, see [best-practices.md](references/best-practices.md).

## Common Improvement Patterns

| Problem | Solution | Key Technique |
|---------|----------|---------------|
| **Document too long** (>800 lines) | Split into core + specialized topics | Progressive disclosure with internal links |
| **Critical rules buried** | Create "Core Principles" section at top | Front-load MUST/NEVER rules |
| **High redundancy** | Consolidate repeated content | State once, cross-reference elsewhere |
| **No progressive disclosure** | Extract detailed sections to separate files | Keep main doc <500 lines |

### Examples

**Pattern 1: Splitting long documents**
```markdown
# Main Document (keep essential workflow)

## Specialized Topics
- Testing: See [TESTING.md](TESTING.md)
- API: See [API.md](API.md)
- Database: See [DATABASE.md](DATABASE.md)
```

**Pattern 2: Front-loading critical rules**
```markdown
# Agent Instructions

## Core Principles (Read This First)
1. Always run tests before committing
2. Never commit secrets
3. Use conventional commits
```

**Pattern 3: Eliminating redundancy**
```markdown
## Core Principles
- Use TypeScript for all new files

## Section B
Follow core principles above for file creation.
```

## Notes on Interaction Style

- Always ask clarifying questions before proposing major restructuring
- Present quantitative metrics first (objective) then qualitative observations
- Offer improvements incrementally when appropriate
- Explain the "why" behind recommendations (helps users learn)
- Be prepared for follow-up iterations based on user feedback
