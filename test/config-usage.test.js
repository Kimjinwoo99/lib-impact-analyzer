import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import {
  discoverConfigFiles,
  extractConfigKeys,
  extractTemplateTerms,
  judgeSectionConfig,
  judgeSectionTemplate,
  matchConfigUsage,
} from '../src/collect/config-usage.js';

function makeProject(files) {
  const root = mkdtempSync(resolve(tmpdir(), 'config-usage-'));
  for (const [path, content] of Object.entries(files)) {
    const full = resolve(root, path);
    mkdirSync(resolve(full, '..'), { recursive: true });
    writeFileSync(full, content, 'utf8');
  }
  return root;
}

describe('config key extraction', () => {
  it('takes dotted option paths out of guide prose', () => {
    const keys = extractConfigKeys(
      'You can remove the `css.preprocessorOptions.sass.api` / `css.preprocessorOptions.scss.api` option.',
    );
    assert.deepEqual(keys, ['css.preprocessorOptions.sass.api', 'css.preprocessorOptions.scss.api']);
  });

  /*
   * The bug this pins: rejecting any segment that doubles as a file extension
   * deleted the single most important key in vite's guide, because `css` and
   * `scss` are extensions AND config keys. Only the last segment can tell.
   */
  it('keeps keys whose non-final segments look like file extensions', () => {
    assert.deepEqual(extractConfigKeys('`css.preprocessorOptions.scss.api`'), ['css.preprocessorOptions.scss.api']);
    assert.deepEqual(extractConfigKeys('the `json.stringify` default changed'), ['json.stringify']);
  });

  it('drops filenames, hostnames, versions and language constructs', () => {
    const text = [
      'see https://v6.vite.dev/guide/migration.html and rolldown.rs',
      'read index.md or vite.config.js, e.g. this one',
      '`import.meta.url` is emitted differently; `process.env.NODE_ENV` too',
      'upgrade to 6.0.3 — check package.json',
    ].join('\n');
    assert.deepEqual(extractConfigKeys(text), []);
  });

  it('requires a dot — a bare word is not evidence', () => {
    assert.deepEqual(extractConfigKeys('the default `target` and `build` changed'), []);
  });
});

describe('config usage matching', () => {
  const project = makeProject({
    'vite.config.js': [
      "import { defineConfig } from 'vite';",
      'export default defineConfig({',
      '  resolve: { alias: { "~": "/runtime" } },',
      '  server: { port: 4310, proxy: { "/api": "http://localhost:8080" } },',
      '  build: {',
      '    rollupOptions: {',
      '      output: {',
      '        manualChunks(id) { return id.includes("realgrid") ? "realgrid" : undefined; },',
      '      },',
      '    },',
      '  },',
      '});',
    ].join('\n'),
    'package.json': '{ "name": "fixture", "type": "module" }',
    'node_modules/pkg/vite.config.js': 'export default { build: { target: "es2015" } };',
  });

  it('finds a nested option by its property chain and reports the line to open', () => {
    const { usage } = matchConfigUsage(project, ['build.rollupOptions.output.manualChunks']);
    const entry = usage['build.rollupOptions.output.manualChunks'];
    assert.equal(entry.present, true);
    assert.equal(entry.evidence[0].file, 'vite.config.js');
    assert.equal(entry.evidence[0].line, 8);
    assert.equal(entry.evidence[0].form, 'CHAIN');
    assert.equal(entry.evidence[0].valueForm, 'FUNCTION');
  });

  /*
   * `build.target` is unset here. That answer is the point: it is what makes
   * the changed default a smoke test instead of a no-op, so it must come back
   * as a confident ABSENT rather than silence.
   */
  it('reports an option the project does not set as absent', () => {
    const { usage } = matchConfigUsage(project, ['build.target']);
    assert.equal(usage['build.target'].present, false);
    assert.deepEqual(usage['build.target'].evidence, []);
  });

  /*
   * `server.proxy` and `build.target` share no chain, but a whole-file word
   * search would find `target` inside the proxy block. Requiring the segments
   * in order is what separates them.
   */
  it('does not let one option answer for another that shares a leaf name', () => {
    const { usage } = matchConfigUsage(project, ['server.proxy', 'server.target']);
    assert.equal(usage['server.proxy'].present, true);
    assert.equal(usage['server.target'].present, false);
  });

  it('ignores config files inside node_modules', () => {
    const files = discoverConfigFiles(project);
    assert.ok(files.every((file) => !file.includes('node_modules')));
    assert.ok(files.some((file) => file.endsWith('vite.config.js')));
  });

  it('returns an empty scan rather than throwing when there is nothing to look for', () => {
    const result = matchConfigUsage(project, []);
    assert.deepEqual(result, { scannedFiles: 0, files: [], usage: {} });
  });
});

describe('config value form', () => {
  it('classifies the arrow, object, array, string, primitive and dot-reference forms', () => {
    const project = makeProject({
      'vite.config.js': [
        'export default {',
        '  build: {',
        "    target: 'es2020',",
        '    minify: true,',
        '    rollupOptions: {',
        '      external: [\'lodash\'],',
        '      output: { manualChunks: (id) => id },',
        '    },',
        '  },',
        '  css: { preprocessorOptions: { scss: { api: "modern-compiler" } } },',
        '  server: { proxy: {} },',
        '};',
      ].join('\n'),
    });
    const { usage } = matchConfigUsage(project, [
      'build.target',
      'build.minify',
      'build.rollupOptions.external',
      'build.rollupOptions.output.manualChunks',
      'css.preprocessorOptions.scss.api',
      'server.proxy',
    ]);
    assert.equal(usage['build.target'].evidence[0].valueForm, 'STRING');
    assert.equal(usage['build.minify'].evidence[0].valueForm, 'PRIMITIVE');
    assert.equal(usage['build.rollupOptions.external'].evidence[0].valueForm, 'ARRAY');
    assert.equal(usage['build.rollupOptions.output.manualChunks'].evidence[0].valueForm, 'FUNCTION');
    assert.equal(usage['css.preprocessorOptions.scss.api'].evidence[0].valueForm, 'STRING');
    assert.equal(usage['server.proxy'].evidence[0].valueForm, 'OBJECT');
  });

  it('reports UNKNOWN rather than guessing when the value is a bare identifier or starts on the next line', () => {
    const project = makeProject({
      'vite.config.js': [
        'export default {',
        '  build: {',
        '    target: browserTargets,',
        '    minify:',
        "      'esbuild',",
        '  },',
        '};',
      ].join('\n'),
    });
    const { usage } = matchConfigUsage(project, ['build.target', 'build.minify']);
    assert.equal(usage['build.target'].evidence[0].valueForm, 'UNKNOWN');
    assert.equal(usage['build.minify'].evidence[0].valueForm, 'UNKNOWN');
  });

  it('classifies a dot-access chain link as REFERENCE, not a declaration', () => {
    const project = makeProject({
      'vite.config.js': [
        'const target = something',
        '  .server',
        '  .target;',
      ].join('\n'),
    });
    const { usage } = matchConfigUsage(project, ['server.target']);
    assert.equal(usage['server.target'].evidence[0].valueForm, 'REFERENCE');
  });

  it('does not let a comment mentioning a key count as usage, or feed it a wrong valueForm', () => {
    const project = makeProject({
      'vite.config.js': [
        '// old style: manualChunks: { vendor: ["react"] }',
        'export default {',
        '  build: { rollupOptions: { output: {} } },',
        '};',
      ].join('\n'),
    });
    const { usage } = matchConfigUsage(project, ['build.rollupOptions.output.manualChunks']);
    assert.equal(usage['build.rollupOptions.output.manualChunks'].present, false);
    assert.deepEqual(usage['build.rollupOptions.output.manualChunks'].evidence, []);
  });

});

describe('section config verdict', () => {
  const usage = {
    'build.rollupOptions.output.manualChunks': { present: true, evidence: [{ file: 'vite.config.js', line: 8, form: 'CHAIN' }] },
    'build.target': { present: false, evidence: [] },
  };

  it('is PRESENT when any key is set, and carries the evidence', () => {
    const verdict = judgeSectionConfig({ configKeys: ['build.rollupOptions.output.manualChunks', 'build.target'] }, usage);
    assert.equal(verdict.verdict, 'PRESENT');
    assert.deepEqual(verdict.presentKeys, ['build.rollupOptions.output.manualChunks']);
    assert.deepEqual(verdict.absentKeys, ['build.target']);
    assert.equal(verdict.evidence[0].key, 'build.rollupOptions.output.manualChunks');
  });

  it('is ABSENT when every key is unset', () => {
    const verdict = judgeSectionConfig({ configKeys: ['build.target'] }, usage);
    assert.equal(verdict.verdict, 'ABSENT');
    assert.deepEqual(verdict.absentKeys, ['build.target']);
  });

  it('is NO_KEYS when the section is not about options at all', () => {
    assert.equal(judgeSectionConfig({ configKeys: [] }, usage).verdict, 'NO_KEYS');
  });
});

/*
 * The bug this pins: `item.title` in a guide sentence about slot props leaked
 * into configKeys, matchConfigUsage looked for it in CONFIG FILES (obviously
 * absent), and that ABSENT reached the judgment prompt as "not in the code" —
 * a false negative on real template usage (vuetify #selection rename,
 * 2026-08-22 measured run). Template terms are a separate axis from the same
 * regex, split by root.
 */
describe('template term extraction — slot props are not config keys', () => {
  it('routes item./internalItem. tokens to templateTerms, not configKeys', () => {
    const text = 'item in slots has been renamed to internalItem: use internalItem.raw or item.title. The css.preprocessorOptions.scss.api option is unrelated.';
    assert.deepEqual(extractConfigKeys(text), ['css.preprocessorOptions.scss.api']);
    assert.deepEqual(extractTemplateTerms(text).sort(), ['internalItem.raw', 'item.title']);
  });

  it('judges a section PRESENT only when a term was actually found in source', () => {
    const usage = {
      'item.title': { present: true, evidence: [{ file: 'runtime/widgets/BeanPicker.vue', line: 30, excerpt: '{{ item.title }}' }] },
      'item.raw.name': { present: false, evidence: [] },
    };
    const verdictPresent = judgeSectionTemplate({ templateTerms: ['item.title', 'item.raw.name'] }, usage);
    assert.equal(verdictPresent.verdict, 'PRESENT');
    assert.deepEqual(verdictPresent.presentTerms, ['item.title']);
    assert.equal(verdictPresent.evidence[0].file, 'runtime/widgets/BeanPicker.vue');

    assert.equal(judgeSectionTemplate({ templateTerms: ['item.raw.name'] }, usage).verdict, 'ABSENT');
    assert.equal(judgeSectionTemplate({ templateTerms: [] }, usage).verdict, 'NO_TERMS');
  });

  /*
   * The bug this pins: the guide's example `item.raw.name` was searched as an
   * exact token, but real code writes its own data field in that seat —
   * a real project's `item.raw.<field>` (2 files) missed the exact match and two
   * TypeError-grade renames were dropped from the judgment (2026-08-24
   * measured run, FN×2). The renamed API surface ends at `item.raw`; deeper
   * segments belong to the app's data, so terms truncate to root+property.
   */
  it('truncates slot terms to root+property — guide example field names are not the API surface', () => {
    const text = 'Or remove `.raw`: change `item.raw.name` to `item.name` inside the slot.';
    assert.deepEqual(extractTemplateTerms(text).sort(), ['item.name', 'item.raw']);
  });

  /*
   * The bug this pins: vuetify 4's Themes section breaks `rgba(var(--v-theme-X))`
   * (alpha needs color-mix now) but the guide names its example color
   * (`--v-theme-color`) while a real project writes `--v-theme-on-background` — the exact
   * token missed and vertical-nav.vue:332 was dropped (2026-08-24, FN). The
   * compound is extracted with the custom property truncated to its family
   * prefix. `rgb(var(...)` stays out: the guide says it keeps working, and
   * extracting it would mark every legitimate theme-color read as PRESENT.
   */
  it('extracts rgba(var(--family- compound terms, never the still-working rgb( form', () => {
    const text = 'but `rgba(var(--v-theme-color), 0.8)` should be changed, while `rgb(var(--v-theme-color))` will continue to work.';
    const terms = extractTemplateTerms(text);
    assert.ok(terms.includes('rgba(var(--v-theme-'));
    assert.ok(!terms.some((term) => term.startsWith('rgb(var(')));
  });
});
