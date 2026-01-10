# Instruction File Discovery Conventions (Quick Reference)

This skill can review many kinds of “agent instruction documents”, but **file discovery, scope, and override semantics are tool-specific**. Do not assume that every instruction filename behaves like `AGENTS.md`.

Use this as a quick reference when deciding what additional files are “in scope” for a review.

## AGENTS.md (agents.md open format)

- **File**: `AGENTS.md`
- **Typical placement**: repo root, plus optional nested `AGENTS.md` in subprojects
- **Override model**: closest `AGENTS.md` to the edited file wins; user chat prompts override everything
- **Source**: https://agents.md/

## Claude Code (Anthropic) project memory

- **Files**:
  - Project memory: `./CLAUDE.md` or `./.claude/CLAUDE.md`
  - Project memory (local): `./CLAUDE.local.md`
  - Modular rules: `./.claude/rules/*.md` (auto-loaded)
  - User memory: `~/.claude/CLAUDE.md`
- **Discovery model**: Claude reads `CLAUDE.md` / `CLAUDE.local.md` files it finds **up the directory tree from the current working directory**, and can also discover nested `CLAUDE.md` under the current working directory
- **Sources**:
  - https://code.claude.com/docs/en/memory
  - https://code.claude.com/docs/en/settings

## GitHub Copilot (repository instructions)

- **Files**:
  - `.github/copilot-instructions.md`
  - `.github/instructions/*.instructions.md`
- **Placement**: fixed under `.github/` in the repository (not “nearest file wins” per directory)
- **Source**: https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions

## Aider (conventions)

- **File**: often `CONVENTIONS.md` (name is a convention, not a hard requirement)
- **Discovery model**: loaded explicitly (e.g., `aider --read CONVENTIONS.md` or config `read: CONVENTIONS.md`)
- **Source**: https://aider.chat/docs/usage/conventions.html#always-load-conventions

## Default reviewer rule (when tool is unknown)

- Only review the requested file and linked documents.
- Do not scan parent directories for more instruction files unless the user confirms the tool’s discovery/override behavior.
