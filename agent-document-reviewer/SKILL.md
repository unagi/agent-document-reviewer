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

Run the quantitative analysis script to get objective metrics.

**Script Location**: The analysis script is at `scripts/analyze_document.js` relative to the skill directory. Depending on your working directory and environment setup, you may need to adjust the path:

```bash
# Codex standard installation path
node ~/.codex/skills/agent-document-reviewer/scripts/analyze_document.js --format summary <file-path>

# If script is in your working directory
node scripts/analyze_document.js --format summary <file-path>

# With explicit relative path
node ./agent-document-reviewer/scripts/analyze_document.js --format summary <file-path>

# With custom absolute path (if needed)
node /path/to/skill/scripts/analyze_document.js --format summary <file-path>
```

**Important**: Use `--format summary` option to produce concise output suitable for LLM contexts. This omits detailed section arrays and provides only key metrics and evaluation scores.

This provides:
- Line count, word count, section count
- Heading depth and structure metrics
- Internal vs external link ratio
- Potential redundancy indicators
- Automated quality scores

**Example output** (with `--format summary`):
```json
{
  "file": "AGENTS.md",
  "metrics": {
    "totalLines": 450,
    "sectionCount": 12,
    "maxDepth": 3,
    "internalLinks": 5,
    "redundancyCount": 0
  },
  "evaluation": {
    "scores": { "overall": 8 },
    "feedback": ["✅ Document length is acceptable..."]
  }
}
```

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
node scripts/analyze_document.js path/to/AGENTS.md
```

**Output**: JSON object containing:
```json
{
  "file": "AGENTS.md",
  "metrics": {
    "totalLines": 450,
    "sectionCount": 12,
    "maxDepth": 3,
    "internalLinks": 5,
    "externalLinks": 2,
    ...
  },
  "evaluation": {
    "scores": {
      "lineCount": 7,
      "structure": 9,
      "progressiveDisclosure": 10,
      "overall": 8
    },
    "feedback": [
      "✅ Document length is acceptable (200-500 lines)",
      "✅ Good use of internal links for progressive disclosure",
      ...
    ]
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

### Pattern 1: Document Too Long (>800 lines)

**Solution**: Split into core document + specialized topics

```markdown
# Main Document (keep essential workflow)

## Specialized Topics
- Testing: See [TESTING.md](TESTING.md) for test strategies
- API: See [API.md](API.md) for REST conventions
- Database: See [DATABASE.md](DATABASE.md) for schema details
```

### Pattern 2: Critical Rules Buried

**Solution**: Create "Core Principles" section at top

```markdown
# Agent Instructions

## Core Principles (Read This First)
1. Always run tests before committing
2. Never commit secrets
3. Use conventional commits
...

## Detailed Guidelines
[Everything else below]
```

### Pattern 3: High Redundancy

**Solution**: Consolidate repeated content, use cross-references

**Before**:
```markdown
## Section A
Always use TypeScript for new files.

## Section B
Remember to use TypeScript for new files.
```

**After**:
```markdown
## Core Principles
- Use TypeScript for all new files

## Section B
Follow core principles above for file creation.
```

### Pattern 4: No Progressive Disclosure

**Solution**: Extract detailed sections into separate files

**Before**: Single 1200-line AGENTS.md

**After**:
- AGENTS.md (400 lines): Core workflow + navigation
- TESTING.md (250 lines): Test details
- API.md (300 lines): API standards
- DEPLOY.md (250 lines): Deployment process

## Notes on Interaction Style

- Always ask clarifying questions before proposing major restructuring
- Present quantitative metrics first (objective) then qualitative observations
- Offer improvements incrementally when appropriate
- Explain the "why" behind recommendations (helps users learn)
- Be prepared for follow-up iterations based on user feedback
