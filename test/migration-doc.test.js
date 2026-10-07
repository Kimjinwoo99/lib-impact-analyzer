import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test, { after, before, describe } from 'node:test';
import {
  extractComponentNames,
  listMigrationDocs,
  parseMigrationSections,
  readMigrationDoc,
  splitSectionsByUsage,
} from '../src/collect/migration-doc.js';
import { matchComponentUsage, matchGuideSignatures, matchTemplateUsage } from '../src/source-match/component-usage.js';

/*
 * The guide below mirrors the shapes measured in vuetify's real 18,208
 * character upgrade guide: headings that name one component, several, or none,
 * plus prose that buries names in parentheses.
 */
const GUIDE = `---
meta: upgrade
---

# Upgrade Guide

This page contains a detailed list of breaking changes.

## Styles

### CSS reset
The reset is no longer applied globally.

### VBtn text-transform
\`text-transform\` is no longer applied.

\`\`\`diff
- <v-btn class="text-uppercase">
+ <v-btn>
\`\`\`

### VSelect/VCombobox/VAutocomplete
\`item\` in slots has been renamed to \`internalItem\`. It is still available.

### Grid System (VRow and VCol)
The grid now uses flex.

### VFileInput
Removed the **$file-input-details-padding-inline** Sass variable.
`;

let repoPath = null;

function git(args) {
  execFileSync('git', ['-C', repoPath, ...args], { stdio: 'pipe' });
}

function write(file, body) {
  const target = join(repoPath, file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, body);
}

before(() => {
  repoPath = mkdtempSync(join(tmpdir(), 'migration-doc-'));
  execFileSync('git', ['init', '-q', '-b', 'main', repoPath], { stdio: 'pipe' });
  git(['config', 'user.email', 'test@example.test']);
  git(['config', 'user.name', 'test']);

  write('packages/docs/src/pages/en/getting-started/upgrade-guide.md', GUIDE);
  write('packages/docs/src/pages/ko/getting-started/upgrade-guide.md', GUIDE);
  write('packages/docs/cookbook/migration-v1-v2.md', '### VOld\nold stuff\n');
  // vue-router's shape: the keyword is in the directory, never the filename.
  write('packages/docs/guide/migration/index.md', '## Overview\nread this first\n');
  write('packages/docs/guide/migration/v4-to-v5.md', '### VRouterLink\nthe prop moved\n');
  write('docs/elevation-migration.md', '### Elevation\nchanged\n');
  write('src/index.js', 'export default 1;\n');
  git(['add', '.']);
  git(['commit', '-q', '--no-gpg-sign', '-m', 'docs: guides']);
  git(['tag', 'v4.0.0']);
});

after(() => {
  if (repoPath) rmSync(repoPath, { recursive: true, force: true });
});

describe('migration doc discovery', () => {
  test('finds guides by name and ranks the general one first', async () => {
    const docs = await listMigrationDocs(repoPath, 'v4.0.0', { targetMajor: 4 });
    // A general guide leads. Which one, when a repository has two, is settled
    // by path depth — an arbitrary tiebreak that no caller should depend on.
    assert.equal(docs[0].reason, 'GENERAL_GUIDE');
    assert.ok(docs[0].path.endsWith('.md'));

    // A guide for a different jump is real but must not win. pinia keeps
    // `migration-0-0-7.md`, and ranking by shape alone chose it for a 2 -> 4
    // upgrade — a guide for a version nobody is coming from.
    const specific = docs.find((doc) => doc.path.includes('migration-v1-v2'));
    assert.equal(specific.reason, 'VERSION_MISMATCH');
    assert.ok(specific.score < docs[0].score);
  });

  test('finds a guide named only by its directory', async () => {
    const docs = await listMigrationDocs(repoPath, 'v4.0.0', { targetMajor: 5 });
    const byDirectory = docs.find((doc) => doc.path === 'packages/docs/guide/migration/index.md');
    assert.ok(byDirectory, 'expected the directory-named guide to be found');
    assert.equal(byDirectory.reason, 'GENERAL_GUIDE');

    // vue-router names its jump guide `v4-to-v5.md` with no keyword at all;
    // only the directory marks it. It must rank as covering this upgrade.
    const jump = docs.find((doc) => doc.path.endsWith('v4-to-v5.md'));
    assert.ok(jump, 'expected the version named guide to be found');
    assert.equal(jump.reason, 'VERSION_MATCH');
  });

  test('skips translated copies of the same guide', async () => {
    const docs = await listMigrationDocs(repoPath, 'v4.0.0');
    assert.equal(docs.some((doc) => doc.path.includes('/ko/')), false);
  });

  test('reads a document at a tag', async () => {
    const text = await readMigrationDoc(repoPath, 'v4.0.0', 'packages/docs/src/pages/en/getting-started/upgrade-guide.md');
    assert.ok(text.includes('breaking changes'));
  });
});

describe('section parsing', () => {
  test('reads component names out of headings', () => {
    assert.deepEqual(extractComponentNames('VBtn text-transform'), ['VBtn']);
    assert.deepEqual(extractComponentNames('VSelect/VCombobox/VAutocomplete'), ['VSelect', 'VCombobox', 'VAutocomplete']);
    // Buried in prose — dropping these would lose a real section.
    assert.deepEqual(extractComponentNames('Grid System (VRow and VCol)'), ['VRow', 'VCol']);
    // Not every heading names a component, and that is not an error.
    assert.deepEqual(extractComponentNames('CSS reset'), []);
  });

  test('reads identifiers out of a prose heading', () => {
    // vue-router writes sentences, not names.
    assert.deepEqual(extractComponentNames('new Router becomes createRouter'), ['createRouter']);
    assert.deepEqual(extractComponentNames('Removal of append prop in <router-link>'), ['router-link']);
    assert.deepEqual(extractComponentNames('The currentRoute property is now a ref()'), ['currentRoute']);
    // Bare lowercase words name real options but match everywhere in source,
    // so they are left out on purpose.
    assert.deepEqual(extractComponentNames('New history option to replace mode'), []);
  });

  test('falls back to ## when a guide has no ### headings', () => {
    const sections = parseMigrationSections('## Overview\nread this first\n\n## VOld\ngone\n');
    assert.deepEqual(sections.map((section) => section.heading), ['Overview', 'VOld']);
  });

  /*
   * The bug this pins: taking `###` and falling back to `##` only when there
   * were none discarded whichever level lost. vite's v7 guide has one `###`
   * and six `##`, so `Default Browser Target change` — the only statement of
   * the new `build.target` default — never became a section at all.
   */
  test('keeps both heading levels when a guide mixes them', () => {
    const guide = [
      '## Node.js Support',
      'Node 20.19+ is now required.',
      '',
      '## General Changes',
      '',
      '### Removed Sass legacy API support',
      'You can remove the `css.preprocessorOptions.scss.api` option.',
      '',
      '## Default Browser Target change',
      'The default value of `build.target` is updated.',
    ].join('\n');

    const sections = parseMigrationSections(guide);
    assert.deepEqual(sections.map((section) => section.heading), [
      'Node.js Support',
      'Removed Sass legacy API support',
      'Default Browser Target change',
    ]);
    // `## General Changes` introduces its subheading and says nothing itself,
    // so it is not a unit with something to judge.
    assert.equal(sections.some((section) => section.heading === 'General Changes'), false);
    assert.deepEqual(sections[0].level, 2);
    assert.deepEqual(sections[1].level, 3);
  });

  test('pulls config keys out of the body, where guides actually put them', () => {
    const sections = parseMigrationSections(
      '### Removed Sass legacy API support\nYou can remove the `css.preprocessorOptions.sass.api` option.\n',
    );
    // The heading names no component and no key — the body names the key.
    assert.deepEqual(sections[0].components, []);
    assert.deepEqual(sections[0].configKeys, ['css.preprocessorOptions.sass.api']);
  });

  test('splits sections and flags the ones carrying a diff', () => {
    const sections = parseMigrationSections(GUIDE);
    assert.deepEqual(sections.map((section) => section.heading), [
      'CSS reset',
      'VBtn text-transform',
      'VSelect/VCombobox/VAutocomplete',
      'Grid System (VRow and VCol)',
      'VFileInput',
    ]);

    const btn = sections.find((section) => section.heading === 'VBtn text-transform');
    assert.equal(btn.hasDiff, true);
    // Code fences are stripped from the excerpt so it reads as a sentence.
    assert.equal(btn.excerpt.includes('```'), false);

    const select = sections.find((section) => section.heading.startsWith('VSelect'));
    assert.match(select.excerpt, /renamed to internalItem\./);
  });
});

describe('usage filtering', () => {
  test('keeps only sections whose components the project uses', () => {
    const sections = parseMigrationSections(GUIDE);
    const components = [...new Set(sections.flatMap((section) => section.components))];
    const { usage, scannedFiles } = matchComponentUsage('test/fixtures/sample-app-minimal', components);
    assert.ok(scannedFiles > 0);

    const split = splitSectionsByUsage(sections, usage);
    const headings = (list) => list.map((section) => section.heading);

    /*
     * The fixture uses VBtn/VSelect as PascalCase symbols AND VRow/VCol/
     * VFileInput as template tags (<v-row>, <v-file-input>). An earlier
     * version of this assertion listed only the first two — the kebab
     * conversion dropped the hyphen after the V (VRow → `vrow`), so
     * template-tag usage of V-prefixed components was invisible. That is
     * exactly the real-project failure mode (3 import files vs 285 template files)
     * this matcher exists to catch.
     */
    assert.deepEqual(headings(split.used), [
      'VBtn text-transform',
      'VSelect/VCombobox/VAutocomplete',
      'Grid System (VRow and VCol)',
      'VFileInput',
    ]);
    assert.ok(!headings(split.used).includes('VBanner'));

    // A heading naming no component cannot be judged by usage. Dropping it
    // would hide build-wide changes that matter without naming a component.
    assert.deepEqual(headings(split.unknown), ['CSS reset']);
  });

  /*
   * The config axis. A build tool's guide names options, not components, so
   * without this every one of its sections falls through to `unknown` and the
   * judgment step never sees it — measured at 2 of 21 sections reaching L6.
   */
  test('promotes a section by a config key the project sets', () => {
    const sections = [
      { heading: 'manualChunks', components: [], configKeys: ['build.rollupOptions.output.manualChunks'] },
      { heading: 'Browser target', components: [], configKeys: ['build.target'] },
      { heading: 'CSS reset', components: [], configKeys: [] },
    ];
    const configUsage = {
      'build.rollupOptions.output.manualChunks': { present: true, evidence: [{ file: 'vite.config.js', line: 53, form: 'CHAIN' }] },
      'build.target': { present: false, evidence: [] },
    };

    const split = splitSectionsByUsage(sections, {}, configUsage);
    assert.deepEqual(split.used.map((section) => section.heading), ['manualChunks']);
    assert.equal(split.used[0].config.evidence[0].line, 53);

    /*
     * ABSENT is not a dismissal — an unset `build.target` is the reason a
     * changed default reaches this project — so it stays available with its
     * verdict rather than being filed as `unused`.
     */
    assert.deepEqual(split.unknown.map((section) => section.heading), ['Browser target', 'CSS reset']);
    assert.equal(split.unknown[0].config.verdict, 'ABSENT');
    assert.equal(split.unknown[1].config.verdict, 'NO_KEYS');
    assert.deepEqual(split.unused, []);
  });

  test('a section the project uses neither by component nor by config is still unused', () => {
    const sections = [{ heading: 'VBanner', components: ['VBanner'], configKeys: [] }];
    const split = splitSectionsByUsage(sections, { VBanner: { fileCount: 0, files: [] } }, {});
    assert.deepEqual(split.unused.map((section) => section.heading), ['VBanner']);
  });

  /*
   * The FN this pins: `Breakpoints` names no component, no config key, no
   * slot token — it fell to `unknown`, no judgment unit was built, and a
   * project with 12 responsive props never heard that md moved 960→840
   * (real-project measured run, 2026-08-24). The signature axis promotes it through
   * the SAME template plumbing the prompt already reads, evidence included.
   */
  test('a signature hit promotes a global section to used, riding the template axis', () => {
    const sections = [{ heading: 'Breakpoints', components: [], configKeys: [], templateTerms: [] }];
    const signatureUsage = {
      Breakpoints: {
        present: true,
        evidence: [{ term: 'signature:breakpoints', file: 'src/pages/a.vue', line: 12, excerpt: '<v-col cols="12" md="6">' }],
      },
    };
    const split = splitSectionsByUsage(sections, {}, {}, {}, signatureUsage);
    assert.deepEqual(split.used.map((section) => section.heading), ['Breakpoints']);
    assert.equal(split.used[0].template.verdict, 'PRESENT');
    assert.deepEqual(split.used[0].template.presentTerms, ['signature:breakpoints']);
    assert.equal(split.used[0].template.evidence[0].file, 'src/pages/a.vue');
  });

  test('matchGuideSignatures finds responsive-prop reliance for a Breakpoints heading', () => {
    const root = mkdtempSync(join(tmpdir(), 'guide-signature-'));
    mkdirSync(join(root, 'src'), { recursive: true });
    writeFileSync(join(root, 'src', 'page.vue'), '<template>\n  <v-col cols="12" md="6">x</v-col>\n</template>\n', 'utf8');
    // 주석 속 언급은 사용이 아니다 — matchTemplateUsage와 같은 블랭킹 규칙.
    writeFileSync(join(root, 'src', 'silent.vue'), '<!-- <v-col md="6"> -->\n<template><div /></template>\n', 'utf8');
    try {
      const { usage } = matchGuideSignatures(root, ['Breakpoints', 'VBanner']);
      assert.equal(usage.Breakpoints.present, true);
      assert.equal(usage.Breakpoints.evidence[0].term, 'signature:breakpoints');
      // 사전에 없는 헤딩은 항목 자체가 없다 — 스캔 대상이 아니다.
      assert.equal('VBanner' in usage, false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  /*
   * The FN this pins: a real project's `rgba(var(--v-theme-on-background), ...)` at
   * vertical-nav.vue:332 — the guide's example is `--v-theme-color`, so the
   * term is a family prefix ending in `-` and must match without a right
   * boundary (2026-08-24 measured run).
   */
  test('matchTemplateUsage matches a family-prefix term against a differently-named custom property', () => {
    const root = mkdtempSync(join(tmpdir(), 'template-prefix-'));
    mkdirSync(join(root, 'src'), { recursive: true });
    writeFileSync(
      join(root, 'src', 'nav.vue'),
      '<style>\n.x { color: rgba(var(--v-theme-on-background), var(--v-disabled-opacity)); }\n</style>\n',
      'utf8',
    );
    try {
      const { usage } = matchTemplateUsage(root, ['rgba(var(--v-theme-']);
      assert.equal(usage['rgba(var(--v-theme-'].present, true);
      assert.equal(usage['rgba(var(--v-theme-'].evidence[0].line, 2);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('scans each file once for the whole component set', () => {
    const single = matchComponentUsage('test/fixtures/sample-app-minimal', ['VBtn']);
    const many = matchComponentUsage('test/fixtures/sample-app-minimal', ['VBtn', 'VSelect', 'VNeverUsed']);
    assert.equal(single.scannedFiles, many.scannedFiles);
    assert.equal(many.usage.VNeverUsed.fileCount, 0);
    assert.ok(many.usage.VBtn.fileCount > 0);
    assert.ok(many.usage.VBtn.files.length > 0);
  });

  test('an empty component list scans nothing', () => {
    const result = matchComponentUsage('test/fixtures/sample-app-minimal', []);
    assert.equal(result.scannedFiles, 0);
    assert.deepEqual(result.usage, {});
  });
});
