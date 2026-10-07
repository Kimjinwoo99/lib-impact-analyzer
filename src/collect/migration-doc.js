/**
 * Migration guide discovery and section parsing.
 *
 * Breaking changes are not where a release pipeline puts them. Measured across
 * six of this project's dependencies at their most recent major boundary:
 *
 *   릴리즈 노트 Breaking 섹션   0 / 4   (vuetify 9,339자에도 없음)
 *   커밋 `!:` 마커              vuetify 0/65 · axios 0/67 · vite 4/572
 *   저장소 마이그레이션 문서     vuetify 3 · axios 5 · vue-router 3 · pinia 7
 *
 * So the document in the repository is the only place they reliably live, and
 * it is reachable from the same blobless clone at no API cost.
 *
 * WHAT THIS CANNOT DO
 * Paths follow no convention — `MIGRATION_GUIDE.md` at the root, or
 * `packages/docs/src/pages/en/getting-started/upgrade-guide.md`. Discovery is
 * a search over the tag's file list, so it finds what is named recognizably
 * and misses what is not. `vue` keeps its migration guide on a separate site
 * entirely, outside any repository this can read.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { extractConfigKeys, extractTemplateTerms, judgeSectionConfig, judgeSectionTemplate } from './config-usage.js';

const run = promisify(execFile);
const GIT_TIMEOUT_MS = 30_000;

/**
 * "How to upgrade", anywhere in the path.
 *
 * The keyword is not always in the filename: vue-router keeps its guide at
 * `packages/docs/guide/migration/index.md` and `.../migration/v4-to-v5.md`,
 * where only the directory says so. Matching the filename alone reported that
 * repository as having no guide at all.
 */
const DOC_KEYWORD = /(upgrade|migration|migrating|breaking)/i;
const DOC_EXTENSION = /\.mdx?$/i;

// Localised copies of the same guide. Reading one is enough.
const TRANSLATED_PATH = /\/(ko|ja|zh|zh-cn|zh-CN|es|fr|de|pt|ru|it|tr|uk|vi|fa|id|nl|pl)\//;

export async function listMigrationDocs(repoPath, tag, options = {}) {
  const { stdout } = await git(repoPath, ['ls-tree', '-r', '--name-only', tag]);
  const files = stdout.split('\n').map((line) => line.trim()).filter(Boolean);

  return files
    .filter((file) => DOC_EXTENSION.test(file) && DOC_KEYWORD.test(file))
    .filter((file) => !TRANSLATED_PATH.test(file))
    .map((file) => ({ path: file, ...scoreDoc(file, options) }))
    .sort((left, right) => right.score - left.score);
}

const GENERAL_NAME = /^(upgrade[-_]?guide|migration[-_]?guide|migration|migrating|upgrading|upgrade)\.mdx?$/;

/**
 * Ranks candidates so the guide that covers this upgrade is read first.
 *
 * A repository holds several: pinia carries seven, including
 * `migration-0-0-7.md` for a jump nobody here is making. Ranking by shape
 * alone picked exactly that one for a 2 -> 4 upgrade, so a version-specific
 * guide now has to mention a major in the range to outrank anything.
 */
function scoreDoc(path, { targetMajor = null } = {}) {
  const name = path.split('/').pop().toLowerCase();
  const parts = path.toLowerCase().split('/');
  const depth = parts.length;

  // `.../migration/index.md` — the directory carries the meaning.
  const inGuideDirectory = /^(index|readme)\.mdx?$/.test(name)
    && parts.slice(0, -1).some((part) => /^(upgrade|migration|migrating)/.test(part));

  if (GENERAL_NAME.test(name) || inGuideDirectory) {
    return { score: 100 - depth, reason: 'GENERAL_GUIDE' };
  }

  const versions = name.match(/\d+/g);
  if (versions) {
    const relevant = targetMajor !== null && versions.includes(String(targetMajor));
    return relevant
      ? { score: 90 - depth, reason: 'VERSION_MATCH' }
      // Real, but for a different upgrade. Ranked below anything general so it
      // cannot win by being the only candidate of its shape.
      : { score: 5 - depth, reason: 'VERSION_MISMATCH' };
  }
  return { score: 20 - depth, reason: 'RELATED' };
}

export async function readMigrationDoc(repoPath, tag, path) {
  const { stdout } = await git(repoPath, ['show', `${tag}:${path}`]);
  return stdout;
}

/**
 * Splits the guide into its `###` sections.
 *
 * Section headings are the useful part: measured on vuetify's 18,208 character
 * guide, 12 of 19 headings name a component, which is exactly the key the
 * source matcher already searches by. Parsing the prose below them into
 * individual change items is not attempted — the formats vary too much for
 * that to be trustworthy.
 */
export function parseMigrationSections(text) {
  const source = String(text ?? '');
  /*
   * Heading depth is a house style, not a standard, and one guide uses both.
   *
   * The old rule took `###` and fell back to `##` only when there were none,
   * which silently discarded whatever lived at the other level. Measured on
   * vite's own guide at all three major boundaries: v7 has one `###` and six
   * `##`, so six sections vanished — including `Default Browser Target change`,
   * the only place `build.target`'s new default is stated. v8 lost `Rolldown`
   * the same way.
   *
   * Both levels are parsed together instead, each section running until the
   * next heading of EITHER level. A `##` that has `###` children keeps only
   * its own intro prose, and the children stand as their own sections, so the
   * finer split is preserved without dropping the coarser frame.
   */
  const matches = [...source.matchAll(/^(##|###)\s+(.+?)\s*$/gm)];

  return matches.map((match, index) => {
    const start = match.index + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : source.length;
    const body = source.slice(start, end).trim();
    const heading = stripMarkdown(match[2]);

    return {
      heading,
      level: match[1].length,
      components: extractComponentNames(heading),
      bodyLength: body.length,
      // A diff block is the clearest signal that the section requires an edit.
      hasDiff: /```diff/.test(body),
      excerpt: firstSentence(body),
      /*
       * Config keys live in the body, not the heading — `Removed Sass legacy
       * API support` names none, while its prose names
       * `css.preprocessorOptions.scss.api`. Extracted here so the body itself
       * does not have to be carried around.
       */
      configKeys: extractConfigKeys(`${heading}\n${body}`),
      // 슬롯 프로퍼티 접근(item.title 등) — 설정 축이 아니라 템플릿 축의 검사
      // 대상. 두 축은 같은 정규식을 루트로만 가른다(config-usage.js 참조).
      templateTerms: extractTemplateTerms(`${heading}\n${body}`),
    };
  })
  /*
   * A heading that only introduces its subheadings — `## Styles` with a `###`
   * on the next line — carries no prose of its own. It would become a unit
   * with nothing to judge. `## Rolldown`, which states the bundler swap
   * before its subsections, has a body and stays.
   */
  .filter((section) => section.bodyLength > 0);
}

/**
 * Searchable identifiers inside a heading.
 *
 * Headings are not bare names: `VSelect/VCombobox/VAutocomplete` lists three,
 * `Grid System (VRow and VCol)` buries two in prose, and vue-router writes
 * whole sentences — `new Router becomes createRouter`, `Removal of append prop
 * in <router-link>`. Matching only `V*` component names read 30 of
 * vue-router's 30 sections as naming nothing.
 *
 * Three shapes are taken, each distinctive enough not to fire on ordinary
 * prose:
 *   V-prefixed components   VSelect, VDataTable
 *   template tags           <router-link>, <keep-alive>
 *   inner-capital symbols   createRouter, scrollBehavior, onReady
 *
 * Bare lowercase words (`mode`, `base`, `event`) are deliberately left out.
 * They name real options, but searching a project for `event` matches
 * everywhere and would keep every section on screen.
 */
export function extractComponentNames(heading) {
  const text = String(heading ?? '');
  const found = [
    ...(text.match(/\bV[A-Z][A-Za-z0-9]+\b/g) ?? []),
    ...(text.match(/<([a-z][a-z0-9]*(?:-[a-z0-9]+)+)>/g) ?? []).map((tag) => tag.slice(1, -1)),
    ...(text.match(/\b[a-z][a-z0-9]*[A-Z][A-Za-z0-9]*\b/g) ?? []),
  ];
  return [...new Set(found)];
}

/**
 * Sections split by whether the project actually uses what they describe.
 *
 * Two independent kinds of evidence, because guides are written two ways:
 *   components  `usage` maps a component name to its match count, from the
 *               source matcher — the answer for `VSelect`, `<router-link>`
 *   config      `configUsage` maps a dotted option path to whether the project
 *               sets it — the answer for `build.target`, and the only one a
 *               build tool's guide ever offers
 *
 * Either kind can promote a section to `used`. A section whose config keys are
 * all ABSENT is NOT demoted to `unused`: "the project does not set this, so
 * the new default applies" is a finding, not a dismissal, and it stays in
 * `unknown` carrying its verdict. Sections that name neither — `Layers`,
 * `CSS reset` — stay in `unknown` as before, since nothing can judge them.
 */
export function splitSectionsByUsage(sections, usage, configUsage = {}, templateUsage = {}, signatureUsage = {}) {
  const used = [];
  const unused = [];
  const unknown = [];

  for (const section of sections) {
    const config = judgeSectionConfig(section, configUsage);
    // 템플릿 축 — 슬롯 프로퍼티 접근의 소스 실측. PRESENT는 "그 개명되는
    // 패턴을 이 파일:줄이 지금 쓰고 있다"는 수정 위치 그 자체다.
    let template = judgeSectionTemplate(section, templateUsage);
    /*
     * 시그니처 축(GUIDE_SECTION_SIGNATURES) — 컴포넌트도 토큰도 없는 전역
     * 섹션(Breakpoints 등)의 사용 실측. 별도 필드가 아니라 템플릿 축에
     * 합류시킨다: 프롬프트까지의 배관(templateVerdict/Evidence)이 그대로
     * 수정 위치를 나른다. 실제 프로젝트 실측(2026-08-24)의 브레이크포인트 FN 해소.
     */
    const signature = signatureUsage[section.heading];
    if (signature?.present) {
      template = {
        verdict: 'PRESENT',
        presentTerms: [...new Set([...template.presentTerms, ...signature.evidence.map((item) => item.term)])],
        absentTerms: template.absentTerms,
        evidence: [...template.evidence, ...signature.evidence].slice(0, 6),
      };
    }
    const decorated = { ...section, config, template };

    const usedComponents = section.components.filter((component) => (usage[component]?.fileCount ?? 0) > 0);
    if (usedComponents.length || config.verdict === 'PRESENT' || template.verdict === 'PRESENT') {
      used.push({ ...decorated, usedComponents });
      continue;
    }
    // Named components, none of them present, and no config key to speak for
    // it either — the one case where a section is genuinely not this
    // project's problem.
    if (section.components.length && config.verdict === 'NO_KEYS') {
      unused.push({ ...decorated, usedComponents: [] });
      continue;
    }
    unknown.push({ ...decorated, usedComponents: [] });
  }

  return { used, unused, unknown };
}

function stripMarkdown(text) {
  return String(text)
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]*)\*\*/g, '$1')
    .replace(/\{[^}]*\}/g, '')
    .trim();
}

function firstSentence(body) {
  const plain = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^:::[^\n]*$/gm, ' ')
    .replace(/<[^>]+>/g, ' ')
    // Inline code markers read as noise in a one line summary.
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]*)\*\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  const stop = plain.search(/[.!?](\s|$)/);
  return (stop > 0 ? plain.slice(0, stop + 1) : plain).slice(0, 240);
}

function git(repoPath, args) {
  return run('git', ['-C', repoPath, ...args], { timeout: GIT_TIMEOUT_MS, maxBuffer: 32 * 1024 * 1024 });
}
