#!/bin/bash

# Agent Document Reviewer - Codex CLI Installation Script
# This script installs the agent-document-reviewer skill for Codex CLI

set -e

SKILL_NAME="agent-document-reviewer"

# Determine script directory (works regardless of where script is called from)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="${SCRIPT_DIR}/${SKILL_NAME}"

# Support CODEX_HOME environment variable, default to ~/.codex
CODEX_HOME="${CODEX_HOME:-${HOME}/.codex}"
CODEX_SKILLS_DIR="${CODEX_HOME}/skills"
INSTALL_DIR="${CODEX_SKILLS_DIR}/${SKILL_NAME}"

echo "🚀 Installing ${SKILL_NAME} for Codex CLI..."

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "⚠️  Warning: Node.js not found. The analysis script requires Node.js 14 or higher."
    echo "   You can continue installation, but you'll need to install Node.js to use the skill."
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Create Codex skills directory if it doesn't exist
if [ ! -d "${CODEX_SKILLS_DIR}" ]; then
    echo "📁 Creating Codex skills directory: ${CODEX_SKILLS_DIR}"
    mkdir -p "${CODEX_SKILLS_DIR}"
fi

# Check if skill is already installed
if [ -d "${INSTALL_DIR}" ]; then
    echo "⚠️  ${SKILL_NAME} is already installed at ${INSTALL_DIR}"
    read -p "Overwrite existing installation? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Installation cancelled"
        exit 1
    fi
    echo "🗑️  Removing existing installation..."
    rm -rf "${INSTALL_DIR}"
fi

# Copy skill source to Codex skills directory
echo "📦 Copying skill files to ${INSTALL_DIR}..."
cp -R "${SOURCE_DIR}" "${INSTALL_DIR}"

# Make the analysis script executable
chmod +x "${INSTALL_DIR}/scripts/analyze_document.js"

echo "✅ ${SKILL_NAME} installed successfully!"
echo ""
echo "Usage in Codex:"
echo "  Simply ask Codex to use the skill when reviewing documents:"
echo "  \"Please use the agent-document-reviewer skill to review my AGENTS.md file\""
echo ""
echo "Direct script usage:"
echo "  node ${INSTALL_DIR}/scripts/analyze_document.js --format summary path/to/document.md"
