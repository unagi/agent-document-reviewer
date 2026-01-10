#!/usr/bin/env node

/**
 * Document Structure Analyzer for AI Agent Documents
 *
 * Analyzes markdown documents (like AGENTS.md) and provides metrics
 * to help evaluate document quality for AI agent consumption.
 *
 * Usage: node analyze_document.js [options] <file-path> [<file-path2> ...]
 * Options:
 *   --format full        Output full analysis (default: summary; use "summary" or "full")
 *   --no-include-links   Skip link analysis (default: enabled with --root-dir)
 *   --root-dir <path>    Root directory for security sandboxing (REQUIRED for link analysis)
 *   --max-depth <n>      Max depth when following links (default: 3)
 *   --max-count <n>      Max files to analyze when following links (default: 30)
 *   --no-symlinks        Skip symlink targets during link analysis (best-effort)
 *
 * Multiple file paths can be specified to analyze them together with shared deduplication.
 * Common references (e.g., COMMON.md) are analyzed only once across all entry points.
 */

const fs = require('fs');
const path = require('path');

function uniqStrings(values) {
  return [...new Set(values)];
}

function hasScheme(url) {
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url);
}

function normalizeMarkdownLinkTarget(rawUrl) {
  const trimmed = rawUrl.trim().replace(/^<|>$/g, '');

  if (trimmed.startsWith('#')) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return null;
  if (hasScheme(trimmed)) return null; // e.g. mailto:, javascript:, vscode:, etc.

  const withoutAnchor = trimmed.split('#')[0];
  const withoutQuery = withoutAnchor.split('?')[0];

  // Handle optional title syntax: (path "title")
  const firstToken = withoutQuery.trim().split(/\s+/)[0];
  return firstToken || null;
}

function isRealPathWithinRoot(realPath, rootRealPath) {
  const relativePath = path.relative(rootRealPath, realPath);
  if (relativePath === '') return true;
  if (relativePath === '..') return false;
  return !relativePath.startsWith(`..${path.sep}`) && !path.isAbsolute(relativePath);
}

function resolveRootRealPath(rootDir) {
  return fs.realpathSync(path.resolve(rootDir));
}

/**
 * Extracts internal links from markdown content and resolves their paths
 * @param {string} filePath - The path of the current file
 * @param {string} content - The markdown content
 * @param {string|null} rootDir - The root directory for security sandboxing (optional)
 * @param {boolean} noSymlinks - Whether to skip symlinks when resolving links
 * @returns {Object} Object with 'valid', 'outsideRoot', and 'symlinks' arrays
 */
function extractInternalLinks(filePath, content, rootDir = null, noSymlinks = false) {
  const valid = [];
  const outsideRoot = [];
  const symlinks = [];
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    const rawUrl = match[2];
    const cleanUrl = normalizeMarkdownLinkTarget(rawUrl);
    if (!cleanUrl) continue;

    // Resolve relative to the current file's directory
    const resolvedPath = path.resolve(path.dirname(filePath), cleanUrl);

    // Optional: skip obvious symlink targets (best-effort; full enforcement is in analyzeWithLinks)
    if (noSymlinks) {
      try {
        const stat = fs.lstatSync(resolvedPath);
        if (stat.isSymbolicLink()) {
          symlinks.push({ url: cleanUrl, resolvedPath });
          continue;
        }
      } catch {
        // ignore lstat errors here; existence is validated later in analyzeWithLinks
      }
    }

    // Fast path: block directory traversal by path comparison (authoritative check happens via realpath in analyzeWithLinks)
    if (rootDir) {
      const normalizedRoot = path.resolve(rootDir);
      const relativePath = path.relative(normalizedRoot, resolvedPath);
      if (relativePath === '..' || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
        console.warn(`[SECURITY] Blocked link outside root directory: ${cleanUrl} -> ${resolvedPath}`);
        outsideRoot.push({ url: cleanUrl, resolvedPath });
        continue;
      }
    }

    valid.push(resolvedPath);
  }

  // Return unique paths
  return {
    valid: uniqStrings(valid),
    outsideRoot,
    symlinks
  };
}

/**
 * Analyzes a document and all its linked files recursively
 */
function analyzeWithLinks(filePath, options = {}) {
  const {
    maxDepth = 3,
    maxCount = 30,
    format = 'summary',
    rootDir = null,
    rootRealPath = null,
    noSymlinks = false,
    visited = new Set(),
    currentDepth = 0
  } = options;

  const result = {
    analyzed: [],
    notFound: [],
    skipped: {
      maxDepth: [],
      maxCount: [],
      outsideRoot: [],
      symlinks: []
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

  // Check if already visited (skip - already analyzed via alternate route or infinite loop prevention)
  if (visited.has(normalizedPath)) {
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

  // Security sandbox: enforce realpath stays within root, and optionally avoid symlinks entirely.
  if (rootDir) {
    const effectiveRootRealPath = rootRealPath || resolveRootRealPath(rootDir);
    const fileRealPath = fs.realpathSync(normalizedPath);

    if (!isRealPathWithinRoot(fileRealPath, effectiveRootRealPath)) {
      console.warn(`[SECURITY] Blocked file outside root directory via realpath: ${normalizedPath} -> ${fileRealPath}`);
      result.skipped.outsideRoot.push({ url: filePath, resolvedPath: normalizedPath });
      return result;
    }

    if (noSymlinks && path.resolve(fileRealPath) !== normalizedPath) {
      result.skipped.symlinks.push({ url: filePath, resolvedPath: normalizedPath });
      return result;
    }
  }

  // Mark as visited
  visited.add(normalizedPath);

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
      anchorLinks: metrics.anchorLinks,
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
    const linkResult = extractInternalLinks(normalizedPath, content, rootDir, noSymlinks);
    const internalLinks = linkResult.valid;

    // Track blocked links
    result.skipped.outsideRoot.push(...linkResult.outsideRoot);
    result.skipped.symlinks.push(...linkResult.symlinks);

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
        rootDir,
        rootRealPath,
        noSymlinks,
        visited,
        currentDepth: currentDepth + 1
      });

      // Merge results
      result.analyzed.push(...linkedResult.analyzed);
      result.notFound.push(...linkedResult.notFound);
      result.skipped.maxDepth.push(...linkedResult.skipped.maxDepth);
      result.skipped.maxCount.push(...linkedResult.skipped.maxCount);
      result.skipped.outsideRoot.push(...linkedResult.skipped.outsideRoot);
      result.skipped.symlinks.push(...linkedResult.skipped.symlinks);

      result.summary.totalAnalyzed = result.analyzed.length;
      if (linkedResult.summary.worstScore < result.summary.worstScore) {
        result.summary.worstScore = linkedResult.summary.worstScore;
        result.summary.worstFile = linkedResult.summary.worstFile;
      }
    }
  } else if (currentDepth === maxDepth) {
    // At max depth, record any links we would have followed
    const linkResult = extractInternalLinks(normalizedPath, content, rootDir, noSymlinks);
    result.skipped.outsideRoot.push(...linkResult.outsideRoot);
    result.skipped.symlinks.push(...linkResult.symlinks);

    for (const linkedPath of linkResult.valid) {
      if (!visited.has(path.resolve(linkedPath))) {
        result.skipped.maxDepth.push(linkedPath);
      }
    }
  }

  // Calculate average score
  if (result.analyzed.length > 0) {
    const totalScore = result.analyzed.reduce((sum, item) => sum + item.evaluation.scores.overall, 0);
    result.summary.averageScore = Math.round(totalScore / result.analyzed.length * 10) / 10;
  }

  // Deduplicate: Remove files from skipped arrays if they were successfully analyzed
  // Only do this at root level to avoid redundant filtering
  if (currentDepth === 0) {
    const analyzedPaths = new Set(result.analyzed.map(a => a.fullPath));

    result.skipped.maxDepth = result.skipped.maxDepth
      .filter(p => !analyzedPaths.has(path.resolve(p)));

    result.skipped.maxCount = result.skipped.maxCount
      .filter(p => !analyzedPaths.has(path.resolve(p)));
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
    anchorLinks: 0,
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

      // Anchor links (same-document navigation, meaningless for LLMs)
      if (url.startsWith('#')) {
        metrics.anchorLinks++;
        continue;
      }

      const normalizedTarget = normalizeMarkdownLinkTarget(url);
      if (normalizedTarget) metrics.internalLinks++;
      else metrics.externalLinks++;
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

  // Anchor links penalty (same-document navigation is meaningless for LLMs)
  if (metrics.anchorLinks > 0) {
    scores.progressiveDisclosure = Math.max(0, scores.progressiveDisclosure - 2);
    feedback.push(`❌ Anchor links (#...) are meaningless for LLMs - use separate files instead (found ${metrics.anchorLinks})`);
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
    console.error('Usage: node analyze_document.js [options] <file-path> [<file-path2> ...]');
    console.error('Options:');
    console.error('  --format full        Output full analysis (default: summary)');
    console.error('  --no-include-links   Skip link analysis (default: enabled with --root-dir)');
    console.error('  --root-dir <path>    Root directory for security sandboxing (REQUIRED for link analysis)');
    console.error('  --max-depth <n>      Max depth when following links (default: 3)');
    console.error('  --max-count <n>      Max files to analyze when following links (default: 30)');
    console.error('  --no-symlinks        Skip symlink targets during link analysis (best-effort)');
    console.error('');
    console.error('Multiple file paths can be specified to analyze them together (with shared deduplication).');
    process.exit(0);
  }

  if (args.length === 0) {
    console.error('Usage: node analyze_document.js [options] <file-path> [<file-path2> ...]');
    console.error('Options:');
    console.error('  --format full        Output full analysis (default: summary)');
    console.error('  --no-include-links   Skip link analysis (default: enabled with --root-dir)');
    console.error('  --root-dir <path>    Root directory for security sandboxing (REQUIRED for link analysis)');
    console.error('  --max-depth <n>      Max depth when following links (default: 3)');
    console.error('  --max-count <n>      Max files to analyze when following links (default: 30)');
    console.error('  --no-symlinks        Skip symlink targets during link analysis (best-effort)');
    process.exit(1);
  }

  // Parse options
  let format = 'summary';
  let noIncludeLinks = false;
  let noSymlinks = false;
  let linkMaxDepth = 3;
  let linkMaxCount = 30;
  let rootDir = null;
  const filePaths = [];
  const skipIndices = new Set();

  for (let i = 0; i < args.length; i++) {
    if (skipIndices.has(i)) continue;

    if (args[i] === '--format' && i + 1 < args.length) {
      format = args[i + 1];
      skipIndices.add(i + 1);
    } else if (args[i] === '--no-include-links') {
      noIncludeLinks = true;
    } else if (args[i] === '--no-symlinks' || args[i] === '--no-simlinks') {
      noSymlinks = true;
    } else if (args[i] === '--root-dir' && i + 1 < args.length) {
      rootDir = path.resolve(args[i + 1]);
      skipIndices.add(i + 1);
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
    } else {
      // Collect all non-option arguments as file paths
      filePaths.push(args[i]);
    }
  }

  if (filePaths.length === 0) {
    console.error('Error: At least one file path is required');
    console.error('Usage: node analyze_document.js [options] <file-path> [<file-path2> ...]');
    process.exit(1);
  }

  // Validate all file paths exist
  for (const filePath of filePaths) {
    if (!fs.existsSync(filePath)) {
      console.error(`Error: File not found: ${filePath}`);
      process.exit(1);
    }
  }

  if (format !== 'summary' && format !== 'full') {
    console.error(`Error: Invalid --format value: ${format} (use "summary" or "full")`);
    process.exit(1);
  }

  // Validation: rootDir must exist if specified
  if (rootDir && !fs.existsSync(rootDir)) {
    console.error(`Error: Root directory not found: ${rootDir}`);
    process.exit(1);
  }

  const includeLinks = noIncludeLinks ? false : !!rootDir;

  const rootRealPath = rootDir ? resolveRootRealPath(rootDir) : null;

  if (includeLinks) {
    // Enforce sandbox for entry points as well
    for (const filePath of filePaths) {
      const normalizedPath = path.resolve(filePath);
      const realPath = fs.realpathSync(normalizedPath);

      if (!isRealPathWithinRoot(realPath, rootRealPath)) {
        console.error(`Error: Entry point is outside --root-dir sandbox: ${normalizedPath}`);
        process.exit(1);
      }

      if (noSymlinks && path.resolve(realPath) !== normalizedPath) {
        console.error(`Error: Symlink entrypoints are not allowed with --no-symlinks: ${filePath}`);
        process.exit(1);
      }
    }
  }

  try {
    let result;

    if (includeLinks) {
      // Analyze with linked files (shared visited set for deduplication across all entry points)
      const sharedVisited = new Set();

      const allResults = {
        analyzed: [],
        notFound: [],
        skipped: {
          maxDepth: [],
          maxCount: [],
          outsideRoot: [],
          symlinks: []
        },
        summary: {
          totalAnalyzed: 0,
          averageScore: 0,
          worstScore: 10,
          worstFile: null
        }
      };

      for (const filePath of filePaths) {
        const linkedAnalysis = analyzeWithLinks(filePath, {
          maxDepth: linkMaxDepth,
          maxCount: linkMaxCount,
          format,
          rootDir,
          rootRealPath,
          noSymlinks,
          visited: sharedVisited,
          currentDepth: 0
        });

        // Merge results
        allResults.analyzed.push(...linkedAnalysis.analyzed);
        allResults.notFound.push(...linkedAnalysis.notFound);
        allResults.skipped.maxDepth.push(...linkedAnalysis.skipped.maxDepth);
        allResults.skipped.maxCount.push(...linkedAnalysis.skipped.maxCount);
        allResults.skipped.outsideRoot.push(...linkedAnalysis.skipped.outsideRoot);
        allResults.skipped.symlinks.push(...linkedAnalysis.skipped.symlinks);

        // Update worst score
        if (linkedAnalysis.summary.worstScore < allResults.summary.worstScore) {
          allResults.summary.worstScore = linkedAnalysis.summary.worstScore;
          allResults.summary.worstFile = linkedAnalysis.summary.worstFile;
        }
      }

      // Calculate aggregate summary
      allResults.summary.totalAnalyzed = allResults.analyzed.length;
      if (allResults.analyzed.length > 0) {
        const totalScore = allResults.analyzed.reduce((sum, item) => sum + item.evaluation.scores.overall, 0);
        allResults.summary.averageScore = Math.round(totalScore / allResults.analyzed.length * 10) / 10;
      }

      // Cross-entrypoint deduplication of skipped/notFound based on actually analyzed files
      const analyzedPaths = new Set(allResults.analyzed.map(a => a.fullPath));
      allResults.notFound = uniqStrings(allResults.notFound);
      allResults.skipped.maxDepth = uniqStrings(allResults.skipped.maxDepth)
        .filter(p => !analyzedPaths.has(path.resolve(p)));
      allResults.skipped.maxCount = uniqStrings(allResults.skipped.maxCount)
        .filter(p => !analyzedPaths.has(path.resolve(p)));

      // Format output based on number of entry points
      if (filePaths.length === 1) {
        // Single file: backward compatible format
        result = {
          file: path.basename(filePaths[0]),
          linkedAnalysis: allResults
        };
      } else {
        // Multiple files: unified format with entry points
        result = {
          entryPoints: filePaths.map(fp => path.basename(fp)),
          linkedAnalysis: allResults
        };
      }

      // Warn if analysis was incomplete due to limits
      if (allResults.skipped.maxCount.length > 0) {
        console.warn(`⚠️  [WARNING] Reached max file count limit (--max-count=${linkMaxCount})`);
        console.warn(`   ${allResults.skipped.maxCount.length} files were skipped during analysis.`);
        console.warn(`   Consider increasing --max-count to analyze more linked documents.`);
        console.warn('');
      }

      if (allResults.skipped.maxDepth.length > 0) {
        console.warn(`⚠️  [WARNING] Reached max depth limit (--max-depth=${linkMaxDepth})`);
        console.warn(`   ${allResults.skipped.maxDepth.length} links were not followed.`);
        console.warn(`   Consider increasing --max-depth to analyze deeper link chains.`);
        console.warn('');
      }
    } else {
      // No link analysis: process each file independently
      if (filePaths.length === 1) {
        // Single file: backward compatible format
        const filePath = filePaths[0];
        const metrics = analyzeDocument(filePath);
        const evaluation = evaluateMetrics(metrics);

        if (format === 'summary') {
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
              anchorLinks: metrics.anchorLinks,
              totalLinks: metrics.totalLinks,
              frontLoadedContent: metrics.frontLoadedContent,
              avgSectionLength: metrics.avgSectionLength,
              redundancyCount: metrics.redundancyIndicators.length
            },
            evaluation
          };
        } else {
          result = {
            file: path.basename(filePath),
            metrics,
            evaluation
          };
        }
      } else {
        // Multiple files: return array of results
        const results = [];
        for (const filePath of filePaths) {
          const metrics = analyzeDocument(filePath);
          const evaluation = evaluateMetrics(metrics);

          if (format === 'summary') {
            results.push({
              file: path.basename(filePath),
              metrics: {
                totalLines: metrics.totalLines,
                nonEmptyLines: metrics.nonEmptyLines,
                wordCount: metrics.wordCount,
                sectionCount: metrics.sectionCount,
                maxDepth: metrics.maxDepth,
                internalLinks: metrics.internalLinks,
                externalLinks: metrics.externalLinks,
                anchorLinks: metrics.anchorLinks,
                totalLinks: metrics.totalLinks,
                frontLoadedContent: metrics.frontLoadedContent,
                avgSectionLength: metrics.avgSectionLength,
                redundancyCount: metrics.redundancyIndicators.length
              },
              evaluation
            });
          } else {
            results.push({
              file: path.basename(filePath),
              metrics,
              evaluation
            });
          }
        }
        result = { results };
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
