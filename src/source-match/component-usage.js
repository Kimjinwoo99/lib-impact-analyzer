/**
 * Which of a set of components a project actually uses.
 *
 * `matchSourceImpact` answers this for one change item at a time by rescanning
 * every source file. A migration guide asks about fifteen components at once,
 * so this reads each file once and tests them all against it.
 *
 * Only the two forms the main matcher treats as HIGH confidence count here —
 * the template tag and the PascalCase symbol. Weaker signals would let an
 * unrelated word keep a guide section on screen that the project never needs
 * to read, which is the opposite of what this filter is for.
 */

import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { discoverSourceFiles } from './source-matcher.js';
import { detectProjectProfile } from './project-profile.js';

export function matchComponentUsage(projectPath, components, signatureKeys = []) {
  const names = [...new Set((components ?? []).map(String).filter(Boolean))];
  const keys = [...new Set((signatureKeys ?? []).filter((key) => SCOPE_SIGNATURES[key]))];
  const usage = Object.fromEntries(names.map((name) => [name, { fileCount: 0, files: [] }]));
  const signatureUsage = Object.fromEntries(keys.map((key) => [key, { fileCount: 0, files: [] }]));
  if (!names.length && !keys.length) return { scannedFiles: 0, usage, signatureUsage };

  const patterns = names.map((name) => ({ name, regexes: buildRegexes(name) }));
  const files = discoverSourceFiles(projectPath);

  for (const filePath of files) {
    const relativePath = normalize(relative(projectPath, filePath));
    const text = readFileSync(filePath, 'utf8');
    for (const pattern of patterns) {
      if (!pattern.regexes.some((regex) => regex.test(text))) continue;
      const entry = usage[pattern.name];
      entry.fileCount += 1;
      // A handful of paths is enough to act on; the count carries the rest.
      if (entry.files.length < 5) entry.files.push(relativePath);
    }
    for (const key of keys) {
      const signature = SCOPE_SIGNATURES[key];
      if (signature.filePattern && !signature.filePattern.test(relativePath)) continue;
      if (!signature.patterns.some((regex) => regex.test(text))) continue;
      const entry = signatureUsage[key];
      entry.fileCount += 1;
      if (entry.files.length < 5) entry.files.push(relativePath);
    }
  }

  return { scannedFiles: files.length, usage, signatureUsage };
}

/**
 * 템플릿 토큰(`item.title` 같은 슬롯 프로퍼티 접근)의 소스 실측.
 *
 * matchConfigUsage의 템플릿판이다: 저쪽은 옵션 경로를 **설정 파일**에서 찾고,
 * 이쪽은 슬롯 프로퍼티 접근을 **소스 파일**(.vue 템플릿 포함)에서 찾는다.
 * 슬롯 토큰이 설정 스캔으로 새면 당연한 ABSENT가 "코드에 없음"이라는 거짓
 * 부정 증거가 된다 — 2026-08-22 vuetify 실측 오판의 원인(정밀도-검증대장 §F).
 *
 * 경계 규칙이 관건이다: `item.title`을 찾을 때 `internalItem.title`의 꼬리에
 * 걸리면 안 된다. 왼쪽에 식별자 문자가 없어야 매치로 친다.
 *
 * @returns { usage: {term: {present, evidence:[{file,line,excerpt}]}}, scannedFiles }
 */
export function matchTemplateUsage(projectPath, terms) {
  const wanted = [...new Set((terms ?? []).map(String).filter(Boolean))];
  const usage = Object.fromEntries(wanted.map((term) => [term, { present: false, evidence: [] }]));
  if (!wanted.length) return { usage, scannedFiles: 0 };

  const patterns = wanted.map((term) => ({ term, regex: templateTermPattern(term) }));

  const files = discoverSourceFiles(projectPath);
  for (const filePath of files) {
    const relativePath = normalize(relative(projectPath, filePath));
    // 주석 속 옛 문법 언급이 PRESENT를 만들면 안 된다 — 줄 번호 보존형 블랭킹.
    const text = blankComments(readFileSync(filePath, 'utf8'));
    if (!patterns.some(({ regex }) => regex.test(text))) continue;
    const lines = text.split('\n');
    for (const { term, regex } of patterns) {
      const entry = usage[term];
      for (let index = 0; index < lines.length; index += 1) {
        if (!regex.test(lines[index])) continue;
        entry.present = true;
        if (entry.evidence.length < 5) {
          entry.evidence.push({ file: relativePath, line: index + 1, excerpt: lines[index].trim().slice(0, 160) });
        }
      }
    }
  }

  return { usage, scannedFiles: files.length };
}

/*
 * 토큰 형태별 경계 규칙 — 오탐이 ABSENT의 신뢰를 깨므로 좌우 모두 막는다.
 *   왼쪽 (?<![\w$-])  internalItem.title 안의 item.title, no-fill-height 안의
 *                     fill-height를 배제
 *   오른쪽 (?![\w-])  item.titleCase · fill-height-x 배제
 *   :prop            v-bind: 장형(v-bind:rules)도 같은 사용이므로 함께 잡는다 —
 *                     장형만 쓰는 프로젝트에서 ABSENT가 나면 거짓 부정이 된다
 */
function templateTermPattern(term) {
  if (term.startsWith(':')) {
    const bare = escapeRegex(term.slice(1));
    return new RegExp(`(?:(?<![\\w$-]):|v-bind:)${bare}(?![\\w-])`);
  }
  // `-`로 끝나는 토큰은 계열 접두다 — `rgba(var(--v-theme-`가 실코드의
  // `--v-theme-on-background`에 닿아야 하므로 오른쪽 경계를 걸지 않는다.
  if (term.endsWith('-')) {
    return new RegExp(`(?<![\\w$-])${escapeRegex(term)}`);
  }
  return new RegExp(`(?<![\\w$-])${escapeRegex(term)}(?![\\w-])`);
}

/** 줄 수를 보존하며 //·블록·HTML 주석을 지운다 (config-usage와 같은 소형 휴리스틱). */
export function blankComments(text) {
  return String(text)
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/<!--[\s\S]*?-->/g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"\\])\/\/[^\n]*/g, (match, lead) => lead + ' '.repeat(match.length - lead.length));
}

/*
 * 기능 시그니처 사전 — scope가 `wasm`·`worker`처럼 검색 불가능한 일반어라도,
 * 그 기능을 "쓸 때 반드시 나타나는 구문"은 일반어가 아니다. 그 구문이 전체
 * 소스에서 0히트면 UNUSED를 확정할 수 있다 (vite 골든 실행 재채점에서
 * group:wasm/worker/lib 3건이 "판정 불가"로 사람에게 넘어갔지만 grep 한 번
 * 이면 소거 가능했던 문제).
 *
 * 등재 기준은 특이도다: 히트가 우연일 수 있는 패턴은 넣지 않는다 — 여기서
 * 잘못된 UNUSED는 위험을 숨기므로, 애매하면 사전에 없는 채로 UNDETERMINED에
 * 남긴다. `lib`는 build.lib(라이브러리 모드) 구문이 설정 파일 밖에서도 흔한
 * 표기라 설정 파일로 범위를 제한한다.
 */
export const SCOPE_SIGNATURES = {
  worker: {
    patterns: [/new\s+(?:Shared)?Worker\s*\(/, /\?worker(?:&|['"])/],
  },
  wasm: {
    patterns: [/\.wasm(?:\?[^'"]*)?['"]/],
  },
  json: {
    patterns: [
      /import[^\n]*['"][^'"\n]+\.json['"]/,
      /require\s*\(\s*['"][^'"\n]+\.json['"]/,
    ],
  },
  lib: {
    patterns: [/\blib\s*:\s*[{'"`]/],
    filePattern: /(?:^|\/)(?:vite|webpack|rollup|rolldown)\.config\.[cm]?[jt]s$/,
  },
};

/*
 * 가이드 전역 섹션 시그니처 — 컴포넌트명도 옵션 경로도 슬롯 토큰도 없는
 * 섹션(`Breakpoints`·`Typography`·`Elevation`)이 unknown으로 떨어져 판정
 * 유닛이 아예 생기지 않던 구멍을 막는다. 실제 프로젝트 실측(2026-08-24)에서
 * 브레이크포인트 축소(md 960→840)가 반응형 prop 12곳이 있는 프로젝트에서
 * 유닛 없음으로 누락됐다(확인형 FN).
 *
 * SCOPE_SIGNATURES와 같은 등재 기준이다 — 특이도: 그 기능을 "쓸 때 반드시
 * 나타나는 구문"만 싣는다. 애매한 패턴으로 만든 거짓 PRESENT는 섹션을
 * 영원히 화면에 남겨 목록의 신뢰를 깎으므로, 확신 없는 섹션(`CSS reset` —
 * 부재가 위험인 역방향 논리라 양성 신호가 없다)은 사전에 없는 채로 둔다.
 */
export const GUIDE_SECTION_SIGNATURES = [
  {
    key: 'breakpoints',
    heading: /breakpoint/i,
    patterns: [
      /\buseDisplay\s*\(/,
      /\$vuetify\.display\./,
      // 그리드/컨테이너의 반응형 prop — <v-col cols="12" md="6">
      /<v-(?:col|row|container)\b[^>]*\s(?:sm|md|lg|xl|xxl)=/,
      // 반응형 유틸리티 클래스 — d-md-none, justify-lg-end
      /\b(?:d|flex|justify|align|text|order|offset|hidden)-(?:sm|md|lg|xl|xxl)-/,
    ],
  },
  {
    key: 'typography',
    heading: /typography/i,
    patterns: [/\btext-(?:h[1-6]|subtitle-[12]|body-[12]|caption|overline|button)\b/],
  },
  {
    key: 'elevation',
    // MD3 재매핑은 6단계(0~5)를 넘는 사용에서만 체감된다 — 0~5는 그대로다.
    heading: /elevation/i,
    patterns: [/\belevation-(?:[6-9]|1[0-9]|2[0-4])\b/, /\belevation="(?:[6-9]|1[0-9]|2[0-4])"/],
  },
];

/**
 * 시그니처 사전과 매칭되는 가이드 섹션의 소스 실측.
 *
 * matchTemplateUsage와 같은 파일 순회·같은 주석 블랭킹을 쓰고, 반환도 같은
 * 모양({heading: {present, evidence}})이다 — splitSectionsByUsage가 이 결과를
 * 템플릿 축에 합류시키므로(l6-prompt까지 기존 배관 그대로) 별도 필드가 없다.
 */
export function matchGuideSignatures(projectPath, headings) {
  const wanted = [...new Set((headings ?? []).map(String).filter(Boolean))];
  const entries = wanted
    .map((heading) => ({ heading, signature: GUIDE_SECTION_SIGNATURES.find((entry) => entry.heading.test(heading)) }))
    .filter((entry) => entry.signature);
  const usage = Object.fromEntries(entries.map(({ heading }) => [heading, { present: false, evidence: [] }]));
  if (!entries.length) return { usage, scannedFiles: 0 };

  const files = discoverSourceFiles(projectPath);
  for (const filePath of files) {
    const relativePath = normalize(relative(projectPath, filePath));
    const text = blankComments(readFileSync(filePath, 'utf8'));
    for (const { heading, signature } of entries) {
      const matched = signature.patterns.find((regex) => regex.test(text));
      if (!matched) continue;
      const entry = usage[heading];
      entry.present = true;
      if (entry.evidence.length < 5) {
        const lines = text.split('\n');
        const index = lines.findIndex((line) => matched.test(line));
        entry.evidence.push({
          term: `signature:${signature.key}`,
          file: relativePath,
          line: index >= 0 ? index + 1 : 1,
          excerpt: (index >= 0 ? lines[index] : '').trim().slice(0, 160),
        });
      }
    }
  }

  return { usage, scannedFiles: files.length };
}

function buildRegexes(name) {
  const symbol = escapeRegex(name);
  const kebab = toKebab(name);
  return [
    // <v-select ...> — auto-imported template usage, the common case in Vue.
    new RegExp(`<\\s*${escapeRegex(kebab)}(?:\\s|>|/)`, 'i'),
    // VSelect — direct import or explicit registration.
    new RegExp(`(^|[^A-Za-z0-9_$-])${symbol}([^A-Za-z0-9_$-]|$)`),
  ];
}

function toKebab(name) {
  /*
   * Both boundary rules are required. Lowercase→uppercase alone misses an
   * uppercase RUN: `VSelect` has no lowercase before the `S`, so it became
   * `vselect` and the template regex never matched `<v-select>` — V-prefixed
   * components silently lost their template-tag evidence. The second rule
   * splits the run before its last capital (`VSe` → `V-Se`).
   */
  return String(name)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalize(path) {
  return path.replace(/\\/g, '/');
}

/**
 * Usage verdict per change item, from its parser `scope`, BEFORE L4 runs.
 *
 * Three verdicts, and the difference is load-bearing:
 *   USED          the scope names a searchable symbol and the project uses it
 *   UNUSED        searchable, and the project shows no trace of it
 *   UNDETERMINED  the scope cannot be searched — no scope at all, or a bare
 *                 lowercase word (`validation`, `layout`) that would match
 *                 everywhere and prove nothing
 *
 * UNDETERMINED is NOT "cannot analyze": L4 classification only needs the
 * changelog text and proceeds regardless. The verdict only says whether
 * project-usage evidence exists to inform SELECTION priority. Filtering
 * UNDETERMINED items out would silently drop config/build-wide changes,
 * which is exactly the mistake the migration filter's `unknown` bucket
 * exists to prevent.
 *
 * A scope can name several components (`VSelect/VCombobox`); one used member
 * makes the item USED — the change touches something the project has.
 */
export function prescanScopeUsage(projectPath, items) {
  const tokensByItem = new Map();
  const allTokens = new Set();
  const signatureByItem = new Map();
  const allSignatures = new Set();

  for (const item of items ?? []) {
    const tokens = searchableScopeTokens(item.scope);
    tokensByItem.set(item.itemId, tokens);
    for (const token of tokens) allTokens.add(token);
    // 심볼 토큰이 없을 때만 시그니처로 판정한다 — 토큰이 있으면 그쪽이
    // 더 구체적인 증거다.
    if (!tokens.length) {
      const key = signatureKeyOf(item.scope);
      if (key) {
        signatureByItem.set(item.itemId, key);
        allSignatures.add(key);
      }
    }
  }

  /*
   * 타입 전용 scope는 파일 내용이 아니라 프로젝트 프로파일이 판정한다:
   * 타입 검사 파이프라인이 없는 프로젝트에는 타입 선언 변경의 도달 경로가
   * 없다. 프로파일을 못 읽으면(null) 강등하지 않는다 — 모름은 JS가 아니다.
   */
  const typeScopeItems = (items ?? []).filter(
    (item) => !(tokensByItem.get(item.itemId) ?? []).length && TYPE_ONLY_SCOPES.has(normalizeScope(item.scope)),
  );
  const profile = typeScopeItems.length ? detectProjectProfile(projectPath) : null;
  const demoteTypeScopes = Boolean(typeScopeItems.length && profile && !profile.hasTypePipeline);

  const { scannedFiles, usage, signatureUsage } = matchComponentUsage(
    projectPath,
    [...allTokens],
    [...allSignatures],
  );

  const byItemId = {};
  const summary = { USED: 0, UNUSED: 0, UNDETERMINED: 0 };
  for (const item of items ?? []) {
    const tokens = tokensByItem.get(item.itemId) ?? [];
    let verdict = 'UNDETERMINED';
    let reason = item.scope ? 'GENERIC_SCOPE' : 'NO_SCOPE';
    let fileCount = 0;
    let files = [];
    const usedTokens = tokens.filter((token) => (usage[token]?.fileCount ?? 0) > 0);

    if (tokens.length) {
      verdict = usedTokens.length ? 'USED' : 'UNUSED';
      reason = null;
      fileCount = usedTokens.reduce((total, token) => total + usage[token].fileCount, 0);
      files = [...new Set(usedTokens.flatMap((token) => usage[token].files))].slice(0, 5);
    } else if (signatureByItem.has(item.itemId)) {
      const hit = signatureUsage[signatureByItem.get(item.itemId)];
      verdict = hit.fileCount > 0 ? 'USED' : 'UNUSED';
      reason = 'SIGNATURE';
      fileCount = hit.fileCount;
      files = hit.files;
    } else if (demoteTypeScopes && TYPE_ONLY_SCOPES.has(normalizeScope(item.scope))) {
      verdict = 'UNUSED';
      reason = 'NO_TYPE_PIPELINE';
    }

    summary[verdict] += 1;
    byItemId[item.itemId] = { verdict, reason, scope: item.scope ?? null, searchedTokens: tokens, usedTokens, fileCount, files };
  }

  return { scannedFiles, summary, byItemId };
}

function signatureKeyOf(scope) {
  const key = normalizeScope(scope);
  return Object.hasOwn(SCOPE_SIGNATURES, key) ? key : null;
}

function normalizeScope(scope) {
  return String(scope ?? '').trim().toLowerCase();
}

// 타입 선언에만 존재하는 변경의 scope들 — 릴리즈 노트 관례(vite·rollup류의
// `types:` 섹션/스코프)에서 온다. 일반어 `type`은 런타임 의미(콘텐츠 타입 등)로
// 도 쓰여 여기 넣지 않는다.
const TYPE_ONLY_SCOPES = new Set(['types', 'typescript', 'dts', 'type-only']);

/**
 * Which parts of a scope are worth searching for.
 *
 * Searchable means "distinctive enough that a hit is evidence": an
 * inner-capital symbol (VSelect, createRouter, RouterLink). Bare lowercase
 * words are real scopes but match ordinary prose and code everywhere, so a
 * hit proves nothing — the same rule the migration-doc heading extractor
 * applies, for the same reason.
 */
export function searchableScopeTokens(scope) {
  return String(scope ?? '')
    .split(/[/,+&\s]+/)
    .map((token) => token.trim())
    .filter((token) => /^[A-Za-z][A-Za-z0-9]*$/.test(token) && /[A-Z]/.test(token) && token.length >= 3);
}
