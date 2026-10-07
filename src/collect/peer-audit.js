/**
 * Reverse peer audit — which installed packages break when the analyzed
 * package moves to the target version.
 *
 * The forward direction (what the analyzed package requires) is the info
 * card's requirements diff. This is the direction a real upgrade plan starts
 * from: vite-plugin-vue-layouts declares peer `vite ^4 || ^5`, so vite 6+
 * cannot even install — and since NO published version widens that range,
 * the only move is replacement. That is a registry fact, not a judgment,
 * so it is computed here deterministically and handed to the screen and to
 * L6 as evidence.
 *
 * Verdicts per dependent package:
 *   OK               installed version's peer range accepts the target
 *   UPGRADE_REQUIRED installed range rejects the target, but some published
 *                    version accepts it — firstCompatible says which
 *   DEAD_END         versions declare a peer on the analyzed package, but
 *                    none accepts the target — replacement/removal territory
 *
 * A package is skipped when its INSTALLED version declares no peer on the
 * analyzed package: for `vite`, that is 30+ unrelated deps (axios, lodash …)
 * plus any dependency that only started declaring one in a later version.
 * Absence of a constraint says nothing either way. "이 플러그인은 peer를
 * 선언하지 않는다"는 신호는 설정 파일 import 관계까지 봐야 의미가 생기므로
 * 후속 과제로 남긴다.
 */

const VERSION_PATTERN = /^(\d+)\.(\d+)\.(\d+)/;

export function parseVersion(value) {
  const match = VERSION_PATTERN.exec(String(value ?? '').trim());
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compareParsed(a, b) {
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  }
  return 0;
}

export function compareVersions(a, b) {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) return 0;
  return compareParsed(left, right);
}

/*
 * npm range grammar, the subset peer declarations actually use — measured
 * over this fixture's registry documents: `||` alternatives, whitespace-AND
 * comparators (>=, >, <=, <, =), caret, tilde, x-ranges (4, 4.x, *), hyphen
 * ranges. Prereleases are out of scope: targets are stable releases and a
 * range like `^5.0.0-beta.1` is treated by its numeric part.
 */
export function satisfiesRange(version, range) {
  const parsed = parseVersion(version);
  if (!parsed) return false;
  const text = String(range ?? '').trim();
  if (!text || text === '*') return true;

  return text.split('||').some((alternative) => {
    const clauses = buildClauses(alternative.trim());
    if (!clauses) return false;
    return clauses.every((clause) => clause(parsed));
  });
}

function buildClauses(alternative) {
  if (!alternative || alternative === '*' || alternative.toLowerCase() === 'x') return [() => true];

  /*
   * npm allows whitespace between a comparator and its version (">= 3.0.0").
   * Tokenizing on /\s+/ splits that into [">=", "3.0.0"], loses the version
   * part and fails the whole range — measured on @vue/eslint-config-prettier
   * (`eslint: ">= 8.21.0"`), where a compatible peer became DEAD_END and the
   * judgment told the user to replace the package (대장 §L 결함 1). Hyphen
   * ranges carry no comparator, so they are unaffected; whitespace-AND
   * (">=1.0.0 <2.0.0") has no operator-trailing space and is untouched.
   */
  const text = alternative.replace(/([<>]=?|=)\s+/g, '$1');

  // Hyphen range: "1.2.3 - 2.3.4" (spaces required by the grammar).
  const hyphen = text.match(/^(\S+)\s+-\s+(\S+)$/);
  if (hyphen) {
    const low = expandPartial(hyphen[1]);
    const high = expandPartial(hyphen[2]);
    if (!low || !high) return null;
    return [(v) => compareParsed(v, low.floor) >= 0, (v) => (high.partial ? compareParsed(v, high.ceiling) < 0 : compareParsed(v, high.floor) <= 0)];
  }

  const clauses = [];
  for (const token of text.split(/\s+/)) {
    const clause = buildComparator(token);
    if (!clause) return null;
    clauses.push(clause);
  }
  return clauses.length ? clauses : null;
}

function buildComparator(token) {
  const match = token.match(/^(\^|~|>=|<=|>|<|=)?\s*(.+)$/);
  if (!match) return null;
  const [, operator = '', rest] = match;
  const part = expandPartial(rest);
  if (!part) return null;
  const { floor, ceiling } = part;

  switch (operator) {
    case '>=': return (v) => compareParsed(v, floor) >= 0;
    case '>': return (v) => (part.partial ? compareParsed(v, ceiling) >= 0 : compareParsed(v, floor) > 0);
    case '<=': return (v) => (part.partial ? compareParsed(v, ceiling) < 0 : compareParsed(v, floor) <= 0);
    case '<': return (v) => compareParsed(v, floor) < 0;
    case '=': return (v) => (part.partial ? within(v, floor, ceiling) : compareParsed(v, floor) === 0);
    case '^': {
      const upper = floor[0] > 0 ? [floor[0] + 1, 0, 0] : floor[1] > 0 ? [0, floor[1] + 1, 0] : [0, 0, floor[2] + 1];
      return (v) => within(v, floor, upper);
    }
    case '~': {
      // ~1.2.3 / ~1.2 → next minor; ~1 → next major.
      const upper = part.precision >= 2 ? [floor[0], floor[1] + 1, 0] : [floor[0] + 1, 0, 0];
      return (v) => within(v, floor, upper);
    }
    default:
      // Bare version: exact when full, x-range when partial (4 → >=4 <5).
      return (v) => (part.partial ? within(v, floor, ceiling) : compareParsed(v, floor) === 0);
  }
}

function within(v, floor, ceilingExclusive) {
  return compareParsed(v, floor) >= 0 && compareParsed(v, ceilingExclusive) < 0;
}

/**
 * "4" → floor 4.0.0, ceiling 5.0.0 (partial). "1.2" → 1.2.0 / 1.3.0.
 * "1.2.3" → exact (partial=false). x/X/* segments count as absent.
 */
function expandPartial(text) {
  const cleaned = String(text ?? '').trim().replace(/^v/i, '');
  const segments = cleaned.split('.').map((segment) => segment.split('-')[0]);
  const isWild = (segment) => segment === undefined || segment === '' || /^[xX*]$/.test(segment);
  const nums = [];
  for (const segment of segments.slice(0, 3)) {
    if (isWild(segment)) break;
    const value = Number(segment);
    if (!Number.isInteger(value) || value < 0) return null;
    nums.push(value);
  }
  if (!nums.length) return { floor: [0, 0, 0], ceiling: [Infinity, 0, 0], partial: true, precision: 0 };

  const floor = [nums[0] ?? 0, nums[1] ?? 0, nums[2] ?? 0];
  const precision = nums.length;
  if (precision === 3) return { floor, ceiling: floor, partial: false, precision };
  const ceiling = precision === 1 ? [floor[0] + 1, 0, 0] : [floor[0], floor[1] + 1, 0];
  return { floor, ceiling, partial: true, precision };
}

function isStableVersion(version) {
  return VERSION_PATTERN.test(version) && !version.includes('-');
}

/**
 * @param options.packageName    the analyzed package (e.g. 'vite')
 * @param options.targetVersion  the upgrade destination
 * @param options.dependencies   [{ name, version }] — the project's other deps
 * @param options.loadMetadata   (name) => registry document (injected: reuses
 *                               the server's process cache, so post-probe this
 *                               audit costs zero HTTP)
 */
export async function auditReversePeers({ packageName, targetVersion, dependencies, loadMetadata }) {
  const rows = [];

  for (const dependency of dependencies ?? []) {
    if (!dependency?.name || dependency.name === packageName) continue;

    let metadata;
    try {
      metadata = await loadMetadata(dependency.name);
    } catch {
      // Not on the registry (CDN installs) — nothing to audit, and absence
      // of a verdict must not read as compatibility.
      continue;
    }

    const versions = metadata?.versions ?? {};
    const installedRange = versions[dependency.version]?.peerDependencies?.[packageName] ?? null;
    /*
     * The audit reads what the INSTALLED version demands. No declaration
     * there means no constraint, so nothing about this dependency blocks the
     * target — even when newer versions of it do declare one.
     *
     * That last case is why this is a guard and not an afterthought:
     * vue-router first declared a `vite` peer in 5.1.0, so the installed
     * 4.4.0 — whose peers are `{vue: ^3.2.0}` — was read as "rejects vite 8"
     * and became a companion upgrade to 5.1.0, itself a major that drags in
     * pinia ^3 and @pinia/colada. A constraint that does not exist cannot be
     * violated.
     *
     * Same rule as the unrelated deps below it (axios, lodash …), and it
     * subsumes them: a package no version of which declares a peer here
     * cannot have one on the installed version either. Turning "선언하지
     * 않는다"를 신호로 쓰려면 설정 파일 import 관계까지 봐야 하므로 후속
     * 과제로 남긴다. Unknown installed versions (not in the registry
     * document) land here too — absence of evidence, not evidence of a break.
     */
    if (!installedRange) continue;

    const installedOk = satisfiesRange(targetVersion, installedRange);

    const compatible = Object.keys(versions)
      .filter((version) => versions[version]?.peerDependencies?.[packageName])
      .filter(isStableVersion)
      .filter((version) => satisfiesRange(targetVersion, versions[version].peerDependencies[packageName]))
      .sort(compareVersions);

    rows.push({
      name: dependency.name,
      installedVersion: dependency.version,
      installedPeerRange: installedRange,
      verdict: installedOk ? 'OK' : compatible.length ? 'UPGRADE_REQUIRED' : 'DEAD_END',
      firstCompatible: compatible[0] ?? null,
      latestCompatible: compatible[compatible.length - 1] ?? null,
      compatiblePeerRange: compatible.length
        ? versions[compatible[compatible.length - 1]].peerDependencies[packageName]
        : null,
    });
  }

  // Broken things first, then alphabetical — the order a plan is written in.
  const rank = { DEAD_END: 0, UPGRADE_REQUIRED: 1, OK: 2 };
  rows.sort((a, b) => rank[a.verdict] - rank[b.verdict] || a.name.localeCompare(b.name));
  return { packageName, targetVersion, rows };
}
