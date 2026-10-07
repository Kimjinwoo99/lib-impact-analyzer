/**
 * Config-key usage — does this project actually set the option a guide section
 * is about?
 *
 * The component filter (`component-usage.js`) answers that question for things
 * with names you can search for in source: `VSelect`, `<router-link>`,
 * `createRouter`. A build tool's guide is not written that way. Measured on
 * vite's guide at the three major boundaries this project's fixture crosses,
 * 18 of 21 sections name no component at all — they name options:
 * `build.target`, `css.preprocessorOptions.scss.api`,
 * `build.rollupOptions.output.manualChunks`. Those sections landed in the
 * `unknown` bucket and never reached the judgment step, so every config-shaped
 * finding had to come from the changelog by luck.
 *
 * TWO ANSWERS, BOTH USEFUL
 * Unlike component usage — where "not used" means "drop the section" — both
 * outcomes are evidence here:
 *   PRESENT  the project sets this key, at a named file and line → act on it
 *   ABSENT   the project does not set it, so the new default applies → that is
 *            precisely why `build.target` being unset makes the browser-target
 *            change a smoke test rather than a no-op
 * A section whose keys are all ABSENT is therefore annotated, not discarded.
 *
 * WHAT THIS CANNOT DO
 * It reads config files as text, not as evaluated configuration. A key set
 * through a spread, a helper function, or an imported preset is invisible.
 * Absence is reported as "not found in these files", never as "not set".
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';

/*
 * What a dotted token ENDS with tells you it is a filename or a hostname:
 * `migration.html`, `index.md`, `vite.dev`, `rolldown.rs`, `v6.vite.dev`.
 *
 * Only the last segment is tested, and that is load-bearing. Testing every
 * segment looked safer and silently deleted the most important key in the
 * whole guide: `css.preprocessorOptions.scss.api` was thrown away because
 * `css` and `scss` are also file extensions — `css`, `scss`, `sass`, `json`
 * and `ts` are all real vite config keys in non-final position.
 */
const NON_CONFIG_LAST = /^(com|org|net|io|dev|app|rs|sh|html?|md|mdx|js|mjs|cjs|ts|tsx|jsx|vue|png|jpe?g|svg|yml|yaml|lock|txt|xml|toml|_+)$/i;

/*
 * Dotted things that are not options. `import.meta.url` is the one that
 * actually showed up — vite's v8 guide discusses it, the fixture's config
 * contains it, and it was reported as a matched config key. The rest are the
 * same category: language and runtime globals whose properties are never
 * configuration.
 */
const NON_CONFIG_ROOT = /^(import|process|globalThis|window|document|module|exports|require|console|self|this|node|npm|yarn|pnpm)$/;

/*
 * 슬롯 프로퍼티 루트 — `item.title`·`internalItem.raw`는 템플릿 슬롯의 프로퍼티
 * 접근이지 옵션 경로가 아니다. 이것이 config 키로 새면 설정 파일 스캔이 당연한
 * ABSENT를 만들고, 그 ABSENT가 판정 프롬프트에 "코드에 없음"이라는 **거짓 부정
 * 증거**로 실린다 — vuetify 4의 #selection 슬롯 개명(item→internalItem)이 실코드
 * (`{{ item.title }}`)에 있는데도 NOT_AFFECTED로 접힌 실측 오판(2026-08-22,
 * 정밀도-검증대장 §F)의 원인. 이 루트들은 템플릿 축(extractTemplateTerms →
 * matchTemplateUsage)이 소스 파일에서 따로 확인한다.
 */
const TEMPLATE_TERM_ROOT = /^(item|internalItem|props|slotProps)$/;

/*
 * `json` cannot go in NON_CONFIG_LAST — `json.stringify` is a real vite
 * option, and the guide section about its changed default is one of the
 * things this whole mechanism exists to deliver. So the manifest filenames
 * that end in `.json` are excluded by name instead.
 */
const CONFIG_FILENAME_TOKEN = /^(package|package-lock|tsconfig|jsconfig|composer|manifest|deno)\.json$/i;

const CONFIG_PATH = /\b[a-z][A-Za-z0-9]*(?:\.[a-zA-Z_$][A-Za-z0-9_$]*)+/g;

/**
 * Dotted option paths mentioned in a piece of guide text.
 *
 * Deliberately requires a dot: a bare `target` or `build` is a word, and this
 * is the same rule the heading extractor applies to bare lowercase names —
 * a hit would prove nothing. The dot is what makes the token an option path.
 */
export function extractConfigKeys(text) {
  const found = new Set();
  for (const match of String(text ?? '').matchAll(CONFIG_PATH)) {
    const key = match[0];
    const segments = key.split('.');
    if (segments.length < 2) continue;
    // `e.g` and `i.e` are the abbreviations, not option paths.
    if (segments[0].length < 2) continue;
    if (NON_CONFIG_ROOT.test(segments[0])) continue;
    if (TEMPLATE_TERM_ROOT.test(segments[0])) continue;
    if (NON_CONFIG_LAST.test(segments[segments.length - 1])) continue;
    if (CONFIG_FILENAME_TOKEN.test(key)) continue;
    // `1.2.3`, `v6.0.0` — versions, not paths.
    if (segments.some((segment) => /^\d+$/.test(segment) || /^_+$/.test(segment))) continue;
    found.add(key);
  }
  return [...found];
}

/**
 * 가이드 텍스트에서 슬롯 프로퍼티 접근 토큰만 뽑는다 — extractConfigKeys가
 * 옵션 경로에서 걸러낸 바로 그 부분집합. 두 추출이 같은 정규식을 공유하고
 * 루트로만 갈리므로, 한 토큰이 두 축에 동시에 실리는 일은 없다.
 */
export function extractTemplateTerms(text) {
  const value = String(text ?? '');
  const found = new Set();
  for (const match of value.matchAll(CONFIG_PATH)) {
    const term = match[0];
    const segments = term.split('.');
    if (segments.length < 2) continue;
    if (!TEMPLATE_TERM_ROOT.test(segments[0])) continue;
    /*
     * 루트+첫 프로퍼티로 절단한다 — `item.raw.name`이 아니라 `item.raw`.
     *
     * 가이드 예제의 세 번째 세그먼트(`name`)는 예제 데이터의 필드명이지 개명되는
     * API 표면이 아니다. 실코드는 같은 자리에 자기 데이터 필드를 쓴다 —
     * 실제 프로젝트 실측(2026-08-24)에서 `item.raw.<field>` 2곳이 `item.raw.name` 정확일치
     * 검색에 빗나가 TypeError성 누락 2건(FN)이 됐다. 개명 대상은 `item.raw`까지고,
     * 접두 매치가 전체 매치를 포함하므로 절단이 히트를 잃는 방향은 없다.
     */
    const truncated = segments.slice(0, 2);
    if (NON_CONFIG_LAST.test(truncated[1])) continue;
    if (truncated.some((segment) => /^\d+$/.test(segment) || /^_+$/.test(segment))) continue;
    found.add(truncated.join('.'));
  }

  /*
   * 알파 채널을 기대하는 CSS 함수 + 테마 커스텀 프로퍼티의 복합 토큰 —
   * `rgba(var(--v-theme-color), 0.8)` 류. vuetify 4의 Themes 절이 "rgb(...)는
   * 그대로, rgba(...)는 color-mix로"라고 갈라 말하므로 **rgba 결합만** 파괴
   * 신호다(rgb 결합을 뽑으면 정상 사용 전부가 PRESENT로 오염된다).
   *
   * 커스텀 프로퍼티는 마지막 세그먼트를 잘라 계열 접두로 만든다 —
   * 가이드는 `--v-theme-color`(예제 색명)를 쓰지만 실코드는
   * `--v-theme-on-background`처럼 자기 색을 쓴다. 실제 프로젝트 실측(2026-08-24)에서
   * vertical-nav.vue:332가 이 이유로 누락됐다(FN).
   */
  for (const match of value.matchAll(/rgba\(\s*var\(\s*(--[a-z][a-z0-9]*(?:-[a-z0-9]+)+)/g)) {
    const property = match[1];
    const family = property.replace(/-[a-z0-9]+$/, '');
    // `--x` 한 세그먼트짜리는 계열이 못 된다 — 전체 이름 그대로 쓴다.
    found.add(`rgba(var(${family.length > 2 ? `${family}-` : property}`);
  }

  /*
   * 슬롯 프로퍼티 외의 "사용 여부가 소스 grep으로 결정되는" 토큰들 —
   * 실측(vuetify 39건 스모크 중 ~10건)에서 verify가 "…쓰는지 확인"으로
   * 사람에게 넘긴 질문이 전부 이 부류였다. 어휘가 아니라 형태로 뽑으므로
   * 라이브러리 무관:
   *   Sass 변수     $text-field-details-padding-inline (대시 필수 — $x는 일반어)
   *   디렉티브/태그  v-expand-transition
   *   바인딩 prop    :rules, :to
   *   kebab prop     `fill-height` — 백틱 인용부만: 맨몸 kebab은 일반 CSS
   *                  속성(text-transform 등)과 구분이 안 된다
   */
  for (const match of value.matchAll(/\$[a-z][a-z0-9]*(?:-[a-z0-9]+)+/g)) found.add(match[0]);
  for (const match of value.matchAll(/\bv-[a-z][a-z0-9]*(?:-[a-z0-9]+)+\b/g)) found.add(match[0]);
  for (const match of value.matchAll(/(?<![\w"'`]):[a-z][a-z0-9-]{2,}\b/g)) found.add(match[0]);
  for (const match of value.matchAll(/`([a-z][a-z0-9]*(?:-[a-z0-9]+)+)`/g)) found.add(match[1]);

  return [...found].slice(0, 8);
}

/**
 * 섹션의 템플릿 축 판정 — judgeSectionConfig와 같은 모양(NO_TERMS/PRESENT/ABSENT).
 * PRESENT의 evidence는 소스 파일의 file·line이므로 판정이 수정 위치로 그대로 쓴다.
 */
export function judgeSectionTemplate(section, usage) {
  const terms = section?.templateTerms ?? [];
  if (!terms.length) return { verdict: 'NO_TERMS', presentTerms: [], absentTerms: [], evidence: [] };

  const presentTerms = terms.filter((term) => usage?.[term]?.present);
  const absentTerms = terms.filter((term) => !usage?.[term]?.present);
  return {
    verdict: presentTerms.length ? 'PRESENT' : 'ABSENT',
    presentTerms,
    absentTerms,
    evidence: presentTerms.flatMap((term) => (usage[term]?.evidence ?? []).map((item) => ({ term, ...item }))).slice(0, 6),
  };
}

/*
 * Files that carry configuration. Kept to a recognised set rather than "every
 * source file": inside this corpus even a plain word like `target` sitting in
 * property position is evidence, which is the whole reason the generic-word
 * rule can be relaxed here.
 */
const CONFIG_FILE = /^(?:.*\.config\.(?:js|ts|mjs|cjs)|package\.json|tsconfig(?:\..+)?\.json|jsconfig\.json|\.browserslistrc|postcss\.config\..+|\.postcssrc(?:\..+)?|babel\.config\..+|\.babelrc(?:\..+)?)$/;

const CONFIG_SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.nuxt', '.vite', '.turbo', 'out']);

/**
 * Config files at the project root and one level below it.
 *
 * One level covers the monorepo package that holds its own vite.config; going
 * deeper starts reading fixtures and example apps, whose settings are not this
 * project's settings.
 */
export function discoverConfigFiles(projectPath) {
  const root = resolve(projectPath);
  if (!existsSync(root)) return [];
  const files = [];

  const collect = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (CONFIG_FILE.test(entry.name)) files.push(resolve(directory, entry.name));
    }
  };

  collect(root);
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || CONFIG_SKIP_DIRS.has(entry.name)) continue;
    collect(resolve(root, entry.name));
  }

  return files.sort();
}

/**
 * Where a dotted key's segments appear, in order, as property names.
 *
 * `css.preprocessorOptions.scss.api` is never written that way in a config
 * file — it is nested object literals. So each segment is looked for in
 * property position (`scss:` or `.scss`), and they must occur in the document
 * order the path declares. Requiring the chain is what keeps `server.target`
 * (a proxy option) from answering for `build.target`.
 *
 * The line of the LAST segment is reported: that is the line someone has to
 * open to act on the finding.
 */
function findKeyChain(text, key) {
  const segments = key.split('.');
  const lines = text.split(/\r?\n/);

  // The whole path written out literally — comments, docs, and JSON pointers.
  const literal = new RegExp(`(^|[^A-Za-z0-9_$.])${escapeRegex(key)}([^A-Za-z0-9_$]|$)`);
  for (let index = 0; index < lines.length; index += 1) {
    if (literal.test(lines[index])) return { line: index + 1, matched: key, form: 'LITERAL', valueForm: null };
  }

  let cursor = 0;
  let lastLine = 0;
  let lastMatch = null;
  for (const segment of segments) {
    /*
     * Property position takes three forms, and the third is not optional:
     * `manualChunks: (id) => …`, `.manualChunks`, and the method shorthand
     * `manualChunks(id) { … }`, which is how the fixture's config — and
     * vite's own documentation — actually writes it. The punctuation is
     * captured so the last segment's branch (colon/paren vs. dot) can drive
     * `classifyValueForm` below — that distinction used to be discarded here.
     */
    const property = new RegExp(`(?:^|[^A-Za-z0-9_$])(?:["']?${escapeRegex(segment)}["']?\\s*([:(])|\\.${escapeRegex(segment)}\\b)`);
    let hit = -1;
    let match = null;
    for (let index = cursor; index < lines.length; index += 1) {
      const attempt = property.exec(lines[index]);
      if (attempt) { hit = index; match = attempt; break; }
    }
    if (hit === -1) return null;
    // Same line may hold several segments (`build: { target: 'es2020' }`), so
    // the cursor does not advance past it.
    cursor = hit;
    lastLine = hit;
    lastMatch = match;
  }
  return { line: lastLine + 1, matched: key, form: 'CHAIN', valueForm: classifyValueForm(lines[lastLine], lastMatch) };
}

/**
 * What shape the matched key's value takes, read from the text following the
 * match on the same line. This is the distinguishing fact `findKeyChain` used
 * to throw away: a guide note like "manualChunks now needs the object form"
 * cannot be judged from PRESENT/ABSENT alone (see golden #10).
 *
 * Heuristic and line-local on purpose, same tradeoff as the rest of this
 * file: a value that starts on the next line, or a variable reference, is
 * reported UNKNOWN rather than guessed — a wrong guess here is worse than an
 * honest gap.
 */
function classifyValueForm(line, match) {
  if (!match) return null;
  const punctuation = match[1];
  if (punctuation === '(') return 'FUNCTION'; // method shorthand: `key(args) {`
  if (punctuation === undefined) return 'REFERENCE'; // dot-access chain link: `.key`

  const after = line.slice(match.index + match[0].length).replace(/^\s*/, '');
  if (!after) return 'UNKNOWN';
  if (/^(async\s+)?function\b/.test(after)) return 'FUNCTION';
  if (/^\(?[\w\s,]*\)?\s*=>/.test(after)) return 'FUNCTION';
  if (after.startsWith('{')) return 'OBJECT';
  if (after.startsWith('[')) return 'ARRAY';
  if (/^["'`]/.test(after)) return 'STRING';
  if (/^(true|false|null|undefined\b|-?\d)/.test(after)) return 'PRIMITIVE';
  return 'UNKNOWN';
}

/**
 * @param projectPath  the analysed project's root
 * @param keys         dotted option paths, from `extractConfigKeys`
 * @returns { scannedFiles, files, usage } where usage maps a key to
 *          { present, evidence: [{ file, line, form, valueForm }] }
 */
export function matchConfigUsage(projectPath, keys) {
  const wanted = [...new Set((keys ?? []).map(String).filter(Boolean))];
  const usage = Object.fromEntries(wanted.map((key) => [key, { present: false, evidence: [] }]));
  if (!wanted.length) return { scannedFiles: 0, files: [], usage };

  const root = resolve(projectPath);
  const files = discoverConfigFiles(root);

  for (const filePath of files) {
    let text;
    try {
      if (statSync(filePath).size > 512 * 1024) continue;
      text = readFileSync(filePath, 'utf8');
    } catch {
      continue;
    }
    const code = stripComments(text);
    for (const key of wanted) {
      const hit = findKeyChain(code, key);
      if (!hit) continue;
      const entry = usage[key];
      entry.present = true;
      // A couple of paths is enough to act on; more is noise in a prompt.
      if (entry.evidence.length < 3) {
        entry.evidence.push({ file: normalize(relative(root, filePath)), line: hit.line, form: hit.form, valueForm: hit.valueForm });
      }
    }
  }

  return {
    scannedFiles: files.length,
    files: files.map((filePath) => normalize(relative(root, filePath))),
    usage,
  };
}

/**
 * A section's config verdict, given the project-wide key usage.
 *
 * NO_KEYS is not "irrelevant" — it means this section is not about options, so
 * the component filter's answer is the only one available.
 */
export function judgeSectionConfig(section, usage) {
  const keys = section?.configKeys ?? [];
  if (!keys.length) return { verdict: 'NO_KEYS', presentKeys: [], absentKeys: [], evidence: [] };

  const presentKeys = keys.filter((key) => usage?.[key]?.present);
  const absentKeys = keys.filter((key) => !usage?.[key]?.present);
  return {
    verdict: presentKeys.length ? 'PRESENT' : 'ABSENT',
    presentKeys,
    absentKeys,
    evidence: presentKeys.flatMap((key) => (usage[key]?.evidence ?? []).map((item) => ({ key, ...item }))).slice(0, 5),
  };
}

/**
 * Blanks comments while PRESERVING newlines, so reported line numbers still
 * point at real lines. Duplicated from `source-matcher.js` rather than
 * imported — same tiny heuristic, independent file-scoped collectors.
 *
 * Matching against raw text let a comment mentioning a key's old syntax
 * (`// manualChunks: {}`) count as PRESENT with a wrong `valueForm`, which is
 * more dangerous than the pre-existing gap this file already disclosed: a
 * confident wrong shape beats an honest ABSENT.
 */
function stripComments(text) {
  return String(text)
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/<!--[\s\S]*?-->/g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalize(path) {
  return path.replace(/\\/g, '/');
}
