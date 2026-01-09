# Review Criteria for AI Agent Documents

This document details the key criteria for evaluating documents intended for AI agent consumption (e.g., AGENTS.md, Claude.md).

## Table of Contents
1. [Sequential vs. Complete Reading Impact](#sequential-vs-complete-reading-impact)
2. [Redundancy Detection](#redundancy-detection)
3. [Progressive Disclosure Design](#progressive-disclosure-design)
4. [Quantitative Metrics](#quantitative-metrics)

---

## Sequential vs. Complete Reading Impact

**Problem**: AI agents often read documents sequentially from the beginning, stopping when they have "enough" context. If critical instructions appear late in the document, they may be missed.

**What to Check**:
- Does the document front-load essential information?
- Would reading only the first 20-30% miss critical instructions?
- Are there contradictions between early and late sections?

**Good Example**:
```markdown
# Core Principles (at the top)
- Always validate input
- Never commit without tests
- Use conventional commits

## Detailed Guidelines (lower in doc)
### Input Validation
...detailed explanation...
```

**Bad Example**:
```markdown
# Introduction
This document describes our coding standards...

## History
Our team was founded in...

## Important: Critical Rules (buried at line 500)
- Never commit without tests (but agent already stopped reading)
```

**Evaluation**:
- ✅ Critical instructions in first 100 lines
- ✅ Early summary of all key requirements
- ✅ Later sections provide details, not new requirements
- ⚠️  Important rules scattered throughout
- ❌ Critical instructions only appear late in document

---

## Redundancy Detection

**Problem**: Repeating the same information in multiple places wastes context window and can lead to inconsistencies.

**What to Check**:
- Are there repeated phrases or instructions?
- Is the same concept explained multiple times?
- Could sections be consolidated?

**Types of Redundancy**:

1. **Verbatim Repetition**: Same text appears multiple times
   ```markdown
   ## Section A
   Always use TypeScript for new files.

   ## Section B
   Always use TypeScript for new files.
   ```

2. **Paraphrased Repetition**: Same meaning, different words
   ```markdown
   ## Section A
   Use TypeScript for all new code.

   ## Section B
   TypeScript is required for new files.
   ```

3. **Example Redundancy**: Too many similar examples
   ```markdown
   Good: const x: number = 1
   Good: const y: number = 2
   Good: const z: number = 3
   (One example would suffice)
   ```

**Good Practice**:
- State each instruction once, in its natural location
- Use internal links to reference detailed explanations
- Consolidate related concepts

**Evaluation**:
- ✅ Each concept stated once clearly
- ✅ Cross-references used instead of repetition
- ⚠️  Some similar phrasing across sections
- ❌ Same instructions repeated multiple times

---

## Progressive Disclosure Design

**Problem**: If all details are in a single file, agents must load everything into context even when only specific parts are relevant. This wastes tokens and increases the risk of missing important instructions.

**Important**: Discovery/scope/override rules depend on the tool and filename. Do not assume that every instruction document behaves like `AGENTS.md`. When in doubt, confirm the tool’s conventions (see [conventions.md](conventions.md)).

**What to Check**:
- Is detailed information split into separate files?
- Are internal links clear and well-motivated?
- Is it obvious when to read linked content?
- For monorepos, are rules appropriately scoped using nested `AGENTS.md` files (hierarchical overrides)?

**Progressive Disclosure Pattern**:
```markdown
# Main Document (AGENTS.md)

## Testing
Run tests before committing. For test-specific guidelines, see [TESTING.md](TESTING.md).

## API Standards
Use RESTful conventions. For complete API reference, see [API.md](API.md).
```

**Good Indicators**:
- Clear trigger for when to read each linked document
- Main document stays under 500 lines
- Links have descriptive context (not just "see here")
- Linked documents are self-contained

**Bad Patterns**:
```markdown
# Bad: Vague links
For more info, see [OTHER.md](OTHER.md)
(When should I read it? What will I find?)

# Bad: Ignoring hierarchy
# repo-root/AGENTS.md and packages/foo/AGENTS.md disagree, but the review treats both as equally applicable.
# In practice, the closest AGENTS.md wins for files under packages/foo.

# Bad: Everything in one file
AGENTS.md (2000 lines covering everything)

# Bad: Too fragmented
See [A.md](A.md) for X
See [B.md](B.md) for Y
See [C.md](C.md) for Z
...20 more links in first paragraph
```

**Evaluation Questions**:
- Is there a clear incentive to follow each link?
- Would an agent know when to read the linked content?
- Is the main document lean enough to be fully loaded?
- If nested `AGENTS.md` files exist, is it clear which one applies to which subtree (closest file wins)?
- Are overrides intentional and documented (instead of accidental contradictions)?

**Evaluation**:
- ✅ Document is short enough to be fully loaded (e.g., ≤200 lines), so progressive disclosure is optional
- ✅ 3+ meaningful internal links with clear triggers
- ✅ Main document under 500 lines
- ✅ Links describe when/why to read them
- ✅ Overrides are scoped via nested `AGENTS.md` with clear boundaries
- ⚠️  Some links present but unclear when to use
- ❌ No internal links (monolithic document)
- ❌ Too many links without clear purpose
- ❌ Conflicting `AGENTS.md` files without acknowledging the hierarchy (closest wins)

---

## Quantitative Metrics

**Purpose**: Provide objective measurements to support qualitative review.

| Metric | Excellent | Good | Warning | Critical | Rationale |
|--------|-----------|------|---------|----------|-----------|
| **Line Count** | ≤200 | 201-500 | 501-800 | >800 | Longer docs increase risk of missing content |
| **Section Count** | - | ≤15 | 16-30 | >30 | Too many = fragmentation; too few = lack of structure |
| **Heading Depth** | - | ≤3 levels | 4 levels | ≥5 levels | Deep nesting makes navigation difficult |
| **Internal Link Ratio** | ≥50% | 20-49% | <20% or none | - | Internal links indicate good progressive disclosure |
| **Avg Section Length** | - | 15-50 lines | <15 or >100 | - | Sections should be substantial but digestible |
| **Front-Loaded Content** | Critical instructions in first 100 lines | - | - | - | Early content is more likely to be read |

---

## Using These Criteria

When reviewing a document:

1. **Run quantitative analysis** (`analyze_document.js`) for objective metrics
2. **Check sequential reading impact**: Would an agent miss critical info if it stops at 30%?
3. **Scan for redundancy**: Are there repeated phrases or concepts?
4. **Evaluate progressive disclosure**: Are internal links clear and motivated?
5. **Synthesize findings**: Combine quantitative and qualitative observations

## Improvement Priorities

When multiple issues are present, prioritize:
1. **Critical instructions late in document** → Move to top
2. **Document >800 lines** → Split into separate files with progressive disclosure
3. **High redundancy** → Consolidate repeated content
4. **Poor progressive disclosure** → Add internal links with clear triggers
5. **Deep nesting or fragmentation** → Restructure sections
