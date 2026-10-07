/**
 * 벤더 문서 어댑터 — GitHub에 저장소가 없는 상용 패키지의 릴리즈 노트를
 * 공식 문서 사이트에서 읽는다.
 *
 * T1(atom) · T3(CHANGELOG) · T2(git)는 세 개 모두 GitHub 저장소를 전제한다.
 * npm이 repository를 선언하지 않는 상용 라이브러리(realgrid 등)는 그 세 경로가
 * 전부 없어 수집이 422 ADAPTER_REQUIRED로 끝났다 — 이 모듈이 그 "개별 어댑터"다.
 *
 * 산출물은 T3와 **같은 계약**이다: 벤더 HTML을 마크다운으로 옮긴 뒤
 * `parseChangelogMarkdown`에 넘기므로, 하류(정규화 · L4 분류 · L6 판정 ·
 * L7 수정안)는 이 경로를 CHANGELOG와 구별하지 않고 그대로 처리한다.
 * 새 파서를 만들지 않는 것이 이어붙이기의 핵심이다.
 *
 * 적용 범위는 아래 ADAPTERS에 등재된 패키지뿐이다. 등재되지 않은 패키지는
 * 이 모듈을 거치지 않으므로, 어댑터 추가가 다른 패키지의 수집을 바꾸지 않는다.
 */

import { compareVersions } from './npm-registry.js';
import { parseChangelogMarkdown } from './changelog-doc.js';

export const VENDOR_SOURCE = 'VENDOR_DOC';

/**
 * Nextra(Next.js 문서 사이트) 렌더 결과에서 버전 절을 마크다운으로 옮긴다.
 *
 * 구조: `<h2 ...>v2.10.0 (2026.06.25)<a class="subheading-anchor" .../></h2>`
 * 뒤에 `<ul><li>항목</li>…</ul>`. 헤딩과 그 다음 헤딩 사이를 한 버전의
 * 본문으로 자른다.
 *
 * `<code>`는 백틱으로 보존한다 — 판정 단계가 코드 식별자를 검색어로 쓰기
 * 때문에, 태그를 지워 평문으로 만들면 증거 축이 하나 사라진다.
 */
export function nextraHtmlToMarkdown(html) {
  const text = String(html ?? '');
  const headings = [...text.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)];
  if (!headings.length) return '';

  const lines = [];
  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index];
    const title = normalizeHeadingTitle(stripTags(heading[1]));
    if (!title) continue;

    const bodyStart = heading.index + heading[0].length;
    const bodyEnd = index + 1 < headings.length ? headings[index + 1].index : text.length;
    const body = text.slice(bodyStart, bodyEnd);

    lines.push(`## ${title}`, '');
    for (const item of extractListItems(body)) lines.push(`- ${item}`);
    lines.push('');
  }
  return lines.join('\n');
}

/** `<li>` 텍스트만, 중첩 목록은 평탄화한다(항목 하나 = 변경 하나). */
function extractListItems(html) {
  const items = [];
  for (const match of String(html).matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)) {
    // 중첩 <li>는 자체 매치로도 잡히므로, 여기서는 내부 목록을 걷어낸다.
    const inner = match[1].replace(/<ul\b[\s\S]*?<\/ul>/gi, ' ').replace(/<ol\b[\s\S]*?<\/ol>/gi, ' ');
    const item = stripTags(inner);
    if (item) items.push(item);
  }
  return items;
}

/** 태그 제거 — `<code>`만 백틱으로 살린다. */
function stripTags(html) {
  return decodeEntities(
    String(html)
      .replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_, code) => `\`${decodeEntities(stripTags(code))}\``)
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeEntities(text) {
  return String(text)
    .replace(/&(?:nbsp|#160);/gi, ' ')
    .replace(/&(?:amp|#38);/gi, '&')
    .replace(/&(?:lt|#60);/gi, '<')
    .replace(/&(?:gt|#62);/gi, '>')
    .replace(/&(?:quot|#34);/gi, '"')
    .replace(/&(?:apos|#39);/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

/**
 * `v2.10.0 (2026.06.25)` → `v2.10.0 (2026-06-25)`.
 *
 * 점으로 구분된 날짜는 `parseChangelogMarkdown`의 날짜 인식(ISO)에 걸리지
 * 않아 publishedAt이 비어버린다. 버전 번호(`2.10.0`)를 건드리지 않도록
 * 괄호 안의 8자리 날짜만 바꾼다.
 */
function normalizeHeadingTitle(title) {
  return title.replace(/\((\d{4})\.(\d{2})\.(\d{2})\)/g, '($1-$2-$3)');
}

/**
 * 등재된 어댑터. `versions`는 문서가 다루는 패키지의 버전 표기와 npm 버전이
 * 같다고 보는 경우만 등재한다 — 표기가 다르면 매칭이 조용히 빈손이 된다.
 */
const ADAPTERS = {
  realgrid: {
    label: 'RealGrid 공식 문서 — 버전 히스토리',
    url: 'https://docs.realgrid.com/changelog/releases',
    toMarkdown: nextraHtmlToMarkdown,
  },
};

export function hasVendorAdapter(packageName) {
  return Boolean(ADAPTERS[String(packageName ?? '')]);
}

export function describeVendorAdapter(packageName) {
  const adapter = ADAPTERS[String(packageName ?? '')];
  return adapter ? { label: adapter.label, url: adapter.url } : null;
}

/**
 * 어댑터 티어 실행 — T3와 같은 형태의 결과를 돌려준다.
 *
 * 어댑터가 없으면 null을 반환한다(체인이 이 티어를 건너뛴다). 문서 조회
 * 실패는 티어 실패로만 남기고 예외를 던지지 않는다 — 다른 티어의 결과를
 * 잃지 않기 위해서다.
 */
export async function collectVendorTier(options = {}) {
  const packageName = String(options.packageName ?? '');
  const adapter = ADAPTERS[packageName];
  if (!adapter) return null;

  const targetVersions = [...new Set((options.targetVersions ?? []).map(String))].sort(compareVersions);
  const fetchImpl = options.fetchImpl ?? fetch;

  try {
    const response = await fetchImpl(adapter.url, { headers: { accept: 'text/html' } });
    if (!response.ok) throw new Error(`${adapter.url} → ${response.status}`);
    const markdown = adapter.toMarkdown(await response.text());
    const entries = parseChangelogMarkdown(markdown).filter((entry) => !entry.prerelease);
    const byVersion = new Map(entries.map((entry) => [entry.version, entry]));

    const releases = targetVersions
      .map((version) => byVersion.get(version))
      .filter((entry) => entry && (entry.itemCount > 0 || entry.noChanges))
      .map((entry) => ({
        version: entry.version,
        tagName: null,
        name: entry.heading,
        publishedAt: entry.publishedAt,
        sourceUrl: adapter.url,
        sections: entry.sections,
        itemCount: entry.itemCount,
        noChanges: entry.noChanges,
      }));

    return buildVendorResult({
      packageName,
      adapter,
      targetVersions,
      releases,
      reason: 'VERSION_NOT_IN_VENDOR_DOC',
      collectedAt: options.collectedAt,
      documentVersions: entries.length,
    });
  } catch (error) {
    return {
      ...buildVendorResult({
        packageName,
        adapter,
        targetVersions,
        releases: [],
        reason: 'VENDOR_DOC_UNAVAILABLE',
        collectedAt: options.collectedAt,
        documentVersions: 0,
      }),
      ok: false,
      error: { message: error instanceof Error ? error.message : String(error) },
    };
  }
}

function buildVendorResult({ packageName, adapter, targetVersions, releases, reason, collectedAt, documentVersions }) {
  const coveredVersions = releases.map((release) => release.version);
  const covered = new Set(coveredVersions);

  return {
    packageName,
    repository: null,
    tier: 'TV_VENDOR',
    source: VENDOR_SOURCE,
    ok: true,
    evidence: {
      source: VENDOR_SOURCE,
      url: adapter.url,
      label: adapter.label,
      documentVersions,
      rateLimitCost: 0,
      collectedAt: collectedAt ?? null,
    },
    // 벤더가 관리하는 버전별 변경 문서 — CHANGELOG와 같은 정밀도다.
    precision: 'CHANGELOG',
    coverage: targetVersions.length ? Math.round((coveredVersions.length / targetVersions.length) * 1000) / 1000 : null,
    coverageBasis: 'REGISTRY_VERSIONS',
    degraded: coveredVersions.length < targetVersions.length,
    targetVersions,
    coveredVersions,
    missingVersions: targetVersions.filter((version) => !covered.has(version)).map((version) => ({ version, reason })),
    releaseCount: releases.length,
    sourceReleases: releases.slice().sort((left, right) => compareVersions(right.version, left.version)),
  };
}
