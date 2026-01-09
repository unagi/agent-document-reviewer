#!/usr/bin/env node

/**
 * Document Structure Analyzer for AI Agent Documents
 *
 * Analyzes markdown documents (like AGENTS.md) and provides metrics
 * to help evaluate document quality for AI agent consumption.
 *
 * Usage: node analyze_document.js [options] <file-path>
 * Options:
 *   --format summary    Output concise summary without detailed sections (recommended for LLM contexts)
 */

const fs = require('fs');
const path = require('path');

/**
 * Analyzes a markdown document and returns structural metrics
 */
function analyzeDocument(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const metrics = {
    // Basic metrics
    totalLines: lines.length,
    nonEmptyLines: lines.filter(line => line.trim().length > 0).length,
    wordCount: content.split(/\s+/).filter(w => w.length > 0).length,

    // Structure metrics
    sections: [],
    maxDepth: 0,
    sectionCount: 0,

    // Link metrics
    internalLinks: 0,
    externalLinks: 0,
    totalLinks: 0,

    // Content distribution
    frontLoadedContent: 0, // Content in first 20% of document

    // Quality indicators
    avgSectionLength: 0,
    redundancyIndicators: []
  };

  // Analyze sections and depth
  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Section headers
    const headerMatch = trimmed.match(/^(#+)\s+(.+)$/);
    if (headerMatch) {
      const depth = headerMatch[1].length;
      const title = headerMatch[2];

      metrics.sections.push({
        depth,
        title,
        lineNumber: index + 1
      });

      metrics.maxDepth = Math.max(metrics.maxDepth, depth);
      metrics.sectionCount++;
    }

    // Links
    const linkMatches = trimmed.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g);
    for (const match of linkMatches) {
      metrics.totalLinks++;
      const url = match[2];

      if (url.startsWith('http://') || url.startsWith('https://')) {
        metrics.externalLinks++;
      } else {
        metrics.internalLinks++;
      }
    }
  });

  // Calculate front-loaded content (first 20% of lines)
  const frontSection = Math.floor(lines.length * 0.2);
  metrics.frontLoadedContent = lines.slice(0, frontSection)
    .filter(line => line.trim().length > 0).length;

  // Calculate average section length
  if (metrics.sectionCount > 0) {
    metrics.avgSectionLength = Math.floor(metrics.totalLines / metrics.sectionCount);
  }

  // Detect potential redundancy (repeated phrases)
  const phrases = content.match(/\b\w+\s+\w+\s+\w+\b/g) || [];
  const phraseCount = {};
  phrases.forEach(phrase => {
    const normalized = phrase.toLowerCase();
    phraseCount[normalized] = (phraseCount[normalized] || 0) + 1;
  });

  metrics.redundancyIndicators = Object.entries(phraseCount)
    .filter(([_, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([phrase, count]) => ({ phrase, count }));

  return metrics;
}

/**
 * Evaluates metrics and provides scores
 */
function evaluateMetrics(metrics) {
  const scores = {
    lineCount: 0,
    structure: 0,
    progressiveDisclosure: 0,
    overall: 0
  };

  const feedback = [];

  // Line count evaluation
  if (metrics.totalLines <= 200) {
    scores.lineCount = 10;
    feedback.push('✅ Document length is excellent (≤200 lines)');
  } else if (metrics.totalLines <= 500) {
    scores.lineCount = 7;
    feedback.push('⚠️  Document length is acceptable but could be shorter (200-500 lines)');
  } else if (metrics.totalLines <= 800) {
    scores.lineCount = 4;
    feedback.push('⚠️  Document is getting long (500-800 lines) - consider splitting content');
  } else {
    scores.lineCount = 2;
    feedback.push('❌ Document is too long (>800 lines) - high risk of AI agent missing instructions');
  }

  // Structure evaluation
  let structureScore = 10;

  if (metrics.maxDepth > 4) {
    structureScore -= 3;
    feedback.push(`⚠️  Deep nesting detected (depth: ${metrics.maxDepth}) - consider flattening`);
  } else if (metrics.maxDepth <= 3) {
    feedback.push('✅ Good heading depth (≤3)');
  }

  if (metrics.sectionCount > 30) {
    structureScore -= 3;
    feedback.push(`⚠️  Many sections (${metrics.sectionCount}) - consider consolidating`);
  } else if (metrics.sectionCount > 20) {
    structureScore -= 1;
    feedback.push(`⚠️  High section count (${metrics.sectionCount})`);
  }

  if (metrics.avgSectionLength > 0 && metrics.avgSectionLength < 15) {
    structureScore -= 2;
    feedback.push('⚠️  Sections are very short on average - might indicate over-fragmentation');
  }

  scores.structure = Math.max(0, structureScore);

  // Progressive disclosure evaluation
  const linkRatio = metrics.totalLinks > 0
    ? metrics.internalLinks / metrics.totalLinks
    : 0;

  if (metrics.internalLinks >= 3 && linkRatio >= 0.5) {
    scores.progressiveDisclosure = 10;
    feedback.push('✅ Good use of internal links for progressive disclosure');
  } else if (metrics.internalLinks > 0) {
    scores.progressiveDisclosure = 6;
    feedback.push('⚠️  Some internal links present, but could be improved');
  } else {
    scores.progressiveDisclosure = 3;
    feedback.push('❌ No internal links detected - consider splitting detailed content into separate files');
  }

  // Redundancy check
  if (metrics.redundancyIndicators.length > 0) {
    feedback.push('⚠️  Potential redundancy detected - review repeated phrases');
  }

  // Overall score
  scores.overall = Math.round(
    (scores.lineCount * 0.4 + scores.structure * 0.3 + scores.progressiveDisclosure * 0.3)
  );

  return { scores, feedback };
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node analyze_document.js [options] <file-path>');
    console.error('Options:');
    console.error('  --format summary    Output concise summary (recommended for LLM contexts)');
    process.exit(1);
  }

  // Parse options
  let format = 'full';
  let filePath = null;
  const skipIndices = new Set();

  for (let i = 0; i < args.length; i++) {
    if (skipIndices.has(i)) continue;

    if (args[i] === '--format' && i + 1 < args.length) {
      format = args[i + 1];
      skipIndices.add(i + 1); // Mark next arg to skip
    } else if (!filePath) {
      filePath = args[i];
    }
  }

  if (!filePath) {
    console.error('Error: File path is required');
    console.error('Usage: node analyze_document.js [options] <file-path>');
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  try {
    const metrics = analyzeDocument(filePath);
    const evaluation = evaluateMetrics(metrics);

    // Output results based on format
    let result;

    if (format === 'summary') {
      // Concise output without detailed sections array
      result = {
        file: path.basename(filePath),
        metrics: {
          totalLines: metrics.totalLines,
          nonEmptyLines: metrics.nonEmptyLines,
          wordCount: metrics.wordCount,
          sectionCount: metrics.sectionCount,
          maxDepth: metrics.maxDepth,
          internalLinks: metrics.internalLinks,
          externalLinks: metrics.externalLinks,
          totalLinks: metrics.totalLinks,
          frontLoadedContent: metrics.frontLoadedContent,
          avgSectionLength: metrics.avgSectionLength,
          redundancyCount: metrics.redundancyIndicators.length
        },
        evaluation
      };
    } else {
      // Full output with all details
      result = {
        file: path.basename(filePath),
        metrics,
        evaluation
      };
    }

    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error(`Error analyzing document: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { analyzeDocument, evaluateMetrics };
