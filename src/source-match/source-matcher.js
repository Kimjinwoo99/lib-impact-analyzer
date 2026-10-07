import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, relative, resolve } from 'node:path';

// Stylesheets are source too: a vite/sass upgrade's impact surface includes
// the @import chain, and excluding .scss made those files structurally
// unmatchable no matter what terms an item carried.
const SOURCE_EXTENSIONS = new Set(['.vue', '.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs', '.scss', '.sass']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.nuxt', '.vite', '.turbo', 'out']);
const CONFIDENCE_RANK = { HIGH: 3, MEDIUM: 2, LOW: 1, NONE: 0 };
const GENERIC_TERMS = new Set(['vuetify', 'props', 'prop', 'emit', 'types', 'type', 'support', 'update', 'model', 'empty', 'correct', 'wrong', 'remove', 'removed']);

export function matchSourceImpact(options = {}) {
  const projectPath = resolveRequiredPath(options.projectPath);
  const item = options.classificationItem ?? options.item;
  if (!item || typeof item !== 'object') throw new Error('classificationItem is required');

  const packageName = options.packageName ?? item.packageName ?? inferPackageName(item) ?? 'unknown';
  const files = discoverSourceFiles(projectPath);
  const patterns = buildMatchPatterns(item, { packageName });
  const candidateFiles = [];
  const matchedTermKeys = new Set();
  const dynamicAccessHits = [];

  for (const filePath of files) {
    const text = readFileSync(filePath, 'utf8');
    const relPath = normalizeRelativePath(relative(projectPath, filePath));
    // Comments blanked once per file, shared by both passes below — matching
    // and dynamic-access detection both need "what the code actually does",
    // not what a docstring says it does.
    const code = stripComments(text);
    collectDynamicAccess(code, filePath, projectPath, dynamicAccessHits);
    // fileGlobs scoping (E3-c): a pattern built from a syntax token like
    // `@import` only makes sense against the file types its inspectionPlan
    // named — applying it project-wide is how a `.js` file with an unrelated
    // `@import`-shaped string would earn the same weight as the actual
    // Sass file. Patterns with no glob run against every file, unchanged.
    const applicable = patterns.filter((pattern) => !pattern.glob || pattern.glob(relPath));
    const matches = matchFile(text, code, applicable);
    if (matches.length === 0) continue;

    for (const match of matches) matchedTermKeys.add(match.termKey);
    const score = matches.reduce((total, match) => total + match.weight, 0);
    const confidence = scoreFile(matches, score);

    candidateFiles.push({
      path: relPath,
      absolutePath: filePath,
      confidence,
      score,
      evidenceTypes: Array.from(new Set(matches.map((match) => match.type))),
      matches: matches.map(({ termKey, weight, regex, ...match }) => match),
    });
  }

  candidateFiles.sort((left, right) => {
    const byConfidence = CONFIDENCE_RANK[right.confidence] - CONFIDENCE_RANK[left.confidence];
    if (byConfidence) return byConfidence;
    if (right.score !== left.score) return right.score - left.score;
    if (right.matches.length !== left.matches.length) return right.matches.length - left.matches.length;
    return left.path.localeCompare(right.path);
  });

  const unmatchedTerms = patterns
    .filter((pattern) => pattern.reportUnmatched !== false && !matchedTermKeys.has(pattern.termKey))
    .map((pattern) => ({ term: pattern.term, type: pattern.type, source: pattern.source }));

  return {
    packageName,
    currentVersion: options.currentVersion ?? null,
    targetVersion: options.targetVersion ?? null,
    item: summarizeItem(item),
    summary: {
      scannedFiles: files.length,
      candidateFiles: candidateFiles.length,
      high: candidateFiles.filter((file) => file.confidence === 'HIGH').length,
      medium: candidateFiles.filter((file) => file.confidence === 'MEDIUM').length,
      low: candidateFiles.filter((file) => file.confidence === 'LOW').length,
      matchedTerms: matchedTermKeys.size,
      unmatchedTerms: unmatchedTerms.length,
    },
    candidateFiles,
    unmatchedTerms,
    // Whether "term not found" is evidence of absence in THIS project — see
    // collectDynamicAccess. Consumers decide what a miss means with this.
    dynamicAccess: {
      detected: dynamicAccessHits.length > 0,
      hits: dynamicAccessHits.slice(0, 8),
    },
    matchPolicy: {
      confidence: 'HIGH = direct component evidence; MEDIUM = config/prop/API evidence; LOW = weak raw term evidence.',
      note: 'Step 5 returns candidate impact files, not final impact decisions.',
    },
  };
}

const MAX_EVIDENCE_FILES = 4;
const MAX_EVIDENCE_LINES = 3;
// A term matching more than this share of scanned files is not discriminating
// evidence for any one file — it is a candidate for GENERIC_TERMS treatment.
const WIDESPREAD_TERM_THRESHOLD = 0.3;

/**
 * E3 batch executor (l6-deterministic-evidence-design.md §5) — discovers
 * source files and reads each ONCE, testing every unit's patterns against it,
 * instead of `matchSourceImpact()`'s one-full-rescan-per-item. The same
 * strategy `component-usage.js`'s `prescanScopeUsage` already uses for the
 * same reason: N separate scans of a few hundred files each is the thing
 * that does not scale, not the matching itself.
 *
 * This is the delivery half of the fix documented in §1.2c: the matching
 * engine (`matchSourceImpact`) already existed, but ran only for the screen's
 * single previewed item — L6 never received its output and had to Grep for
 * itself. `buildL6Input` calls this once per run and attaches the result to
 * every `item:*`/`group:*` unit as `usageEvidence`.
 *
 * @param options.projectPath
 * @param options.packageName
 * @param options.units  [{ unit, item }] — `item` is whatever
 *                        `buildMatchPatterns` accepts (a classified item's
 *                        shape, or a synthesized pseudo-item for a group
 *                        unit). Shaping a group's scope into a searchable
 *                        item is the caller's job — this function is generic
 *                        over "a unit id paired with an inspectionPlan".
 * @returns {
 *   byUnit: { [unit]: { files: [{path, lines, excerpt, confidence}],
 *                        unmatchedTerms: [{term, type, source}] } },
 *   planQuality: { [unit]: { termsMatchedNothing, termsOnlyGeneric,
 *                             termsMatchedEverywhere } }  — E3-d, observation
 *                             only; never reaches the prompt or the screen.
 *   scannedFiles: number,
 * }
 */
export function matchSourceImpactBatch(options = {}) {
  const root = resolveRequiredPath(options.projectPath);
  const packageName = options.packageName ?? 'unknown';
  const units = (options.units ?? []).filter((entry) => entry?.unit && entry?.item && typeof entry.item === 'object');
  const files = discoverSourceFiles(root);

  const perUnit = units.map((entry) => ({ unit: entry.unit, patterns: buildMatchPatterns(entry.item, { packageName }) }));
  const matchedTermKeys = new Map(perUnit.map((u) => [u.unit, new Set()]));
  // How many files each (unit, termKey) pair matched at least once in — the
  // raw material for E3-d's "does this term discriminate anything" check.
  const fileCountsByUnitTerm = new Map();
  const candidates = new Map(perUnit.map((u) => [u.unit, []]));

  for (const filePath of files) {
    const text = readFileSync(filePath, 'utf8');
    const relPath = normalizeRelativePath(relative(root, filePath));
    const code = stripComments(text);

    for (const { unit, patterns } of perUnit) {
      const applicable = patterns.filter((pattern) => !pattern.glob || pattern.glob(relPath));
      if (!applicable.length) continue;
      const matches = matchFile(text, code, applicable);
      if (!matches.length) continue;

      const unitTermKeys = matchedTermKeys.get(unit);
      for (const termKey of new Set(matches.map((match) => match.termKey))) {
        unitTermKeys.add(termKey);
        const key = `${unit}::${termKey}`;
        fileCountsByUnitTerm.set(key, (fileCountsByUnitTerm.get(key) ?? 0) + 1);
      }

      const score = matches.reduce((total, match) => total + match.weight, 0);
      candidates.get(unit).push({
        path: relPath,
        confidence: scoreFile(matches, score),
        score,
        lines: [...new Set(matches.map((match) => match.line))].slice(0, MAX_EVIDENCE_LINES),
        excerpt: matches[0].snippet,
      });
    }
  }

  const byUnit = {};
  const planQuality = {};
  for (const { unit, patterns } of perUnit) {
    const sorted = [...candidates.get(unit)].sort(
      (a, b) => CONFIDENCE_RANK[b.confidence] - CONFIDENCE_RANK[a.confidence] || b.score - a.score || a.path.localeCompare(b.path),
    );
    const unitTermKeys = matchedTermKeys.get(unit);
    const reportable = patterns.filter((pattern) => pattern.reportUnmatched !== false);
    const unmatchedTerms = reportable
      .filter((pattern) => !unitTermKeys.has(pattern.termKey))
      .map((pattern) => ({ term: pattern.term, type: pattern.type, source: pattern.source }));

    byUnit[unit] = {
      files: sorted.slice(0, MAX_EVIDENCE_FILES).map(({ path, lines, excerpt, confidence }) => ({ path, lines, excerpt, confidence })),
      unmatchedTerms,
    };

    planQuality[unit] = {
      termsMatchedNothing: unmatchedTerms.map((pattern) => pattern.term),
      termsOnlyGeneric: patterns.filter((pattern) => pattern.type === 'RAW_TERM_WEAK').map((pattern) => pattern.term),
      termsMatchedEverywhere: reportable
        .filter((pattern) => {
          const count = fileCountsByUnitTerm.get(`${unit}::${pattern.termKey}`) ?? 0;
          return files.length > 0 && count / files.length > WIDESPREAD_TERM_THRESHOLD;
        })
        .map((pattern) => pattern.term),
    };
  }

  return { byUnit, planQuality, scannedFiles: files.length };
}

/*
 * Patterns that blind a static term search: when component or module names
 * are built at runtime, "the term never matched" stops being evidence that
 * the project does not use it. Only NON-LITERAL forms count — a literal
 * `resolveComponent('VBtn')` or `import('./chart.js')` is still greppable,
 * so treating it as dynamic would hand the user manual work the search
 * already did. Type declarations (.d.ts) mention these identifiers without
 * calling them; unplugin-auto-import generates exactly such a file.
 */
const DYNAMIC_ACCESS_PATTERNS = [
  // <component :is="expr"> / <component v-bind:is="expr"> — runtime tag names.
  { kind: 'component-is', regex: /<component[^>]*(?::is|v-bind:is)=/i },
  // resolveComponent(name) with a non-literal argument.
  { kind: 'resolve-component', regex: /resolveComponent\(\s*[^'"`\s)]/ },
  // import(expr) / require(expr) with a non-literal module id.
  { kind: 'dynamic-import', regex: /(?:^|[^.\w$])import\(\s*[^'"`\s)]/ },
  { kind: 'dynamic-require', regex: /(?:^|[^.\w$])require\(\s*[^'"`\s)]/ },
];

/**
 * @param code  comment-stripped text (caller's job — matchSourceImpact shares
 *              one stripComments() pass with matchFile rather than each
 *              computing its own).
 */
function collectDynamicAccess(code, filePath, projectPath, hits) {
  if (filePath.endsWith('.d.ts')) return;
  // Comments never execute — a docstring SAYING "서브패스 import(lodash/…)"
  // must not testify that this project builds module names at runtime
  // (observed: sample-app's cluster.js was flagged by exactly that prose).
  for (const pattern of DYNAMIC_ACCESS_PATTERNS) {
    const match = pattern.regex.exec(code);
    if (!match) continue;
    hits.push({
      path: normalizeRelativePath(relative(projectPath, filePath)),
      kind: pattern.kind,
      // The hit is a claim someone will verify — hand them the line.
      line: lineAt(code, match.index),
    });
  }
}

/**
 * Blanks comments while PRESERVING newlines, so match indexes still map to
 * real line numbers. Heuristic on purpose: `//` is kept when preceded by `:`
 * (URLs in strings); a string literal containing `/*` can over-strip. Both
 * miss-modes only affect detection sensitivity, never parsing.
 */
function stripComments(text) {
  return String(text)
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/<!--[\s\S]*?-->/g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

function lineAt(text, index) {
  let line = 1;
  for (let cursor = 0; cursor < index; cursor += 1) {
    if (text.charCodeAt(cursor) === 10) line += 1;
  }
  return line;
}

export function discoverSourceFiles(projectPath) {
  const root = resolveRequiredPath(projectPath);
  const files = [];
  walk(root, files);
  return files.sort((left, right) => normalizeRelativePath(relative(root, left)).localeCompare(normalizeRelativePath(relative(root, right))));
}

function walk(directory, files) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(resolve(directory, entry.name), files);
      continue;
    }
    if (!entry.isFile()) continue;
    const filePath = resolve(directory, entry.name);
    if (SOURCE_EXTENSIONS.has(extname(filePath))) files.push(filePath);
  }
}

export function buildMatchPatterns(item, context = {}) {
  const packageName = context.packageName ?? inferPackageName(item) ?? 'unknown';
  const plan = item.inspectionPlan ?? {};
  const patterns = [];
  const add = (pattern) => {
    if (!pattern.term) return;
    const termKey = `${pattern.type}:${pattern.term}`.toLowerCase();
    if (patterns.some((existing) => existing.termKey === termKey)) return;
    patterns.push({ ...pattern, termKey });
  };

  add({ type: 'LIBRARY_IMPORT', term: packageName, source: 'packageName', weight: 3, regex: importRegex(packageName), reportUnmatched: false });

  for (const specifier of arrayOf(plan.importSpecifiers)) {
    if (!specifier || specifier === packageName) continue;
    // The synthesis puts the item's scope here verbatim — a generic word like
    // `build` must not become weight-7 evidence. See isSearchableSymbol.
    if (!isSearchableSymbol(specifier)) continue;
    add({ type: 'IMPORT_SPECIFIER', term: specifier, source: 'inspectionPlan.importSpecifiers', weight: 7, regex: wordRegex(specifier) });
  }

  for (const component of expandComponentTerms(arrayOf(plan.componentTags).concat(item.scope ? [item.scope] : []))) {
    if (component.kind === 'kebab') {
      add({ type: 'VUE_TEMPLATE_TAG', term: component.term, source: 'componentTags', weight: 9, regex: templateTagRegex(component.term) });
    } else {
      add({ type: 'COMPONENT_SYMBOL', term: component.term, source: 'componentTags', weight: 6, regex: wordRegex(component.term) });
      add({ type: 'DYNAMIC_COMPONENT', term: component.term, source: 'componentTags', weight: 7, regex: dynamicComponentRegex(component.term) });
    }
  }

  for (const configKey of arrayOf(plan.configKeys)) {
    add({ type: 'CONFIG_KEY', term: configKey, source: 'inspectionPlan.configKeys', weight: 4, regex: termRegex(configKey) });
  }

  /*
   * E3-c: fileGlobs scope searchTerms patterns only. A syntax token like
   * `@import` is meaningful because of WHERE it appears (`*.scss`), and
   * componentTags/configKeys already have their own name- or config-based
   * precision — item-level file scoping is the searchTerms axis's problem to
   * solve, per the L4 guidance that pairs a syntax token with a fileGlob on
   * the same item (l6-deterministic-evidence-design.md §5.5).
   */
  const globTest = compileFileGlobList(plan.fileGlobs);

  for (const term of arrayOf(plan.searchTerms)) {
    const cleaned = String(term ?? '').trim();
    if (!cleaned || cleaned.length < 3) continue;
    const lower = cleaned.toLowerCase();
    const isGeneric = GENERIC_TERMS.has(lower) || /^[0-9a-f]{6,}$/i.test(cleaned) || /^\d+$/.test(cleaned);
    add({
      type: isGeneric ? 'RAW_TERM_WEAK' : classifyTerm(cleaned),
      term: cleaned,
      source: 'inspectionPlan.searchTerms',
      weight: isGeneric ? 1 : 3,
      regex: termRegex(cleaned),
      reportUnmatched: !isGeneric,
      glob: globTest,
    });
  }

  return patterns;
}

/**
 * Three glob forms only, no dependency: `*.ext` / `**\/*.ext` (extension
 * match, any directory) and `dir/**` (path-prefix match). Anything else is
 * silently ignored — an unsupported glob just means that item's searchTerms
 * stay unscoped (today's behavior), not an error.
 */
function compileFileGlob(glob) {
  const pattern = String(glob ?? '').trim();
  if (!pattern) return null;

  const extensionMatch = pattern.match(/^(?:\*\*\/)?\*\.([A-Za-z0-9]+)$/);
  if (extensionMatch) {
    const suffix = `.${extensionMatch[1].toLowerCase()}`;
    return (relPath) => relPath.toLowerCase().endsWith(suffix);
  }

  const prefixMatch = pattern.match(/^([^*]+)\/\*\*$/);
  if (prefixMatch) {
    const prefix = `${prefixMatch[1]}/`;
    return (relPath) => relPath.startsWith(prefix);
  }

  return null;
}

/** OR of every compilable glob in the list; null (unscoped) if none compile. */
function compileFileGlobList(globs) {
  const tests = arrayOf(globs).map(compileFileGlob).filter(Boolean);
  if (!tests.length) return null;
  return (relPath) => tests.some((test) => test(relPath));
}

/**
 * E3-b: matches against comment-stripped text — a docstring mentioning "Sass"
 * must not testify that a file uses Sass any more than a docstring mentioning
 * a package name should count as an import (measured regression: main.scss's
 * own explanatory comment was the ONLY reason it matched "sass"/"scss"
 * searchTerms; the actual `@import` chain six lines below went uncited). The
 * reported snippet still comes from the ORIGINAL line, so code on the same
 * line as a trailing comment still shows real source, not blanks.
 *
 * @param text  original file text (snippets)
 * @param code  stripComments(text) (matching) — shares one strip pass with
 *              collectDynamicAccess; same line count, same indices.
 */
function matchFile(text, code, patterns) {
  const originalLines = text.split(/\r?\n/);
  const lines = code.split(/\r?\n/);
  const matches = [];
  const seen = new Set();

  lines.forEach((line, index) => {
    for (const pattern of patterns) {
      pattern.regex.lastIndex = 0;
      if (!pattern.regex.test(line)) continue;
      const key = `${pattern.termKey}:${index + 1}:${line.trim()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      matches.push({
        type: pattern.type,
        term: pattern.term,
        source: pattern.source,
        line: index + 1,
        snippet: (originalLines[index] ?? '').trim().slice(0, 220),
        weight: pattern.weight,
        termKey: pattern.termKey,
      });
      if (matches.length >= 40) return;
    }
  });

  return matches;
}

function scoreFile(matches, score) {
  const types = new Set(matches.map((match) => match.type));
  if (types.has('VUE_TEMPLATE_TAG') || types.has('COMPONENT_SYMBOL') || types.has('DYNAMIC_COMPONENT') || types.has('IMPORT_SPECIFIER')) return 'HIGH';
  if (types.has('CONFIG_KEY') || types.has('PROP_OR_EVENT_TERM') || score >= 6) return 'MEDIUM';
  return 'LOW';
}

function classifyTerm(term) {
  if (/^v-[a-z0-9-]+$/i.test(term)) return 'VUE_TEMPLATE_TAG';
  if (/^[A-Z][A-Za-z0-9]+$/.test(term)) return 'COMPONENT_SYMBOL';
  if (/^(attach|teleport|defaults|theme|icons|locale|ssr|ShadowRoot|updateLocation|centerAffix|first-day-of-week)$/i.test(term)) return 'PROP_OR_EVENT_TERM';
  return 'INSPECTION_TERM';
}

/*
 * Scope-derived terms qualify as STRONG evidence (symbol/import/template-tag
 * patterns) only when they are distinctive identifiers — the same rule the
 * usage prescan documents: a bare lowercase word is a real scope, but it
 * matches ordinary code everywhere, so a hit proves nothing. Without this
 * gate, a vite item scoped `build` made every file containing the word
 * "build" a HIGH-confidence candidate (commitlint.config.js scored 13),
 * which in a healthcheck — where most scopes are words like build/css/deps —
 * painted the whole candidate list HIGH.
 */
function isSearchableSymbol(term) {
  return /^[A-Za-z][A-Za-z0-9]*$/.test(term) && /[A-Z]/.test(term) && term.length >= 3;
}

function expandComponentTerms(components) {
  const result = [];
  for (const raw of components) {
    for (const part of String(raw ?? '').split('/')) {
      const term = part.trim();
      if (!term) continue;
      // An explicit kebab tag (`router-link`) is distinctive: the dash makes
      // it a tag name, not prose. Bare generic words are dropped entirely —
      // weak patterns for them would still flood the list with LOW rows.
      if (/^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/.test(term)) {
        result.push({ kind: 'kebab', term });
        continue;
      }
      if (!isSearchableSymbol(term)) continue;
      result.push({ kind: 'symbol', term });
      const kebab = toKebabComponent(term);
      if (kebab) result.push({ kind: 'kebab', term: kebab });
    }
  }
  return result;
}

function toKebabComponent(value) {
  const term = String(value ?? '').trim();
  if (!term) return '';
  if (/^v-[a-z0-9-]+$/i.test(term)) return term.toLowerCase();
  /*
   * Both boundary rules are required — the same fix component-usage.js
   * already carries. Lowercase→uppercase alone misses an uppercase RUN:
   * `VOverlay` has no lowercase before the `O`, so it became `voverlay` and
   * the template regex never matched `<v-overlay>` — every V-prefixed
   * component silently lost its template-tag pattern here while the usage
   * prescan (fixed copy) still found it. The second rule splits the run
   * before its last capital (`VO` → `V-O`, `VNumberInput` → `V-Number-Input`).
   */
  return term
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

function importRegex(packageName) {
  return new RegExp(`\\bfrom\\s+['\"]${escapeRegex(packageName)}(?:/[^'\"]*)?['\"]|\\bimport\\s+['\"]${escapeRegex(packageName)}(?:/[^'\"]*)?['\"]`, 'i');
}

function templateTagRegex(tag) {
  /*
   * Matching is per LINE (matchFile), and multi-attribute templates put the
   * tag name alone at the end of its line (`<v-overlay\n  v-model=…`), so
   * end-of-line must close the tag name exactly like whitespace does. This
   * path used to be covered by accident: the broken kebab ('voverlay') never
   * matched, and a loose searchTerms substring match filled in for it.
   */
  return new RegExp(`<\\s*${escapeRegex(tag)}(?:[\\s>/]|$)`, 'i');
}

function dynamicComponentRegex(term) {
  return new RegExp(`(:is|is=|component\\s*:)\\s*=?.{0,80}['\"]${escapeRegex(term)}['\"]|resolve[A-Za-z0-9_]*\\(\\s*['\"]${escapeRegex(term)}['\"]`, 'i');
}

function wordRegex(term) {
  return new RegExp(`(^|[^A-Za-z0-9_$-])${escapeRegex(term)}([^A-Za-z0-9_$-]|$)`, 'i');
}

function termRegex(term) {
  const escaped = escapeRegex(term);
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(term)) return wordRegex(term);
  return new RegExp(escaped, 'i');
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function resolveRequiredPath(projectPath) {
  const root = resolve(String(projectPath ?? '').trim());
  if (!projectPath || !existsSync(root) || !statSync(root).isDirectory()) {
    throw new Error(`projectPath does not exist or is not a directory: ${projectPath}`);
  }
  return root;
}

function arrayOf(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function summarizeItem(item) {
  return {
    itemId: item.itemId ?? null,
    version: item.version ?? null,
    versionRole: item.versionRole ?? null,
    scope: item.scope ?? null,
    agentCategory: item.agentCategory ?? null,
    preliminaryRisk: item.preliminaryRisk ?? null,
    reviewRequired: item.reviewRequired ?? null,
    summary: item.summary ?? '',
  };
}

function inferPackageName(item) {
  const specifiers = arrayOf(item?.inspectionPlan?.importSpecifiers);
  return specifiers.includes('vuetify') ? 'vuetify' : null;
}

function normalizeRelativePath(path) {
  return path.replace(/\\/g, '/');
}