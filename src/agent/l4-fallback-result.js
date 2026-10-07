import { buildL4Input } from './l4-prompt.js';

const DEFAULT_REASON = 'Claude CLI unavailable or failed; using pilot fallback data.';
const RISK_ORDER = ['LOW', 'MEDIUM', 'HIGH'];
const PARSER_CATEGORIES = ['BREAKING', 'BUG_FIX', 'REVERT', 'FEATURE', 'LABS', 'REFACTOR', 'RELEASE_NOTE', 'PERFORMANCE', 'OTHER'];

export function buildL4FallbackClassification(stage3Result, options = {}) {
  const maxItems = Number(options.maxItems ?? 20);
  const selectionMode = options.selectionMode ?? 'priority';
  const fallbackRandomness = clamp01(options.fallbackRandomness ?? options.randomness ?? 0);
  const fallbackSeed = String(options.fallbackSeed ?? options.seed ?? (fallbackRandomness > 0 ? `${Date.now()}-${Math.random()}` : stableFallbackSeed(stage3Result, { maxItems, selectionMode })));
  const random = createRandom(fallbackSeed);
  // `usage` must flow through: the fallback's selection has to match what the
  // real runner would have sent, or the two paths classify different items.
  const input = buildL4Input(stage3Result, { maxItems, selectionMode, usage: options.usage });
  const items = input.items.map((item, index) => classifyFallbackItem(item, { random, fallbackRandomness, index }));
  const summary = summarize(items);

  return {
    result: {
      packageName: stage3Result.packageName ?? 'unknown',
      mode: stage3Result.mode ?? 'UPGRADE_IMPACT',
      currentVersion: stage3Result.currentVersion ?? 'unknown',
      targetVersion: stage3Result.targetVersion ?? null,
      itemCount: items.length,
      summary,
      items,
      globalInspectionPlan: buildGlobalInspectionPlan(items),
      warnings: buildWarnings(options.reason ?? DEFAULT_REASON, fallbackRandomness),
    },
    meta: {
      runner: 'fallback-mock',
      fallback: true,
      fallbackReason: options.reason ?? DEFAULT_REASON,
      fallbackRandomness,
      fallbackSeed,
      deterministic: fallbackRandomness === 0,
      sourceItemCount: input.sourceItemCount,
      includedItemCount: input.includedItemCount,
      deferredItemCount: input.deferredItemCount,
    },
  };
}

function classifyFallbackItem(item, context) {
  const { random, fallbackRandomness } = context;
  const parserCategory = normalizeCategory(item.category ?? item.parserCategory ?? 'OTHER');
  const raw = `${item.scope ?? ''} ${item.summary ?? ''} ${item.rawText ?? ''}`.toLowerCase();
  const signals = inferSignals(raw, parserCategory, item.versionRole);
  const agentCategory = chooseAgentCategory(parserCategory, signals, random, fallbackRandomness);
  const baseRisk = inferBaseRisk(agentCategory, parserCategory, signals, item.versionRole);
  const preliminaryRisk = chooseRisk(baseRisk, signals, item.versionRole, random, fallbackRandomness);
  const reviewRequired = chooseReviewRequired(preliminaryRisk, item.versionRole, signals, random, fallbackRandomness);
  const scope = item.scope ?? null;
  const domains = chooseDomains(inferDomains(raw, scope), signals, random, fallbackRandomness);
  const mechanisms = chooseMechanisms(inferMechanisms(agentCategory, raw), signals, random, fallbackRandomness);

  return {
    itemId: item.itemId,
    version: item.version,
    versionRole: item.versionRole ?? null,
    publishedAt: item.publishedAt ?? null,
    parserCategory,
    agentCategory,
    scope,
    summary: item.summary ?? item.rawText ?? '',
    sourceUrl: item.sourceUrl ?? null,
    inputSelectionReasons: item.selectionReasons ?? ['fallback-selected'],
    preliminaryRisk,
    reviewRequired,
    suspectedImpactDomains: domains,
    suspectedChangeMechanisms: mechanisms,
    inspectionPlan: {
      fileGlobs: chooseFileGlobs(domains, signals),
      searchTerms: buildSearchTerms(scope, item.summary, signals, random, fallbackRandomness),
      componentTags: scope ? [scope] : [],
      importSpecifiers: ['vuetify', scope].filter(Boolean),
      configKeys: buildConfigKeys(raw, signals),
      reason: buildInspectionReason({ scope, agentCategory, preliminaryRisk, reviewRequired, raw, signals, random }),
    },
    reasoning: buildReasoning({ item, parserCategory, agentCategory, preliminaryRisk, reviewRequired, signals, domains, mechanisms, raw, random }),
  };
}

function buildWarnings(reason, fallbackRandomness) {
  const warnings = [
    'Mock fallback result for pilot UI/testing only. Do not use as final migration evidence.',
    reason,
  ];
  if (fallbackRandomness > 0) {
    warnings.push(`Fallback randomness is enabled at ${fallbackRandomness}; results intentionally vary within category/risk constraints.`);
  }
  return warnings;
}

function inferSignals(raw, parserCategory, versionRole) {
  return {
    security: /security|vulnerab|cve|ghsa|xss|csrf|prototype pollution|injection|permission|auth/.test(raw),
    breaking: parserCategory === 'BREAKING' || /breaking|migration|migrate|incompatible/.test(raw),
    removal: /remove|removed|deprecated|drop|dropped/.test(raw),
    defaults: /defaults?|propagate|inherited props|theme|icon|locale|aliases/.test(raw),
    apiShape: /types?|emit|argument|property|prop|slot|event|model|support/.test(raw),
    domRuntime: /shadowroot|attach|teleport|overlay|hydration|ssr|portal|render/.test(raw),
    accessibility: /forced-colors|accessibility|keyboard|focus|delete key|aria/.test(raw),
    bug: parserCategory === 'BUG_FIX' || /fix|regression|crash|error|wrong|missing|correct/.test(raw),
    feature: parserCategory === 'FEATURE' || /add|added|allow|support|new /.test(raw),
    labs: parserCategory === 'LABS',
    revert: parserCategory === 'REVERT' || /revert/.test(raw),
    current: versionRole === 'CURRENT',
    target: versionRole === 'TARGET',
    // Healthcheck: released after the installed version, so the defect it
    // fixes is still present in what the project runs today.
    patchAhead: versionRole === 'PATCH_AHEAD',
    intermediate: versionRole === 'INTERMEDIATE',
    other: parserCategory === 'OTHER',
  };
}

function chooseAgentCategory(parserCategory, signals, random, randomness) {
  const candidates = [parserCategory];
  if (signals.security || signals.breaking || signals.removal) candidates.push('BREAKING');
  if (signals.revert) candidates.push('REVERT');
  if (signals.bug) candidates.push('BUG_FIX');
  if (signals.feature) candidates.push('FEATURE');
  if (signals.labs) candidates.push('LABS');
  if (signals.other) candidates.push('OTHER');
  const unique = Array.from(new Set(candidates.filter((category) => PARSER_CATEGORIES.includes(category))));

  if (randomness === 0 || unique.length === 1) {
    if (signals.other && signals.bug) return 'BUG_FIX';
    if (signals.other && signals.feature) return 'FEATURE';
    return unique[0];
  }

  if (signals.security || signals.breaking) return weightedPick([['BREAKING', 0.75], [parserCategory, 0.25]], random);
  if (signals.removal) return weightedPick([['BREAKING', 0.45], [parserCategory, 0.4], ['REFACTOR', 0.15]], random);
  if (signals.other) return weightedPick(unique.map((category) => [category, category === 'OTHER' ? 0.35 : 0.65 / Math.max(1, unique.length - 1)]), random);
  if (signals.apiShape && parserCategory === 'BUG_FIX' && random() < randomness * 0.1) return weightedPick([['BUG_FIX', 0.9], ['FEATURE', 0.1]], random);
  if ((parserCategory === 'LABS' || parserCategory === 'FEATURE') && random() < randomness * 0.2) return weightedPick([[parserCategory, 0.75], ['FEATURE', 0.15], ['LABS', 0.1]], random);
  return random() < randomness * 0.08 ? pick(unique, random) : parserCategory;
}

function inferBaseRisk(agentCategory, parserCategory, signals, versionRole) {
  if (signals.security || signals.breaking || signals.removal) return 'HIGH';
  if (signals.defaults || signals.domRuntime) return 'HIGH';
  if (signals.revert || signals.other) return 'MEDIUM';
  if (signals.apiShape || signals.accessibility || signals.bug) return 'MEDIUM';
  if (versionRole === 'CURRENT' || versionRole === 'TARGET' || versionRole === 'PATCH_AHEAD') {
    return agentCategory === 'PERFORMANCE' || agentCategory === 'RELEASE_NOTE' ? 'LOW' : 'MEDIUM';
  }
  if (parserCategory === 'PERFORMANCE' || parserCategory === 'RELEASE_NOTE' || parserCategory === 'REFACTOR') return 'LOW';
  return 'LOW';
}

function chooseRisk(baseRisk, signals, versionRole, random, randomness) {
  if (randomness === 0) return baseRisk;
  const floor = signals.security || signals.breaking || signals.removal || signals.defaults || signals.domRuntime ? 'MEDIUM' : 'LOW';
  const ceiling = signals.security || signals.breaking || signals.removal ? 'HIGH' : 'HIGH';
  let risk = baseRisk;

  if (random() < randomness * 0.28) risk = shiftRisk(risk, random() < 0.55 ? 1 : -1);
  if ((versionRole === 'CURRENT' || versionRole === 'TARGET') && random() < randomness * 0.16) risk = shiftRisk(risk, 1);
  if ((signals.labs || signals.feature) && random() < randomness * 0.2) risk = shiftRisk(risk, random() < 0.5 ? 1 : -1);
  return clampRisk(risk, floor, ceiling);
}

function chooseReviewRequired(risk, versionRole, signals, random, randomness) {
  if (risk === 'HIGH') return true;
  if (risk === 'MEDIUM') return randomness > 0 ? random() >= randomness * 0.12 : true;
  if (signals.other || signals.security || signals.breaking || signals.removal || signals.defaults || signals.domRuntime) return true;
  if (versionRole === 'TARGET') return randomness > 0 ? random() < 0.65 : true;
  if (versionRole === 'CURRENT') return randomness > 0 ? random() < 0.55 : true;
  return randomness > 0 ? random() < randomness * 0.35 : false;
}

function chooseDomains(domains, signals, random, randomness) {
  const result = new Set(domains);
  if (randomness > 0 && random() < randomness * 0.3) {
    if (signals.apiShape) result.add('RUNTIME');
    if (signals.defaults) result.add('CONFIGURATION');
    if (signals.domRuntime) result.add('RUNTIME');
    if (signals.feature || signals.labs) result.add('SOURCE_API');
  }
  return Array.from(result).slice(0, 4);
}

function chooseMechanisms(mechanisms, signals, random, randomness) {
  const result = new Set(mechanisms);
  if (randomness > 0 && random() < randomness * 0.35) {
    if (signals.apiShape) result.add('BEHAVIOR_CHANGED');
    if (signals.defaults) result.add('DEFAULT_CHANGED');
    if (signals.accessibility) result.add('BEHAVIOR_CHANGED');
    if (signals.feature || signals.labs) result.add('ADDED');
  }
  return Array.from(result).slice(0, 4);
}

function summarize(items) {
  return {
    high: items.filter((item) => item.preliminaryRisk === 'HIGH').length,
    medium: items.filter((item) => item.preliminaryRisk === 'MEDIUM').length,
    low: items.filter((item) => item.preliminaryRisk === 'LOW').length,
    unknown: items.filter((item) => item.preliminaryRisk === 'UNKNOWN').length,
    reviewRequired: items.filter((item) => item.reviewRequired).length,
    otherReclassified: items.filter((item) => item.parserCategory === 'OTHER' && item.agentCategory !== 'OTHER').length,
  };
}

function buildGlobalInspectionPlan(items) {
  return {
    fileGlobs: Array.from(new Set(items.flatMap((item) => item.inspectionPlan.fileGlobs))).slice(0, 8),
    searchTerms: Array.from(new Set(items.flatMap((item) => item.inspectionPlan.searchTerms))).slice(0, 20),
    componentTags: Array.from(new Set(items.flatMap((item) => item.inspectionPlan.componentTags))).slice(0, 20),
    importSpecifiers: Array.from(new Set(items.flatMap((item) => item.inspectionPlan.importSpecifiers))).slice(0, 20),
    configKeys: Array.from(new Set(items.flatMap((item) => item.inspectionPlan.configKeys))).slice(0, 20),
    notes: [
      'Use item-level inspection plans as source-search hints, then confirm impact with local project evidence.',
      'Do not make final migration decisions from Stage 4 alone; combine this classification with Stage 5 source matching.',
    ],
  };
}

export function inferDomains(raw, scope) {
  const domains = new Set();
  if (/vite|webpack|build|ssr|hydration/.test(raw)) domains.add('BUILD');
  if (/theme|defaults|config|locale|icon|inherited props/.test(raw)) domains.add('CONFIGURATION');
  if (/install|dependency|package|peer/.test(raw)) domains.add('DEPENDENCY_RESOLUTION');
  if (/test|spec/.test(raw)) domains.add('TEST_ONLY');
  if (scope || /component|v[A-Z]?/.test(raw)) domains.add('SOURCE_API');
  if (domains.size === 0) domains.add('RUNTIME');
  return Array.from(domains);
}

export function inferMechanisms(category, raw) {
  const mechanisms = new Set();
  if (category === 'BREAKING') mechanisms.add('BEHAVIOR_CHANGED');
  if (category === 'BUG_FIX') mechanisms.add('FIXED');
  if (category === 'REVERT') mechanisms.add('MIGRATED');
  if (category === 'FEATURE') mechanisms.add('ADDED');
  if (/remove|removed/.test(raw)) mechanisms.add('REMOVED');
  if (/deprecated/.test(raw)) mechanisms.add('DEPRECATED');
  if (/default|inherited props|propagate/.test(raw)) mechanisms.add('DEFAULT_CHANGED');
  if (/rename|renamed/.test(raw)) mechanisms.add('RENAMED');
  if (/types?|argument|property|prop|emit/.test(raw)) mechanisms.add('BEHAVIOR_CHANGED');
  if (mechanisms.size === 0) mechanisms.add('UNKNOWN');
  return Array.from(mechanisms);
}

function buildSearchTerms(scope, summary, signals, random, randomness) {
  const terms = ['vuetify'];
  if (scope) terms.push(scope, toKebabComponent(scope));
  const words = String(summary ?? '')
    .split(/[^A-Za-z0-9_.$-]+/)
    .filter((word) => word.length >= 4)
    .filter((word) => !['with', 'from', 'this', 'that'].includes(word.toLowerCase()))
    .slice(0, 8);
  const shuffledWords = randomness > 0 ? shuffle(words, random).slice(0, 6) : words.slice(0, 6);
  if (signals.defaults) terms.push('defaults');
  if (signals.domRuntime) terms.push('teleport', 'attach');
  if (signals.apiShape) terms.push('props', 'emit');
  return Array.from(new Set([...terms, ...shuffledWords].filter(Boolean))).slice(0, 12);
}

function chooseFileGlobs(domains, signals) {
  const globs = ['src/**/*.vue', 'src/**/*.js', 'src/**/*.ts'];
  if (domains.includes('CONFIGURATION')) globs.push('src/plugins/**/*.{js,ts}', 'vite.config.{js,ts}', 'vuetify*.{js,ts}');
  if (signals.labs) globs.push('src/**/*.{vue,js,ts}');
  return Array.from(new Set(globs)).slice(0, 8);
}

function buildConfigKeys(raw, signals) {
  const keys = [];
  if (signals.defaults || raw.includes('theme')) keys.push('theme', 'defaults');
  if (raw.includes('locale')) keys.push('locale');
  if (raw.includes('icon')) keys.push('icons');
  if (signals.domRuntime) keys.push('ssr', 'attach');
  return Array.from(new Set(keys));
}

function buildInspectionReason({ scope, agentCategory, preliminaryRisk, reviewRequired, raw, signals, random }) {
  const target = scope ? `${scope} usage` : 'matching Vuetify usage';
  const variants = [];
  if (signals.defaults) variants.push(`Search ${target} because defaults or inherited configuration can change behavior without obvious import changes.`);
  if (signals.apiShape) variants.push(`Search ${target} because prop/event/type changes can affect template bindings or TypeScript checks.`);
  if (signals.domRuntime) variants.push(`Search ${target} because DOM attachment or rendering behavior can affect runtime layout and SSR paths.`);
  if (signals.accessibility) variants.push(`Search ${target} because keyboard or accessibility behavior can alter user-facing interaction paths.`);
  if (reviewRequired) variants.push(`Search ${target} because ${agentCategory} was classified as ${preliminaryRisk} by the risk heuristic.`);
  variants.push(`Keep a lightweight search for ${target}; this item is currently treated as ${preliminaryRisk} upgrade context.`);
  return pick(variants, random);
}

function buildReasoning({ item, parserCategory, agentCategory, preliminaryRisk, reviewRequired, signals, domains, mechanisms, raw, random }) {
  const scope = item.scope ? `\`${item.scope}\`` : 'an unspecified Vuetify area';
  const role = describeVersionRole(item.versionRole);
  const domainText = domains.join(', ');
  const mechanismText = mechanisms.join(', ');

  const variants = [];
  if (signals.other) {
    variants.push(`Parser uncertainty remains because the release section did not map cleanly to one stable category. It is still selected for ${role}; search ${scope} and raw changelog terms before deciding whether it is safe to defer.`);
  }
  if (signals.domRuntime) {
    variants.push(`${scope} is flagged because overlay, DOM attachment, SSR, or portal behavior can affect runtime rendering. It maps to ${domainText} with ${mechanismText}, so local usage should be checked even though the parser category is ${parserCategory}.`);
  }
  if (signals.defaults) {
    variants.push(`${scope} is configuration-sensitive because defaults, inherited props, theme, locale, or icon propagation can change behavior without direct import changes. ${role} plus ${mechanismText} means templates and Vuetify defaults should be searched.`);
  }
  if (signals.apiShape) {
    variants.push(`${scope} needs source/API review because prop, event, slot, or type-shape changes can affect Vue bindings and TypeScript checks. The likely mechanism is ${mechanismText}, with impact around ${domainText}.`);
  }
  if (signals.accessibility) {
    variants.push(`${scope} remains visible because accessibility or keyboard interaction changes can alter user-facing behavior in forms and controls. Risk is ${preliminaryRisk}; verify matching component usage before dropping it.`);
  }
  if (signals.removal || signals.breaking) {
    variants.push(`${scope} is assigned ${preliminaryRisk} because removal, deprecation, breaking, or migration language usually requires source inspection. This should be reviewed as ${role}, especially for usages matching the generated search terms.`);
  }
  if (signals.bug) {
    variants.push(`${scope} is marked ${agentCategory}/${preliminaryRisk} because bug fixes may change edge-case runtime behavior when the project uses the affected component. ${role} keeps it in scope for comparison against local usage.`);
  }
  if (signals.feature || signals.labs) {
    variants.push(`${scope} is classified as ${preliminaryRisk}: feature/labs entries are usually optional, but selected target or intermediate items can introduce new props or interaction paths worth checking when the component is already used.`);
  }
  if (reviewRequired) {
    variants.push(`Review is required for ${scope} because ${agentCategory} plus ${role} suggests possible ${mechanismText} impact in ${domainText}. This should feed Stage 5 source matching before any final impact judgment.`);
  }
  variants.push(`${scope} is marked ${preliminaryRisk} because the item was parsed as ${parserCategory} and re-evaluated as ${agentCategory}; keep it as structured input for Stage 5 source matching.`);
  return pick(variants, random);
}
function describeVersionRole(versionRole) {
  if (versionRole === 'CURRENT') return 'current-version context';
  if (versionRole === 'TARGET') return 'target-version destination';
  if (versionRole === 'INTERMEDIATE') return 'intermediate upgrade context';
  return 'the selected L4 batch';
}

function normalizeCategory(category) {
  return PARSER_CATEGORIES.includes(category) ? category : 'OTHER';
}

function clamp01(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1, number));
}

function shiftRisk(risk, delta) {
  const index = RISK_ORDER.indexOf(risk);
  const next = Math.max(0, Math.min(RISK_ORDER.length - 1, index + delta));
  return RISK_ORDER[next] ?? risk;
}

function clampRisk(risk, floor, ceiling) {
  const index = RISK_ORDER.indexOf(risk);
  const floorIndex = RISK_ORDER.indexOf(floor);
  const ceilingIndex = RISK_ORDER.indexOf(ceiling);
  return RISK_ORDER[Math.max(floorIndex, Math.min(ceilingIndex, index))] ?? risk;
}

function pick(values, random) {
  return values[Math.floor(random() * values.length)] ?? values[0];
}

function weightedPick(entries, random) {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let cursor = random() * total;
  for (const [value, weight] of entries) {
    cursor -= weight;
    if (cursor <= 0) return value;
  }
  return entries.at(-1)?.[0];
}

function shuffle(values, random) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function stableFallbackSeed(stage3Result, options) {
  return JSON.stringify({
    packageName: stage3Result.packageName,
    mode: stage3Result.mode,
    currentVersion: stage3Result.currentVersion,
    targetVersion: stage3Result.targetVersion,
    maxItems: options.maxItems,
    selectionMode: options.selectionMode,
    itemIds: (stage3Result.items ?? []).map((item) => item.itemId),
  });
}

function createRandom(seedText) {
  let state = hashString(seedText);
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(text) {
  let hash = 2166136261;
  for (let index = 0; index < String(text).length; index += 1) {
    hash ^= String(text).charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function toKebabComponent(value) {
  if (!value || !/^V[A-Z]/.test(value)) return null;
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/^V-?/, 'v-')
    .toLowerCase();
}