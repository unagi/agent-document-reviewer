# Agent Document Reviewer

A Claude skill for reviewing and improving AI agent instruction documents (like AGENTS.md, Claude.md, etc.).

[日本語版 README](README.ja.md)

## Overview

AI agent instruction documents often suffer from:
- **Bloat**: Growing too long, causing agents to miss critical instructions
- **Poor structure**: Important rules buried late in the document
- **Redundancy**: Repeated information wasting context window
- **Monolithic design**: All details in one file instead of using progressive disclosure

This skill helps identify these issues and provides concrete improvements backed by quantitative metrics.

## Features

### 🔍 Quantitative Analysis
- Automated document metrics (line count, structure, links)
- Objective quality scoring (0-10 scale)
- Redundancy detection
- Pure Node.js implementation (no external dependencies)

### 📋 Comprehensive Review Criteria
- **Sequential reading impact**: Does partial reading miss critical info?
- **Redundancy detection**: Are instructions unnecessarily repeated?
- **Progressive disclosure**: Are details appropriately split into linked files?
- **Quantitative metrics**: Line count, structure, link ratios

### 💡 Actionable Improvements
- Specific recommendations with line references
- Common improvement patterns
- Before/after examples
- Step-by-step implementation guidance

## Prerequisites

- **Node.js**: 14 or higher (for running the analysis script)
- **Python**: 3.7 or higher (for packaging only, not required for usage)
- **Claude**: A version that supports skills

## Installation

### For Claude Code

#### Recommended: Plugin Marketplace (Easy Updates)

Install via Claude Code's plugin marketplace system:

```bash
# Add this repository as a marketplace
/plugin marketplace add https://github.com/unagi/agent-document-reviewer

# Install the skill
/plugin install agent-document-reviewer
```

This method enables automatic updates and is the easiest way to keep the skill current.

#### Manual Installation

If you prefer manual installation:

```bash
# Download the latest skill package
curl -LO https://github.com/unagi/agent-document-reviewer/releases/latest/download/agent-document-reviewer.skill

# Extract to Claude's skills directory
mkdir -p ~/.claude/skills
unzip agent-document-reviewer.skill -d ~/.claude/skills/
```

Or download manually from the [Releases page](https://github.com/unagi/agent-document-reviewer/releases) and extract the ZIP file to `~/.claude/skills/`.

### For Codex CLI

Clone the repository and run the installation script:

```bash
# Clone the repository
git clone https://github.com/unagi/agent-document-reviewer.git
cd agent-document-reviewer

# Run the Codex installation script
./install-codex.sh
```

Or manually install:

```bash
# Create Codex skills directory
mkdir -p ~/.codex/skills

# Copy the skill source
cp -R agent-document-reviewer ~/.codex/skills/
```

## Usage

### For Claude Code

Invoke the skill with a slash command:

```
/agent-document-reviewer path/to/AGENTS.md
```

### For Codex CLI

After installing the skill (see installation instructions below), reference it when requesting document review:

```
"Please use the agent-document-reviewer skill to review my AGENTS.md file"
```

Codex will automatically locate and use the installed skill.

### What the skill does

The skill will:
1. Run quantitative analysis
2. Perform qualitative review across 4 dimensions
3. Present findings with scores and recommendations
4. Offer to implement improvements if requested

### Example Output

```markdown
## Document Analysis: AGENTS.md

### Quantitative Metrics
- Lines: 650 (⚠️ acceptable but could be shorter)
- Sections: 18 (✅ good)
- Max depth: 3 (✅ good)
- Internal links: 2 (⚠️ could be improved)
- Overall score: 6/10

### Key Issues
1. Document is getting long (650 lines) - consider splitting
2. Critical rules appear late (line 450+)
3. Some content redundancy detected
4. Limited progressive disclosure

### Recommendations
1. Extract detailed sections into separate files
2. Create "Core Principles" section at top with critical rules
3. Consolidate redundant testing instructions
4. Add internal links for progressive disclosure
```

## Development

### Project Structure

```
agent-document-reviewer/
├── agent-document-reviewer.skill  # Packaged skill (distributable)
├── agent-document-reviewer/       # Skill source
│   ├── SKILL.md                   # Main instructions
│   ├── scripts/
│   │   └── analyze_document.js    # Quantitative analysis
│   └── references/
│       ├── review-criteria.md     # Detailed review criteria
│       └── best-practices.md      # Best practices guide
├── tests/                         # Test documents
│   └── sample-agents.md           # Sample document for testing
├── README.md                      # This file (English)
├── README.ja.md                   # Japanese README
└── LICENSE                        # Apache 2.0 License
```

### Prerequisites for Development

- **Node.js**: 14 or higher
- **Python**: 3.7 or higher
- **[skill-creator](https://github.com/anthropics/claude-code)**: Required for packaging

### Testing the Analysis Script

Test with this project's own README:

```bash
node agent-document-reviewer/scripts/analyze_document.js README.md
```

Test with a sample document:

```bash
node agent-document-reviewer/scripts/analyze_document.js tests/sample-agents.md
```

### Rebuilding the Skill

This project uses the [skill-creator](https://github.com/anthropics/claude-code) tool for packaging.

After making changes to the skill source:

```bash
# Using skill-creator's package_skill.py script
python3 /path/to/skill-creator/scripts/package_skill.py agent-document-reviewer/ .
```

This will:
1. Validate the skill structure
2. Create a new `agent-document-reviewer.skill` package

## Review Criteria

The skill evaluates documents across four dimensions:

### 1. Sequential vs. Complete Reading Impact
Does the document front-load essential information, or would agents miss critical instructions if they stop reading at 30%?

### 2. Redundancy Detection
Is content unnecessarily repeated across sections? Can sections be consolidated?

### 3. Progressive Disclosure Design
Are detailed sections split into separate files with clear triggers for when to read them?

### 4. Quantitative Metrics
Objective measurements:
- Line count (target: <500)
- Section count and depth
- Internal vs external link ratio
- Average section length

## Best Practices

Key principles for agent documents:

- **Target length**: <500 lines for main documents
- **Front-load**: Critical rules in first 100 lines
- **Progressive disclosure**: Split details into separate files with clear triggers
- **Minimal redundancy**: State each instruction once
- **Clear hierarchy**: ≤3 heading levels preferred

See [references/best-practices.md](agent-document-reviewer/references/best-practices.md) for comprehensive guidance.

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Test your changes:
   - Run the analysis script on test documents
   - Ensure accurate metrics
   - Test the skill end-to-end if possible
4. Update documentation as needed
5. Rebuild the skill package
6. Commit your changes (`git commit -m 'feat: add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

Please report issues on the [GitHub Issues page](https://github.com/unagi/agent-document-reviewer/issues).

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

Built using the [Claude Agent SDK](https://github.com/anthropics/anthropic-sdk-typescript) and skill creation best practices.
