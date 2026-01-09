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
# Analyze single file
node scripts/analyze_document.js --format summary <file-path>

# Analyze file + all linked files (recommended for documents with progressive disclosure)
node scripts/analyze_document.js --format summary --include-links <file-path>
```

**Why `--include-links` is important**: Progressive disclosure isn't just about having links—it's about the quality of the entire system (main doc + linked docs). Without analyzing referenced files, you can miss critical issues like over-fragmentation in reference documents.

The `--include-links` option:
- Follows internal markdown links automatically
- Detects circular references
- Reports missing files (broken links)
- Provides aggregate quality metrics across all documents

For detailed usage including path options and output format, see [Using the Analysis Script](#using-the-analysis-script) below.

### 1.5. Scope & Overrides (Convention-Aware)

This skill is not AGENTS.md-only. **Instruction discovery, scope, and overrides vary by tool and filename**. Before expanding scope beyond the requested file, identify which tool consumes it (AGENTS.md / Claude Code / GitHub Copilot / Aider / etc.).

**For AGENTS.md (agents.md open format):**

When reviewing `path/to/AGENTS.md`, treat it as instructions for the directory subtree `path/to/**` — but note that **nested `AGENTS.md` files override parent instructions for their own subtrees**.

- **Scope rule (default)**: Only analyze the target subtree and documents reachable via links from in-scope `AGENTS.md` files. Do **not** crawl the entire repository by default.
- **Override model**: The closest `AGENTS.md` to the edited file wins; explicit user chat prompts override everything.
- **What to review**: the requested `AGENTS.md`, any nested `AGENTS.md` under that directory (they change effective rules for parts of the subtree), and any linked documents from those in-scope `AGENTS.md` files.

To discover nested overrides:
```bash
# Analyze all AGENTS.md files under a directory
node scripts/analyze_document.js --scope tree --format summary path/to/

# Analyze AGENTS.md + nested AGENTS.md under its directory
node scripts/analyze_document.js --scope tree --format summary path/to/AGENTS.md
```

**For other instruction files (CLAUDE.md, GitHub Copilot, Aider, etc.):**

Do **not** assume "nearest file wins" or parent-directory discovery unless the tool's documentation says so. See [conventions.md](references/conventions.md) for a quick reference.

If the tool is unknown, keep scope to:
- the requested file
- documents explicitly linked from it

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
- **⚠️ CRITICAL**: Review linked files too! Use `--include-links` in Step 1. High internal link count means nothing if referenced files have poor quality (e.g., 71 sections, over-fragmentation).

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
# Single file
node scripts/analyze_document.js --format summary <file-path>

# File + linked files (recommended)
node scripts/analyze_document.js --format summary --include-links <file-path>
```

**Options for `--include-links`**:
```bash
# Default: depth=1, count=10
node scripts/analyze_document.js --format summary --include-links <file-path>

# Custom limits (for large documentation systems)
node scripts/analyze_document.js --format summary --include-links --max-depth 2 --max-count 20 <file-path>
```

**Path options** (depending on your working directory):
```bash
# Codex standard installation path
node ~/.codex/skills/agent-document-reviewer/scripts/analyze_document.js --format summary --include-links <file-path>

# Claude Code standard installation path
node ~/.claude/skills/agent-document-reviewer/scripts/analyze_document.js --format summary --include-links <file-path>

# Relative path from working directory
node scripts/analyze_document.js --format summary --include-links <file-path>
```

**Important**: Use `--format summary` to produce concise output suitable for LLM contexts. This omits detailed section arrays and provides only key metrics and evaluation scores.

**Output** (single file):
```json
{
  "file": "AGENTS.md",
  "metrics": {
    "totalLines": 450,
    "sectionCount": 12,
    "maxDepth": 3,
    "internalLinks": 5,
    ...
  },
  "evaluation": {
    "scores": { "overall": 8 },
    "feedback": ["✅ Document length is acceptable..."]
  }
}
```

**Output** (with `--include-links`):
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
      "circular": [],
      "maxDepth": ["deeper-file.md"],
      "maxCount": []
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
