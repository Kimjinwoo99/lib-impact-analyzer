/**
 * Package reference collector — "이 패키지를 프로젝트 어디서 쓰는가", answered
 * deterministically for the packages that are about to become `chain:`/
 * `companion:` judgment units (peerAudit.blocked rows + companion rows).
 *
 * This is the E1 collector from l6-deterministic-evidence-design.md §5. Its
 * output feeds `chain:*`/`companion:*` units' `references` field directly —
 * L6 no longer needs Grep to answer "where is this plugin actually wired in".
 * Measured motivation: DEAD_END judgments for vite-plugin-vue-layouts had to
 * cite vite.config.js, navigation.js, and env.d.ts by Agent grep every run;
 * one run (Round 3) missed env.d.ts three times in a row because ambient
 * `.d.ts` files never entered the tsconfig-centric search the Agent ran.
 *
 * Five reference kinds, all generic (no package name hardcoded in the
 * detection rules — only the candidate package names themselves, supplied
 * by the caller, appear in the generated patterns):
 *
 *   import              `import x from '{pkg}'` / `require('{pkg}')` /
 *                        subpath imports (`'{pkg}/client'`)
 *   type-reference       `/// <reference types="{pkg}...">` in a `.d.ts`
 *                        file, or `{pkg}...` inside tsconfig's `types` array
 *   config-registration  the ANALYZED package's own config file(s) load this
 *                        candidate — upgrades companion-audit's boolean
 *                        `referencedPackages()` check to file:line
 *   virtual-module       the candidate's OWN type declarations
 *                        (node_modules/{pkg}/**\/*.d.ts) name virtual
 *                        modules (`declare module "virtual:x"`); the project
 *                        importing that specifier is real usage the
 *                        candidate's own package name never appears in
 *   bare-symbol          auto-import 플러그인이 전역 노출한 심볼을 import 없이
 *                        쓰는 사용 — 생성된 선언 파일(`auto-imports.d.ts` 등)의
 *                        심볼→모듈 매핑을 읽어 그 심볼을 소스에서 찾는다
 *   component-tag        전역 등록된 컴포넌트를 import 없이 태그로 쓰는 사용.
 *                        컴포넌트 목록의 출처는 둘이다 — 생성된 `components.d.ts`의
 *                        GlobalComponents 매핑(unplugin-vue-components류)과,
 *                        패키지 자신의 타입 선언(`vite-plugin-vuetify`처럼 선언
 *                        파일을 남기지 않고 빌드 시 import를 주입하는 플러그인용)
 *   manifest             package.json dependencies/devDependencies entry
 *
 * WHAT THIS CANNOT DO: it reads text, not an evaluated module graph — a
 * specifier built at runtime or re-exported through a barrel file is
 * invisible, same limitation `source-matcher.js` already documents.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, relative, resolve } from 'node:path';

import { discoverConfigFiles } from './config-usage.js';
import { selectToolConfigFiles } from './companion-audit.js';
import { discoverSourceFiles } from '../source-match/source-matcher.js';
import { blankComments } from '../source-match/component-usage.js';

// Evidence cap per candidate package — §6 of the design doc: "유닛당 evidence
// 상한(파일 4개·excerpt 1줄)을 두고 초과분은 개수만 표기".
const MAX_REFERENCES_PER_PACKAGE = 4;

// A reference kind found earlier in an upgrade plan is usually the one worth
// showing first: knowing HOW something is wired in (import/registration) is
// more actionable than knowing it merely appears in a manifest.
const KIND_RANK = { 'type-reference': 0, 'config-registration': 1, import: 2, 'bare-symbol': 3, 'component-tag': 4, 'virtual-module': 5, manifest: 6 };

const NODE_MODULES_SKIP = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.nuxt', '.vite', '.turbo', 'out']);

/**
 * @param options.projectPath   the analyzed project's root
 * @param options.packageName   the package being upgraded (config-registration
 *                               looks inside ITS OWN config files)
 * @param options.candidates    package names to find references for — the
 *                               peerAudit.blocked + companion rows about to
 *                               become chain:/companion: units
 * @returns { [packageName]: [{file, line, kind, excerpt}] } — candidates with
 *          no reference anywhere get an empty array, never omitted (absence
 *          is itself a fact the prompt can act on: DEAD_END with zero
 *          references is a package that is declared but never wired in).
 */
export function collectPackageReferences({ projectPath, packageName, candidates, maxPerPackage = MAX_REFERENCES_PER_PACKAGE }) {
  const root = resolveRequiredPath(projectPath);
  const names = [...new Set((candidates ?? []).filter(Boolean))];
  const references = new Map(names.map((name) => [name, []]));
  if (!names.length) return {};

  const sourceFiles = discoverSourceFiles(root);
  // `.d.ts` files end in `.ts` (path.extname keeps only the last segment),
  // so they are already part of `sourceFiles` — no separate walk needed for
  // the type-reference kind's `.d.ts` half.
  const sourceTexts = sourceFiles.map((filePath) => {
    const text = safeRead(filePath);
    return {
      filePath,
      relPath: normalizeRelativePath(relative(root, filePath)),
      text,
      // 주석·예시 문자열을 지운 사본 — 심볼·태그 검색이 쓴다(줄 번호 보존).
      code: blankLiterals(blankComments(text)),
    };
  });

  for (const { relPath, text } of sourceTexts) {
    for (const name of names) {
      pushImportReferences(text, relPath, name, references.get(name));
      pushTripleSlashReference(text, relPath, name, references.get(name));
    }
  }

  collectTsconfigTypeReferences(root, names, references);
  collectConfigRegistrations(root, packageName, names, references);
  collectManifestReferences(root, names, references);
  for (const name of names) collectVirtualModuleReferences(root, name, sourceTexts, references.get(name));
  collectBareSymbolReferences(names, sourceTexts, references);
  collectComponentTagReferences(root, names, sourceTexts, references);

  const result = {};
  for (const [name, refs] of references) result[name] = dedupeAndCap(refs, maxPerPackage);
  return result;
}

/** `import x from '{pkg}'` / `import '{pkg}/sub'` / `require('{pkg}')`, one match per line. */
function pushImportReferences(text, relPath, packageName, sink) {
  const pattern = importRegex(packageName);
  eachLine(text, (line, lineNumber) => {
    pattern.lastIndex = 0;
    if (pattern.test(line)) {
      sink.push({ file: relPath, line: lineNumber, kind: 'import', excerpt: excerptOf(line) });
    }
  });
}

/** `/// <reference types="{pkg}" />` or `.../{pkg}/client` subpath form. */
function pushTripleSlashReference(text, relPath, packageName, sink) {
  const pattern = new RegExp(`///\\s*<reference\\s+types=["']${escapeRegex(packageName)}(?:/[^"']*)?["']`);
  eachLine(text, (line, lineNumber) => {
    if (pattern.test(line)) {
      sink.push({ file: relPath, line: lineNumber, kind: 'type-reference', excerpt: excerptOf(line) });
    }
  });
}

/**
 * tsconfig*.json's `compilerOptions.types` array — a second, JSON-shaped home
 * for the same type-reference question. Round 6 inventory: `"types":
 * ["vite/client"]` lives here, not in a `.d.ts` triple-slash comment.
 */
function collectTsconfigTypeReferences(root, names, references) {
  for (const filePath of discoverTsconfigFiles(root)) {
    const relPath = normalizeRelativePath(relative(root, filePath));
    const text = safeRead(filePath);
    if (!text) continue;
    for (const name of names) {
      const pattern = new RegExp(`"${escapeRegex(name)}(?:/[^"']*)?"`);
      eachLine(text, (line, lineNumber) => {
        if (pattern.test(line)) {
          references.get(name).push({ file: relPath, line: lineNumber, kind: 'type-reference', excerpt: excerptOf(line) });
        }
      });
    }
  }
}

function discoverTsconfigFiles(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^tsconfig(\..+)?\.json$/i.test(entry.name))
    .map((entry) => resolve(root, entry.name));
}

/**
 * The analyzed package's OWN config file(s) — upgrades companion-audit's
 * `referencedPackages()` from a boolean ("this dependency is a companion")
 * to file:line, reusing the exact same extraction rule so the two stay
 * consistent by construction.
 */
function collectConfigRegistrations(root, packageName, names, references) {
  if (!packageName) return;
  const allFiles = discoverConfigFiles(root).map((filePath) => normalizeRelativePath(relative(root, filePath)));
  const toolFiles = selectToolConfigFiles(allFiles, packageName);
  for (const relPath of toolFiles) {
    const text = safeRead(resolve(root, relPath));
    if (!text) continue;
    const specifiers = extractRegisteredSpecifiers(text);
    for (const name of names) {
      if (!specifiers.has(name)) continue;
      const pattern = specifierLineRegex(name);
      eachLine(text, (line, lineNumber) => {
        if (pattern.test(line)) {
          references.get(name).push({ file: relPath, line: lineNumber, kind: 'config-registration', excerpt: excerptOf(line) });
        }
      });
    }
  }
}

/**
 * Same rule as companion-audit.js's `referencedPackages` (kept independent on
 * purpose — that module answers a discovery YES/NO for the companion audit;
 * this one needs the file text again to find the LINE, and duplicating the
 * five-line extraction is cheaper than threading match positions through a
 * module whose existing contract is "a Set of names").
 */
function extractRegisteredSpecifiers(configText) {
  const specifiers = [
    ...configText.matchAll(/(?:from\s*|import\s*\(\s*|require\s*\(\s*)["']([^"']+)["']/g),
    ...configText.matchAll(/import\s+["']([^"']+)["']/g),
  ].map((match) => match[1]);
  const names = specifiers.length
    ? specifiers.map(packageOfSpecifier)
    : [...configText.matchAll(/["']([^"']+)["']/g)].map((match) => packageOfSpecifier(match[1]));
  return new Set(names);
}

function specifierLineRegex(packageName) {
  return new RegExp(`["']${escapeRegex(packageName)}(?:/[^"']*)?["']`);
}

function packageOfSpecifier(specifier) {
  const parts = String(specifier).split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

/** package.json's dependencies/devDependencies declaration line. */
function collectManifestReferences(root, names, references) {
  const manifestPath = resolve(root, 'package.json');
  const text = safeRead(manifestPath);
  if (!text) return;
  for (const name of names) {
    const pattern = new RegExp(`^\\s*"${escapeRegex(name)}"\\s*:`);
    eachLine(text, (line, lineNumber) => {
      if (pattern.test(line)) {
        references.get(name).push({ file: 'package.json', line: lineNumber, kind: 'manifest', excerpt: excerptOf(line) });
      }
    });
  }
}

/**
 * The candidate's OWN type declarations name virtual modules it generates
 * (`declare module "virtual:x"`); a project importing that specifier is real
 * usage that the candidate's package name never appears in — the ONLY
 * deterministic path to `navigation.js`'s `import { setupLayouts } from
 * 'virtual:generated-layouts'` (golden #14 depends on exactly this).
 *
 * Reads `{projectPath}/node_modules/{pkg}/**\/*.d.ts` — the ONE targeted
 * exception to "never read node_modules": we already know which package we
 * are asking about, so this is a lookup, not a general-purpose scan.
 */
function collectVirtualModuleReferences(root, packageName, sourceTexts, sink) {
  const packageDir = resolve(root, 'node_modules', ...packageName.split('/'));
  if (!existsSync(packageDir)) return;

  const specifiers = new Set();
  for (const filePath of walkDts(packageDir)) {
    const text = safeRead(filePath);
    if (!text) continue;
    for (const match of text.matchAll(/declare\s+module\s+["'](virtual:[^"']+)["']/g)) {
      specifiers.add(match[1]);
    }
  }
  if (!specifiers.size) return;

  for (const specifier of specifiers) {
    const pattern = new RegExp(`from\\s+["']${escapeRegex(specifier)}["']`);
    for (const { relPath, text } of sourceTexts) {
      eachLine(text, (line, lineNumber) => {
        if (pattern.test(line)) sink.push({ file: relPath, line: lineNumber, kind: 'virtual-module', excerpt: excerptOf(line) });
      });
    }
  }
}

/**
 * auto-import 플러그인이 전역 노출한 심볼의 사용처.
 *
 * `unplugin-auto-import`를 쓰는 프로젝트에서는 `ref`·`computed`·`useRouter` 같은
 * 심볼을 import 없이 쓴다. 그래서 import만 찾는 방식은 이 사용을 **전부 놓친다**.
 * 실측(실제 프로젝트, 2026-07-30)에서 `vue` 97파일·`vue-router` 68파일이 이 경로로
 * 누락됐다 — 누락 448건 중 165건이다.
 *
 * 매핑은 플러그인이 생성한 선언 파일에서 읽는다. **경로를 고정하지 않는다**:
 * 같은 플러그인을 쓰는 두 프로젝트에서 파일이 각각 루트와 `src/` 아래에
 * 있었고, 루트 고정 구현은 후자의 심볼을 통째로 놓쳤다.
 *
 * 심볼 하나가 여러 모듈에서 올 수 있으므로(`h`는 vue, `useRoute`는 vue-router)
 * 선언 파일이 명시한 모듈만 그 심볼의 출처로 인정한다 — 이름만 보고 추측하지
 * 않는다.
 */
function collectBareSymbolReferences(names, sourceTexts, references) {
  const symbolsByPackage = readAutoImportMap(sourceTexts, names);
  if (!symbolsByPackage.size) return;

  for (const [name, symbols] of symbolsByPackage) {
    const pattern = bareSymbolRegex(symbols);
    if (!pattern) continue;
    const importPattern = importRegex(name);
    for (const { relPath, text, code } of sourceTexts) {
      // 선언 파일 자체는 사용처가 아니다 — 매핑의 출처일 뿐이다.
      if (isGeneratedDeclaration(relPath, text)) continue;
      /*
       * 이 파일이 패키지를 import하고 있으면 그 사용은 import 축이 이미 센다.
       * 두 축은 배타적이다 — 겹쳐 세면 같은 파일이 두 번 계상되고, "import로는
       * 보이지 않는 사용"이라는 이 축의 의미가 사라진다.
       */
      importPattern.lastIndex = 0;
      if (importPattern.test(text)) continue;
      eachLine(code, (line, lineNumber) => {
        pattern.lastIndex = 0;
        const match = pattern.exec(line);
        if (!match) return;
        /*
         * 이 파일이 같은 이름을 직접 선언했다면 그 호출은 지역 정의를 가리킨다 —
         * JS 스코프 규칙상 지역 선언이 전역 노출을 가린다. 프로젝트가 자체 `watch()`
         * 를 정의한 파일이 vue 사용처로 잡히던 오검출을 막는다.
         */
        const symbol = match[0].replace(/\s*[(<]$/, '');
        if (declaresLocally(code, symbol)) return;
        references.get(name).push({ file: relPath, line: lineNumber, kind: 'bare-symbol', excerpt: excerptOf(line) });
      });
    }
  }
}
/** 생성된 선언 파일에서 `const X: typeof import('mod')['X']` 매핑을 읽는다. */
function readAutoImportMap(sourceTexts, names) {
  const wanted = new Set(names);
  const byPackage = new Map();
  for (const { relPath, text } of sourceTexts) {
    if (!text || !isGeneratedDeclaration(relPath, text)) continue;
    for (const match of text.matchAll(/const\s+([A-Za-z_$][\w$]*)\s*:\s*typeof\s+import\(\s*["']([^"']+)["']\s*\)/g)) {
      const [, symbol, moduleName] = match;
      const owner = packageOfSpecifier(moduleName);
      if (!owner || !wanted.has(owner)) continue;
      if (!byPackage.has(owner)) byPackage.set(owner, new Set());
      byPackage.get(owner).add(symbol);
    }
  }
  return byPackage;
}

/*
 * 호출·JSX 위치의 심볼만 센다 — `ref(` · `ref<T>(` 형태다. 식별자 단독 등장을
 * 세면 같은 이름의 지역 변수·프로퍼티(`this.ref`, `obj.computed`)까지 잡혀
 * 사용처가 부풀어 오른다. 앞의 `.`을 배제하는 것도 같은 이유다.
 */
/*
 * 문자열 리터럴을 공백으로 — 줄 단위, 길이·줄 수 보존.
 *
 * 주석을 지워도 문자열은 남는다. 안내 문구나 코드 생성 템플릿에 심볼 이름이
 * 적혀 있으면(`'computed( 을 쓰세요'`) 그것이 사용처로 잡힌다 — 실측으로 확인한
 * 오검출이다. 여러 줄 템플릿 리터럴은 줄 단위 처리로 완전히 지워지지 않지만,
 * 그 안의 심볼이 실제 호출인 경우가 대부분이라 과하게 지우지 않는 편을 택했다.
 */
function blankLiterals(text) {
  return String(text).replace(/'[^'\n]*'|"[^"\n]*"/g, (match) => ' '.repeat(match.length));
}
/**
 * 이 파일이 그 이름을 직접 선언했는가.
 *
 * 선언 형태는 넷이다 — `function x`·`const|let|var x`·`class x`, 그리고 다른
 * 모듈에서 같은 이름을 가져온 `import { x } from …`. 넷 중 하나라도 있으면 그
 * 파일의 `x()`는 전역 노출이 아니라 그 선언을 부르는 것이다.
 */
function declaresLocally(code, symbol) {
  const name = escapeRegex(symbol);
  const declared = new RegExp(`(?:^|[^\\w$.])(?:function|const|let|var|class)\\s+${name}(?![\\w$])`, 'm');
  if (declared.test(code)) return true;
  const imported = new RegExp(`import[^;\\n]*(?:^|[^\\w$])${name}(?![\\w$])[^;\\n]*from`, 'm');
  return imported.test(code);
}

function bareSymbolRegex(symbols) {
  const list = [...symbols].filter((symbol) => symbol.length > 1).map(escapeRegex);
  if (!list.length) return null;
  return new RegExp(`(?<![\\w$.])(?:${list.join('|')})\\s*[(<]`, 'g');
}

/**
 * 플러그인이 생성한 선언 파일인가 — **파일명이 아니라 내용으로** 판별한다.
 *
 * 생성 파일의 이름은 플러그인 설정에 달려 있다(`dts: 'src/foo.d.ts'`처럼 임의로
 * 정할 수 있다). 알려진 이름을 나열하면 그 목록에 없는 설정을 쓴 프로젝트에서
 * 이 축이 통째로 빈손이 된다 — 같은 이유로 이미 경로 고정을 버렸다.
 *
 * 판별 근거는 이 파일들이 공통으로 갖는 형태다: `.d.ts`이면서 심볼이나 컴포넌트를
 * `이름: typeof import('모듈')` 로 매핑한다. 사람이 손으로 쓰는 선언 파일에는
 * 이 형태가 거의 없다.
 */
function isGeneratedDeclaration(relPath, text) {
  if (!/\.d\.ts$/i.test(relPath)) return false;
  return /:\s*typeof\s+import\(/.test(text ?? '');
}

/**
 * 플러그인이 전역 등록한 컴포넌트의 태그 사용처.
 *
 * `unplugin-vue-components`류는 컴포넌트를 전역 등록해서, 프로젝트가
 * `<router-view />`처럼 import 없이 태그만으로 쓴다. import를 찾는 방식은 이 사용을
 * 전부 놓친다 — 실측(실제 프로젝트)에서 vue-router 누락 68건의 일부가 이 경로다.
 *
 * 목록은 플러그인이 생성한 `components.d.ts`의 `GlobalComponents`에서 읽는다
 * (`RouterLink: typeof import('vue-router')['RouterLink']`). node_modules를 뒤지지
 * 않으므로 의존성이 설치되지 않은 상태에서도 동작하고, 무엇이 실제로 등록됐는지를
 * 플러그인이 쓴 그대로 읽는다 — 패키지 export 전수를 훑어 추측하는 것보다 정확하다.
 */
function collectComponentTagReferences(root, names, sourceTexts, references) {
  for (const name of names) {
    /*
     * 컴포넌트 목록의 출처가 둘인 이유.
     *
     * `unplugin-vue-components`는 등록 목록을 `components.d.ts`에 써 둔다 —
     * 무엇이 등록됐는지 플러그인이 직접 밝힌 것이라 가장 정확하다.
     * 반면 `vite-plugin-vuetify`는 빌드 시 import를 주입하는 방식이라 선언 파일을
     * 남기지 않는다(실측 확인: sample-app의 components.d.ts에 vuetify 컴포넌트 0건).
     * 그 경우 패키지 자신의 타입 선언에서 컴포넌트를 읽는다.
     */
    const components = new Set([
      ...(readGlobalComponentMap(sourceTexts, [name]).get(name) ?? []),
      ...readPackageComponentNames(root, name),
    ]);
    if (!components.size) continue;

    const tagPattern = componentTagRegex([...components]);
    if (!tagPattern) continue;
    const importPattern = importRegex(name);
    for (const { relPath, text, code } of sourceTexts) {
      if (isGeneratedDeclaration(relPath, text)) continue;
      // import 축과 배타적이다 — bare-symbol과 같은 이유.
      importPattern.lastIndex = 0;
      if (importPattern.test(text)) continue;
      eachLine(code, (line, lineNumber) => {
        tagPattern.lastIndex = 0;
        if (!tagPattern.test(line)) return;
        references.get(name).push({ file: relPath, line: lineNumber, kind: 'component-tag', excerpt: excerptOf(line) });
      });
    }
  }
}

/**
 * 패키지 자신의 타입 선언에서 컴포넌트로 쓰일 수 있는 이름을 읽는다.
 *
 * `declare const VApp: {…}` 형태의 PascalCase 선언을 모은다(vuetify 3.6.10 실측:
 * 164개). 컴포넌트가 아닌 상수가 섞여도 무해하다 — 이 목록은 `<kebab-case` 태그
 * 검색에만 쓰이므로, 태그로 쓰이지 않는 이름은 어디에도 매치되지 않는다.
 *
 * `node_modules`를 읽는 두 번째 예외다(첫째는 virtual-module). 어느 패키지를
 * 묻는지 이미 알고 있으므로 스캔이 아니라 조회다.
 */
function readPackageComponentNames(root, packageName) {
  const packageDir = resolve(root, 'node_modules', ...packageName.split('/'));
  if (!existsSync(packageDir)) return [];

  const names = new Set();
  for (const filePath of walkPackageDts(packageDir)) {
    /*
     * safeRead의 512KB 상한을 쓰지 않는다 — 그 상한은 프로젝트 소스를 위한 것이고,
     * 배포된 타입 선언은 그보다 훨씬 크다(vuetify 3.6.10의 dist/vuetify.d.ts는 2.8MB
     * 한 파일에 컴포넌트 164개가 들어 있다). 상한을 그대로 쓰면 이 축이 조용히
     * 빈손이 된다 — 실측으로 확인한 실패다.
     */
    const text = readPackageDeclaration(filePath);
    if (!text) continue;
    for (const match of text.matchAll(/declare const ([A-Z][A-Za-z0-9]*)\s*:/g)) names.add(match[1]);
    for (const match of text.matchAll(/export declare const ([A-Z][A-Za-z0-9]*)\s*:/g)) names.add(match[1]);
  }
  return [...names];
}

/**
 * 컴포넌트 목록 하나를 정규식 하나로 — 파일마다 수백 번 test하지 않는다.
 *
 * **다단어 이름만 쓴다**(kebab에 하이픈이 생기는 것). 단어 하나짜리는 프로젝트가
 * 같은 이름의 컴포넌트를 갖고 있을 때 그것을 이 패키지의 사용으로 잘못 센다 —
 * vuetify 175개 중 `Tooltip`·`Resize`·`Scroll`·`Touch`·`Ripple`·`Mutate`·
 * `Intersect` 7개가 그런 이름이고, 프로젝트에 `<Tooltip>`이 있는 것은 흔하다.
 * 그 7개는 모두 컴포넌트가 아니라 디렉티브라 태그로 쓰이지도 않는다.
 */
function componentTagRegex(components) {
  const multiWord = components.filter((component) => toKebabTag(component).includes('-'));
  const tags = [...new Set(multiWord.map((component) => toKebabTag(component)))].map(escapeRegex);
  const pascals = multiWord.filter((component) => component.length > 2).map(escapeRegex);
  if (!tags.length && !pascals.length) return null;
  const parts = [];
  if (tags.length) parts.push(`(?:${tags.join('|')})`);
  if (pascals.length) parts.push(`(?:${pascals.join('|')})`);
  return new RegExp(`<\\s*(?:${parts.join('|')})(?:\\s|>|/)`, 'gi');
}

/** `components.d.ts`의 GlobalComponents에서 `이름: typeof import('mod')[...]` 매핑을 읽는다. */
function readGlobalComponentMap(sourceTexts, names) {
  const wanted = new Set(names);
  const byPackage = new Map();
  for (const { relPath, text } of sourceTexts) {
    if (!text || !isGeneratedDeclaration(relPath, text)) continue;
    for (const match of text.matchAll(/^\s*([A-Z][\w$]*)\s*:\s*typeof\s+import\(\s*["']([^"']+)["']\s*\)/gm)) {
      const [, component, moduleName] = match;
      const owner = packageOfSpecifier(moduleName);
      if (!owner || !wanted.has(owner)) continue;
      if (!byPackage.has(owner)) byPackage.set(owner, new Set());
      byPackage.get(owner).add(component);
    }
  }
  return byPackage;
}

/*
 * PascalCase → kebab. 대문자 연속(`VSelect`)에서도 경계를 찾아야 한다 —
 * 소문자→대문자 규칙만 쓰면 `VSelect`가 `vselect`가 되어 `<v-select>`를 놓친다.
 */
function toKebabTag(name) {
  return String(name)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

/*
 * 패키지 내부 전용 .d.ts 수집.
 *
 * walkDts는 프로젝트 소스 탐색용 스킵 목록(NODE_MODULES_SKIP)을 쓰는데, 그 목록에
 * `dist`가 들어 있다. 패키지 안에서 `dist`는 건너뛸 빌드 산출물이 아니라 배포된
 * 타입이 놓이는 자리다 — vuetify는 타입 전체가 `dist/vuetify.d.ts` 하나에 있어서,
 * 그 목록을 그대로 쓰면 컴포넌트를 하나도 읽지 못한다(실측으로 확인).
 */
/** 배포된 타입 선언 읽기 — 소스용 크기 상한(safeRead)을 적용하지 않는다. 상한은 8MB. */
function readPackageDeclaration(filePath) {
  try {
    if (statSync(filePath).size > 8 * 1024 * 1024) return '';
    return readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function walkPackageDts(directory, depth = 0, files = []) {
  if (depth > 6) return files;
  let entries;
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      // 중첩 node_modules만 건너뛴다 — 다른 패키지의 타입을 이 패키지 것으로 셀 수 없다.
      if (entry.name === 'node_modules') continue;
      walkPackageDts(resolve(directory, entry.name), depth + 1, files);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.d.ts')) files.push(resolve(directory, entry.name));
  }
  return files;
}
function walkDts(directory, depth = 0, files = []) {
  if (depth > 6) return files; // a plugin's own type tree is shallow; this is a runaway guard, not a real limit
  let entries;
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (NODE_MODULES_SKIP.has(entry.name)) continue;
      walkDts(resolve(directory, entry.name), depth + 1, files);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.d.ts')) files.push(resolve(directory, entry.name));
  }
  return files;
}

/** Highest-kind-rank first, then dedupe identical file:line, then cap. */
function dedupeAndCap(refs, cap = MAX_REFERENCES_PER_PACKAGE) {
  const byRank = (a, b) => (KIND_RANK[a.kind] ?? 9) - (KIND_RANK[b.kind] ?? 9);
  const sorted = [...refs].sort(byRank);
  const seen = new Set();
  const deduped = [];
  for (const ref of sorted) {
    const key = `${ref.file}:${ref.line}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(ref);
  }
  if (deduped.length <= cap) return deduped;

  /*
   * 상한을 채울 때 종류별로 최소 한 건을 먼저 확보한다.
   *
   * 순위대로 자르기만 하면 흔한 종류가 상한을 다 먹는다 — import가 4곳이면
   * bare-symbol(import 없이 쓰는 사용)이 통째로 사라져서, 판정이 「import로는
   * 보이지 않는 사용이 있다」는 사실을 받지 못한다. 그 사실이 이 축을 만든
   * 이유이므로 한 건은 반드시 남긴다.
   */
  const picked = [];
  const takenKinds = new Set();
  for (const ref of deduped) {
    if (takenKinds.has(ref.kind)) continue;
    takenKinds.add(ref.kind);
    picked.push(ref);
    if (picked.length >= cap) break;
  }
  const chosen = new Set(picked);
  for (const ref of deduped) {
    if (picked.length >= cap) break;
    if (chosen.has(ref)) continue;
    picked.push(ref);
  }
  return picked.sort(byRank);
}
function eachLine(text, visit) {
  const lines = String(text ?? '').split(/\r?\n/);
  lines.forEach((line, index) => visit(line, index + 1));
}

function excerptOf(line) {
  return line.trim().slice(0, 220);
}

function importRegex(packageName) {
  const escaped = escapeRegex(packageName);
  return new RegExp(
    `\\bfrom\\s+['"]${escaped}(?:/[^'"]*)?['"]|\\bimport\\s*\\(?\\s*['"]${escaped}(?:/[^'"]*)?['"]|\\brequire\\s*\\(\\s*['"]${escaped}(?:/[^'"]*)?['"]`,
  );
}

function safeRead(filePath) {
  try {
    if (statSync(filePath).size > 512 * 1024) return '';
    return readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeRelativePath(path) {
  return path.replace(/\\/g, '/');
}

function resolveRequiredPath(projectPath) {
  const root = resolve(String(projectPath ?? '').trim());
  if (!projectPath || !existsSync(root) || !statSync(root).isDirectory()) {
    throw new Error(`projectPath does not exist or is not a directory: ${projectPath}`);
  }
  return root;
}
