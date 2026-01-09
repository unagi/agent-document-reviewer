#!/usr/bin/env node

/**
 * Document Structure Analyzer for AI Agent Documents
 *
 * Analyzes markdown documents (like AGENTS.md) and provides metrics
 * to help evaluate document quality for AI agent consumption.
 *
 * Usage: node analyze_document.js [options] <file-path>
 * Options:
 *   --format summary     Output concise summary without detailed sections (recommended for LLM contexts)
 *   --scope tree         If <file-path> is a directory (or a matching file), analyze all nested matching files (default match: AGENTS.md)
 *   --match <filename>   Filename to discover in --scope tree (default: AGENTS.md). Use only if your agent/tool supports this convention.
 *   --max-agents <n>     Max matching files to analyze in --scope tree (default: 200)
 *   --include-links      Follow internal links and analyze referenced files
 *   --max-depth <n>      Max depth when following links (default: 1, requires --include-links)
 *   --max-count <n>      Max files to analyze when following links (default: 10, requires --include-links)
 */

const fs = require('fs');
const path = require('path');

function isDirectoryPath(filePath) {
  try {
    return fs.statSync(filePath).isDirectory();
  } catch {
    return false;
  }
}

function normalizeAbsolutePath(filePath) {
  return path.resolve(filePath);
}

function discoverConventionFiles(rootDir, matchFileName, maxAgents) {
  const discovered = [];
  const visitedDirs = new Set();
  const stack = [normalizeAbsolutePath(rootDir)];
  let truncated = false;

  while (stack.length > 0) {
    const currentDir = stack.pop();
    if (visitedDirs.has(currentDir)) continue;
    visitedDirs.add(currentDir);

    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue;

      const entryPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        stack.push(entryPath);
        continue;
      }

      if (entry.isFile() && entry.name === matchFileName) {
        discovered.push(entryPath);
        if (discovered.length >= maxAgents) {
          truncated = true;
          stack.length = 0;
          break;
        }
      }
    }
  }

  discovered.sort();
  return { files: discovered, truncated };
}

function findNearestParentConventionFile(conventionFilePath, conventionFileSet, rootDir, matchFileName) {
  const rootResolved = normalizeAbsolutePath(rootDir);
  let currentDir = path.dirname(normalizeAbsolutePath(conventionFilePath));

  if (currentDir === rootResolved) return null;

  while (true) {
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) return null;
    if (path.relative(rootResolved, parentDir).startsWith('..')) return null;

    const parentCandidate = normalizeAbsolutePath(path.join(parentDir, matchFileName));
    if (conventionFileSet.has(parentCandidate)) return parentCandidate;

    currentDir = parentDir;
  }
}

/**
 * Extracts internal links from markdown content and resolves their paths
 */
function extractInternalLinks(filePath, content) {
  const links = [];
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    const url = match[2];

    // Only process internal links (not http/https)
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      // Remove anchor (#...) if present
      const cleanUrl = url.split('#')[0];
      if (cleanUrl) {
        // Resolve relative to the current file's directory
        const resolvedPath = path.resolve(path.dirname(filePath), cleanUrl);
        links.push(resolvedPath);
      }
    }
  }

  // Return unique paths
  return [...new Set(links)];
}

/**
 * Analyzes a document and all its linked files recursively
 */
function analyzeWithLinks(filePath, options = {}) {
  const {
    maxDepth = 1,
    maxCount = 10,
    format = 'summary',
    visited = new Set(),
    analyzing = new Set(),
    currentDepth = 0
  } = options;

  const result = {
    analyzed: [],
    notFound: [],
    skipped: {
      circular: [],
      maxDepth: [],
      maxCount: []
    },
    summary: {
      totalAnalyzed: 0,
      averageScore: 0,
      worstScore: 10,
      worstFile: null
    }
  };

  // Normalize path
  const normalizedPath = path.resolve(filePath);

  // Check if already visited (avoid cycles)
  if (visited.has(normalizedPath)) {
    result.skipped.circular.push(normalizedPath);
    return result;
  }

  // Check if currently being analyzed (direct cycle)
  if (analyzing.has(normalizedPath)) {
    result.skipped.circular.push(normalizedPath);
    return result;
  }

  // Check max count
  if (visited.size >= maxCount) {
    result.skipped.maxCount.push(normalizedPath);
    return result;
  }

  // Check if file exists
  if (!fs.existsSync(normalizedPath)) {
    result.notFound.push(normalizedPath);
    return result;
  }

  // Mark as visited and currently analyzing
  visited.add(normalizedPath);
  analyzing.add(normalizedPath);

  try {
    // Analyze current file
    const content = fs.readFileSync(normalizedPath, 'utf-8');
    const metrics = analyzeDocument(normalizedPath);
    const evaluation = evaluateMetrics(metrics);

    const fileResult = {
      file: path.basename(normalizedPath),
      fullPath: normalizedPath,
      depth: currentDepth,
      metrics: format === 'summary' ? {
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
      } : metrics,
      evaluation
    };

    result.analyzed.push(fileResult);
    result.summary.totalAnalyzed++;

    // Update worst score tracking
    const score = evaluation.scores.overall;
    if (score < result.summary.worstScore) {
      result.summary.worstScore = score;
      result.summary.worstFile = normalizedPath;
    }

    // If we haven't reached max depth, follow links
    if (currentDepth < maxDepth) {
      const internalLinks = extractInternalLinks(normalizedPath, content);

      for (const linkedPath of internalLinks) {
        // Skip if we've reached max count
        if (visited.size >= maxCount) {
          result.skipped.maxCount.push(linkedPath);
          continue;
        }

        // Recursively analyze linked file
        const linkedResult = analyzeWithLinks(linkedPath, {
          maxDepth,
          maxCount,
          format,
          visited,
          analyzing,
          currentDepth: currentDepth + 1
        });

        // Merge results
        result.analyzed.push(...linkedResult.analyzed);
        result.notFound.push(...linkedResult.notFound);
        result.skipped.circular.push(...linkedResult.skipped.circular);
        result.skipped.maxDepth.push(...linkedResult.skipped.maxDepth);
        result.skipped.maxCount.push(...linkedResult.skipped.maxCount);

        result.summary.totalAnalyzed = result.analyzed.length;
        if (linkedResult.summary.worstScore < result.summary.worstScore) {
          result.summary.worstScore = linkedResult.summary.worstScore;
          result.summary.worstFile = linkedResult.summary.worstFile;
        }
      }
    } else if (currentDepth === maxDepth) {
      // At max depth, record any links we would have followed
      const internalLinks = extractInternalLinks(normalizedPath, content);
      for (const linkedPath of internalLinks) {
        if (!visited.has(path.resolve(linkedPath))) {
          result.skipped.maxDepth.push(linkedPath);
        }
      }
    }
  } finally {
    // Remove from analyzing set
    analyzing.delete(normalizedPath);
  }

  // Calculate average score
  if (result.analyzed.length > 0) {
    const totalScore = result.analyzed.reduce((sum, item) => sum + item.evaluation.scores.overall, 0);
    result.summary.averageScore = Math.round(totalScore / result.analyzed.length * 10) / 10;
  }

  return result;
}

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

  if (metrics.totalLines <= 200) {
    // Small documents can be fully loaded; progressive disclosure is optional.
    scores.progressiveDisclosure = 10;
    if (metrics.internalLinks > 0) {
      feedback.push('✅ Good use of internal links for progressive disclosure');
    } else {
      feedback.push('✅ Document is short enough that progressive disclosure is optional');
    }
  } else if (metrics.totalLines <= 500) {
    // Medium documents benefit from links/hierarchy, but can still be workable without them.
    if (metrics.internalLinks >= 3 && linkRatio >= 0.5) {
      scores.progressiveDisclosure = 10;
      feedback.push('✅ Good use of internal links for progressive disclosure');
    } else if (metrics.internalLinks > 0) {
      scores.progressiveDisclosure = 7;
      feedback.push('⚠️  Some internal links present, but could be improved');
	    } else {
	      scores.progressiveDisclosure = 6;
	      feedback.push('⚠️  No internal links detected - acceptable for small scope, otherwise consider links or tool-supported scoping (e.g., nested AGENTS.md)');
	    }
	  } else {
    // Large documents should use links/hierarchy to avoid token bloat.
    if (metrics.internalLinks >= 3 && linkRatio >= 0.5) {
      scores.progressiveDisclosure = 10;
      feedback.push('✅ Good use of internal links for progressive disclosure');
    } else if (metrics.internalLinks > 0) {
      scores.progressiveDisclosure = 6;
      feedback.push('⚠️  Some internal links present, but could be improved');
	    } else {
	      scores.progressiveDisclosure = 3;
	      feedback.push('❌ No internal links detected - consider splitting content via links or tool-supported scoping (e.g., nested AGENTS.md)');
	    }
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

  if (args.includes('--help') || args.includes('-h')) {
    console.error('Usage: node analyze_document.js [options] <file-path>');
    console.error('Options:');
    console.error('  --format summary     Output concise summary (recommended for LLM contexts)');
    console.error('  --scope tree         Analyze nested matching files under a directory');
    console.error('  --match <filename>   Filename to discover in --scope tree (default: AGENTS.md)');
    console.error('  --max-agents <n>     Max matching files to analyze in --scope tree (default: 200)');
    console.error('  --include-links      Follow internal links and analyze referenced files');
    console.error('  --max-depth <n>      Max depth when following links (default: 1, requires --include-links)');
    console.error('  --max-count <n>      Max files to analyze when following links (default: 10, requires --include-links)');
    process.exit(0);
  }

  if (args.length === 0) {
    console.error('Usage: node analyze_document.js [options] <file-path>');
    console.error('Options:');
    console.error('  --format summary     Output concise summary (recommended for LLM contexts)');
    console.error('  --scope tree         Analyze nested matching files under a directory');
    console.error('  --match <filename>   Filename to discover in --scope tree (default: AGENTS.md)');
    console.error('  --max-agents <n>     Max matching files to analyze in --scope tree (default: 200)');
    console.error('  --include-links      Follow internal links and analyze referenced files');
    console.error('  --max-depth <n>      Max depth when following links (default: 1, requires --include-links)');
    console.error('  --max-count <n>      Max files to analyze when following links (default: 10, requires --include-links)');
    process.exit(1);
  }

  // Parse options
  let format = 'full';
  let scope = 'file';
  let matchFileName = 'AGENTS.md';
  let maxAgents = 200;
  let includeLinks = false;
  let linkMaxDepth = 1;
  let linkMaxCount = 10;
  let filePath = null;
  const skipIndices = new Set();

  for (let i = 0; i < args.length; i++) {
    if (skipIndices.has(i)) continue;

    if (args[i] === '--format' && i + 1 < args.length) {
      format = args[i + 1];
      skipIndices.add(i + 1); // Mark next arg to skip
    } else if (args[i] === '--scope' && i + 1 < args.length) {
      scope = args[i + 1];
      skipIndices.add(i + 1);
    } else if (args[i] === '--match' && i + 1 < args.length) {
      matchFileName = args[i + 1];
      skipIndices.add(i + 1);
    } else if (args[i] === '--max-agents' && i + 1 < args.length) {
      const parsed = Number.parseInt(args[i + 1], 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        maxAgents = parsed;
      }
      skipIndices.add(i + 1);
    } else if (args[i] === '--include-links') {
      includeLinks = true;
    } else if (args[i] === '--max-depth' && i + 1 < args.length) {
      const parsed = Number.parseInt(args[i + 1], 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        linkMaxDepth = parsed;
      }
      skipIndices.add(i + 1);
    } else if (args[i] === '--max-count' && i + 1 < args.length) {
      const parsed = Number.parseInt(args[i + 1], 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        linkMaxCount = parsed;
      }
      skipIndices.add(i + 1);
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
    const isDir = isDirectoryPath(filePath);
    const isTreeScope = scope === 'tree';

    let result;

    if (isTreeScope) {
      const rootDir = isDir ? filePath : path.dirname(filePath);
      const { files: conventionFiles, truncated } = discoverConventionFiles(rootDir, matchFileName, maxAgents);
      const conventionFileSet = new Set(conventionFiles.map(f => normalizeAbsolutePath(f)));

      const analyses = conventionFiles.map(conventionFile => {
        const metrics = analyzeDocument(conventionFile);
        const evaluation = evaluateMetrics(metrics);

        const parentConventionFile = findNearestParentConventionFile(conventionFile, conventionFileSet, rootDir, matchFileName);

        const relativePath = path.relative(rootDir, conventionFile);
        const parentRelativePath = parentConventionFile ? path.relative(rootDir, parentConventionFile) : null;

        const payload = format === 'summary'
          ? {
              file: path.basename(conventionFile),
              relativePath,
              parentRelativePath,
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
            }
          : {
              file: path.basename(conventionFile),
              relativePath,
              parentRelativePath,
              metrics,
              evaluation
            };

        return payload;
      });

      result = {
        target: filePath,
        scope: {
          mode: 'tree',
          rootDir,
          matchFileName,
          maxAgents,
          truncated
        },
        documents: analyses,
        // Backward compatible alias (kept for older prompts/docs)
        agents: analyses
      };
    } else if (includeLinks) {
      // Analyze with linked files
      const linkedAnalysis = analyzeWithLinks(filePath, {
        maxDepth: linkMaxDepth,
        maxCount: linkMaxCount,
        format
      });

      result = {
        file: path.basename(filePath),
        linkedAnalysis
      };
    } else {
      // Single file analysis
      const metrics = analyzeDocument(filePath);
      const evaluation = evaluateMetrics(metrics);

      // Output results based on format
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
