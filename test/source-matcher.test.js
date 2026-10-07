import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolve } from 'node:path';
import { buildMatchPatterns, discoverSourceFiles, matchSourceImpact, matchSourceImpactBatch } from '../src/source-match/source-matcher.js';

const fixturePath = resolve('test/fixtures/sample-app-minimal');

describe('source matcher', () => {
  it('discovers source files without generated folders', () => {
    const files = discoverSourceFiles(fixturePath).map((file) => file.replace(/\\/g, '/'));

    assert(files.some((file) => file.endsWith('/src/components/widgets/OverlayAttachLab.vue')));
    assert(files.some((file) => file.endsWith('/src/plugins/vuetify.ts')));
    assert(files.every((file) => !file.includes('/node_modules/')));
  });

  it('builds Vuetify template, symbol, config, and search term patterns from an L4 item', () => {
    const patterns = buildMatchPatterns({
      scope: 'VOverlay',
      inspectionPlan: {
        componentTags: ['VOverlay'],
        importSpecifiers: ['vuetify', 'VOverlay'],
        configKeys: ['ssr', 'attach'],
        searchTerms: ['vuetify', 'VOverlay', 'v-overlay', 'teleport', 'ShadowRoot', 'updateLocation'],
      },
    }, { packageName: 'vuetify' });

    assert(patterns.some((pattern) => pattern.type === 'VUE_TEMPLATE_TAG' && pattern.term === 'v-overlay'));
    assert(patterns.some((pattern) => pattern.type === 'COMPONENT_SYMBOL' && pattern.term === 'VOverlay'));
    assert(patterns.some((pattern) => pattern.type === 'CONFIG_KEY' && pattern.term === 'attach'));
    assert(patterns.some((pattern) => pattern.term === 'ShadowRoot'));
  });

  it('matches candidate files and evidence for auto-import and implicit Vuetify usage', () => {
    const result = matchSourceImpact({
      projectPath: fixturePath,
      packageName: 'vuetify',
      currentVersion: '3.6.10',
      targetVersion: '3.6.12',
      classificationItem: {
        itemId: 'mock-vuetify-overlay',
        version: '3.6.12',
        versionRole: 'TARGET',
        scope: 'VOverlay',
        agentCategory: 'BUG_FIX',
        preliminaryRisk: 'HIGH',
        reviewRequired: true,
        summary: 'make updateLocation event argument optional and handle ShadowRoot attach paths',
        inspectionPlan: {
          componentTags: ['VOverlay'],
          importSpecifiers: ['vuetify', 'VOverlay'],
          configKeys: ['ssr', 'attach'],
          searchTerms: ['vuetify', 'VOverlay', 'v-overlay', 'teleport', 'attach', 'ShadowRoot', 'updateLocation'],
        },
      },
    });

    assert.equal(result.packageName, 'vuetify');
    assert(result.summary.scannedFiles > 20);
    assert(result.summary.candidateFiles >= 3);

    const overlayFile = result.candidateFiles.find((file) => file.path === 'src/components/widgets/OverlayAttachLab.vue');
    assert(overlayFile, 'expected OverlayAttachLab.vue to be matched');
    assert.equal(overlayFile.confidence, 'HIGH');
    assert(overlayFile.matches.some((match) => match.type === 'VUE_TEMPLATE_TAG' && match.term === 'v-overlay'));
    assert(overlayFile.matches.some((match) => match.term === 'attach'));
    assert(overlayFile.matches.some((match) => match.term === 'ShadowRoot'));

    const pluginFile = result.candidateFiles.find((file) => file.path === 'src/plugins/vuetify.ts');
    assert(pluginFile, 'expected vuetify plugin config to be matched');
  });

  it('reports whether dynamic access blinds the term search', () => {
    // sample-app-minimal registers components dynamically (ComponentRegistryPanel
    // uses runtime lookups) OR it does not — either way the field must exist
    // and hits must name real files, so a consumer can decide what an
    // unmatched term means.
    const result = matchSourceImpact({
      projectPath: fixturePath,
      packageName: 'vuetify',
      classificationItem: {
        itemId: 'mock',
        scope: 'VOverlay',
        inspectionPlan: { componentTags: ['VOverlay'], importSpecifiers: [], configKeys: [], searchTerms: [] },
      },
    });

    assert.ok(result.dynamicAccess);
    assert.equal(typeof result.dynamicAccess.detected, 'boolean');
    assert.ok(Array.isArray(result.dynamicAccess.hits));
    for (const hit of result.dynamicAccess.hits) {
      assert.ok(hit.path && hit.kind);
    }
    assert.equal(result.dynamicAccess.detected, result.dynamicAccess.hits.length > 0);
  });
});

describe('dynamic access patterns', () => {
  // The regexes are private; matchSourceImpact is exercised through fixtures
  // above. These check the boundary that matters — literal arguments are NOT
  // dynamic — directly against the pattern set via a scratch fixture.
  it('distinguishes runtime-built names from literal ones', async () => {
    const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');

    const dir = mkdtempSync(join(tmpdir(), 'dyn-access-'));
    try {
      writeFileSync(join(dir, 'literal.js'), `
        const a = resolveComponent('VBtn');
        const b = await import('./chart.js');
        const c = require('lodash');
      `);
      writeFileSync(join(dir, 'dynamic.js'), `
        const name = 'V' + kind;
        const cmp = resolveComponent(name);
      `);
      writeFileSync(join(dir, 'types.d.ts'), `
        declare const resolveComponent: (name) => unknown;
        const x = resolveComponent(anything);
      `);
      // Prose in comments must not testify — sample-app's cluster.js was
      // flagged by a Korean docstring saying "서브패스 import(lodash/…)".
      writeFileSync(join(dir, 'commented.js'), `
        /**
         * 서브패스 import(lodash/groupBy.js)를 쓰는 이유는 번들 크기 때문.
         */
        // note: import(something) in a line comment either
        export const groupBy = 1;
      `);

      const result = matchSourceImpact({
        projectPath: dir,
        packageName: 'vuetify',
        classificationItem: { itemId: 'x', scope: 'VBtn', inspectionPlan: {} },
      });

      const paths = result.dynamicAccess.hits.map((hit) => hit.path);
      assert.ok(paths.includes('dynamic.js'), 'non-literal resolveComponent must count');
      assert.ok(!paths.includes('literal.js'), 'literal arguments are greppable, not dynamic');
      assert.ok(!paths.includes('types.d.ts'), 'type declarations never call anything');
      assert.ok(!paths.includes('commented.js'), 'comments never execute');

      // The hit is a claim a person will verify — it must carry the line.
      const hit = result.dynamicAccess.hits.find((entry) => entry.path === 'dynamic.js');
      assert.equal(hit.line, 3);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('generic scope words are not strong evidence', () => {
  it('drops bare lowercase scopes from symbol/import patterns, keeps identifiers and kebab tags', () => {
    // vite healthcheck items are scoped `build`, `css`, `deps` — words that
    // appear in every config file. They must not become weight-7 evidence.
    const generic = buildMatchPatterns(
      { scope: 'build', inspectionPlan: { componentTags: ['build'], importSpecifiers: ['vite', 'build'] } },
      { packageName: 'vite' },
    );
    assert.ok(!generic.some((p) => p.type === 'COMPONENT_SYMBOL'));
    assert.ok(!generic.some((p) => p.type === 'IMPORT_SPECIFIER'));
    assert.ok(!generic.some((p) => p.type === 'VUE_TEMPLATE_TAG'));

    // Distinctive identifiers keep full strength.
    const symbol = buildMatchPatterns(
      { scope: 'createRouter', inspectionPlan: { componentTags: ['VSelect'], importSpecifiers: ['vue-router', 'createRouter'] } },
      { packageName: 'vue-router' },
    );
    assert.ok(symbol.some((p) => p.type === 'COMPONENT_SYMBOL' && p.term === 'VSelect'));
    assert.ok(symbol.some((p) => p.type === 'IMPORT_SPECIFIER' && p.term === 'createRouter'));

    // An explicit kebab tag is distinctive too — the dash makes it a tag.
    const kebab = buildMatchPatterns(
      { scope: 'router-link', inspectionPlan: { componentTags: ['router-link'] } },
      { packageName: 'vue-router' },
    );
    assert.ok(kebab.some((p) => p.type === 'VUE_TEMPLATE_TAG' && p.term === 'router-link'));
  });

});

describe('comment-stripped matching (E3-b)', () => {
  it('does not count a comment mention as usage evidence — the main.scss regression', async () => {
    // Reproduces the actual 2026-08-12 finding: an L6 run judged
    // "runtime/skin의 scss는 모던 @use 문법만 사용, @import 없음" — factually
    // wrong (main.scss has six @import lines) — because the ONLY reason the
    // existing matcher surfaced the file at all was its own explanatory
    // comment mentioning "Sass"/"scss". With comments stripped, that mention
    // no longer counts, and the search must fall through to unmatchedTerms.
    const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');

    const dir = mkdtempSync(join(tmpdir(), 'comment-strip-'));
    try {
      writeFileSync(
        join(dir, 'main.scss'),
        [
          '// 체인으로 연결되어 있다. base.scss(@use 기반)와 달리 이쪽은 legacy 문법이라',
          '// Sass 컴파일러/설정을 올릴 때 검토 대상이 되는 부분이다.',
          "@import './parts/palette';",
        ].join('\n'),
      );

      const result = matchSourceImpact({
        projectPath: dir,
        packageName: 'vite',
        classificationItem: {
          itemId: 'bc-7',
          scope: 'css',
          inspectionPlan: { componentTags: [], importSpecifiers: [], configKeys: [], searchTerms: ['sass', 'scss'] },
        },
      });

      const mainScss = result.candidateFiles.find((file) => file.path === 'main.scss');
      assert.ok(!mainScss, 'a comment-only mention of "sass"/"scss" must not surface the file');
      assert.ok(
        result.unmatchedTerms.some((term) => term.term === 'sass') && result.unmatchedTerms.some((term) => term.term === 'scss'),
        'the generic terms correctly fall through to unmatched once comments are excluded',
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('still matches real code on the same line as a trailing comment, and reports the original line as the snippet', async () => {
    const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');

    const dir = mkdtempSync(join(tmpdir(), 'comment-strip-code-'));
    try {
      writeFileSync(join(dir, 'main.scss'), "@import './parts/palette'; // brand tokens\n");
      const result = matchSourceImpact({
        projectPath: dir,
        packageName: 'vite',
        classificationItem: {
          itemId: 'bc-7',
          scope: 'css',
          inspectionPlan: { componentTags: [], importSpecifiers: [], configKeys: [], searchTerms: ['@import'] },
        },
      });
      const mainScss = result.candidateFiles.find((file) => file.path === 'main.scss');
      assert.ok(mainScss, 'the actual @import syntax token must still match');
      assert.equal(mainScss.matches[0].snippet, "@import './parts/palette'; // brand tokens");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

});

describe('fileGlobs scoping (E3-c)', () => {
  it('restricts a searchTerms pattern to files matching *.ext', async () => {
    const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');

    const dir = mkdtempSync(join(tmpdir(), 'glob-scope-'));
    try {
      writeFileSync(join(dir, 'style.scss'), "@import './x';\n");
      // A .js file that happens to contain the literal string '@import' must
      // not count — the glob is what makes this a Sass-syntax question, not
      // a generic text search.
      writeFileSync(join(dir, 'unrelated.js'), "const s = '@import is css syntax, not js';\n");

      const result = matchSourceImpact({
        projectPath: dir,
        packageName: 'vite',
        classificationItem: {
          itemId: 'x',
          scope: 'css',
          inspectionPlan: { componentTags: [], importSpecifiers: [], configKeys: [], searchTerms: ['@import'], fileGlobs: ['*.scss'] },
        },
      });

      const paths = result.candidateFiles.map((file) => file.path);
      assert.ok(paths.includes('style.scss'));
      assert.ok(!paths.includes('unrelated.js'), 'the .js file is outside the *.scss glob');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('restricts to a directory prefix glob (dir/**)', async () => {
    const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');

    const dir = mkdtempSync(join(tmpdir(), 'glob-scope-dir-'));
    try {
      mkdirSync(join(dir, 'runtime/skin'), { recursive: true });
      mkdirSync(join(dir, 'other'), { recursive: true });
      writeFileSync(join(dir, 'runtime/skin/main.scss'), 'marker-token\n');
      writeFileSync(join(dir, 'other/main.scss'), 'marker-token\n');

      const result = matchSourceImpact({
        projectPath: dir,
        packageName: 'vite',
        classificationItem: {
          itemId: 'x',
          scope: 'css',
          inspectionPlan: {
            componentTags: [],
            importSpecifiers: [],
            configKeys: [],
            searchTerms: ['marker-token'],
            fileGlobs: ['runtime/**'],
          },
        },
      });

      const paths = result.candidateFiles.map((file) => file.path);
      assert.ok(paths.includes('runtime/skin/main.scss'));
      assert.ok(!paths.includes('other/main.scss'), 'outside the runtime/** prefix');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('leaves searchTerms unscoped when fileGlobs is absent or unsupported — today\'s behavior', async () => {
    const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');

    const dir = mkdtempSync(join(tmpdir(), 'glob-scope-none-'));
    try {
      writeFileSync(join(dir, 'anywhere.js'), 'marker-token\n');
      const result = matchSourceImpact({
        projectPath: dir,
        packageName: 'vite',
        classificationItem: {
          itemId: 'x',
          scope: 'css',
          inspectionPlan: { componentTags: [], importSpecifiers: [], configKeys: [], searchTerms: ['marker-token'] },
        },
      });
      assert.ok(result.candidateFiles.some((file) => file.path === 'anywhere.js'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('does not scope configKeys or componentTags patterns — only searchTerms', () => {
    const patterns = buildMatchPatterns(
      {
        scope: 'VBtn',
        inspectionPlan: {
          componentTags: ['VBtn'],
          configKeys: ['build.target'],
          searchTerms: ['@import'],
          fileGlobs: ['*.scss'],
        },
      },
      { packageName: 'vite' },
    );
    const searchTermPattern = patterns.find((p) => p.source === 'inspectionPlan.searchTerms');
    const configPattern = patterns.find((p) => p.type === 'CONFIG_KEY');
    const componentPattern = patterns.find((p) => p.type === 'COMPONENT_SYMBOL' || p.type === 'VUE_TEMPLATE_TAG');
    assert.ok(searchTermPattern.glob, 'searchTerms pattern should carry the glob');
    assert.ok(!configPattern.glob, 'configKeys pattern must stay unscoped');
    assert.ok(!componentPattern.glob, 'componentTags pattern must stay unscoped');
  });
});

describe('batch executor (E3)', () => {

  it('scans files once and evaluates every unit — independent results, one discovery pass', async () => {
    const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');

    const dir = mkdtempSync(join(tmpdir(), 'batch-'));
    try {
      writeFileSync(join(dir, 'a.js'), "import x from 'pkg-a';\n");
      writeFileSync(join(dir, 'b.js'), "import y from 'pkg-b';\n");

      const result = matchSourceImpactBatch({
        projectPath: dir,
        packageName: 'vite',
        units: [
          { unit: 'item:a', item: { itemId: 'a', scope: null, inspectionPlan: { importSpecifiers: ['PkgA'], searchTerms: ['pkg-a'] } } },
          { unit: 'item:b', item: { itemId: 'b', scope: null, inspectionPlan: { importSpecifiers: ['PkgB'], searchTerms: ['pkg-b'] } } },
        ],
      });

      assert.equal(result.scannedFiles, 2);
      assert.ok(result.byUnit['item:a'].files.some((file) => file.path === 'a.js'));
      assert.ok(!result.byUnit['item:a'].files.some((file) => file.path === 'b.js'));
      assert.ok(result.byUnit['item:b'].files.some((file) => file.path === 'b.js'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('accepts a synthesized pseudo-item for a group unit (scope token only)', async () => {
    const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');

    const dir = mkdtempSync(join(tmpdir(), 'batch-group-'));
    try {
      writeFileSync(join(dir, 'App.vue'), '<template><v-select /></template>\n');
      const result = matchSourceImpactBatch({
        projectPath: dir,
        packageName: 'vuetify',
        units: [{ unit: 'group:VSelect', item: { scope: 'VSelect', inspectionPlan: { componentTags: ['VSelect'] } } }],
      });
      assert.ok(result.byUnit['group:VSelect'].files.some((file) => file.path === 'App.vue'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reports an empty-but-present unmatchedTerms/files pair for a unit with no evidence anywhere', async () => {
    const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const dir = mkdtempSync(join(tmpdir(), 'batch-empty-'));
    try {
      writeFileSync(join(dir, 'x.js'), 'nothing relevant here\n');
      const result = matchSourceImpactBatch({
        projectPath: dir,
        packageName: 'vite',
        units: [{ unit: 'item:ghost', item: { itemId: 'ghost', inspectionPlan: { searchTerms: ['totally-absent-token'] } } }],
      });
      assert.deepEqual(result.byUnit['item:ghost'].files, []);
      assert.deepEqual(result.byUnit['item:ghost'].unmatchedTerms, [
        { term: 'totally-absent-token', type: 'INSPECTION_TERM', source: 'inspectionPlan.searchTerms' },
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  describe('planQuality (E3-d, observation only)', () => {
    it('flags a term matching more than 30% of scanned files as termsMatchedEverywhere', async () => {
      const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
      const { tmpdir } = await import('node:os');
      const { join } = await import('node:path');
      const dir = mkdtempSync(join(tmpdir(), 'plan-quality-'));
      try {
        for (let i = 0; i < 5; i += 1) writeFileSync(join(dir, `f${i}.js`), 'export const build = 1;\n');
        const result = matchSourceImpactBatch({
          projectPath: dir,
          packageName: 'vite',
          units: [{ unit: 'item:x', item: { itemId: 'x', inspectionPlan: { searchTerms: ['export'] } } }],
        });
        assert.ok(result.planQuality['item:x'].termsMatchedEverywhere.includes('export'));
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });

  });
});

describe('component term kebab conversion', () => {
  it('derives correct template tags for V-prefixed PascalCase names', () => {
    // 'VOverlay' used to kebab to 'voverlay' (no lowercase before the O), so
    // every V-component silently lost its template-tag pattern on this path
    // while the usage prescan (fixed copy of the same rule) still matched.
    const cases = [
      ['VOverlay', 'v-overlay'],
      ['VNumberInput', 'v-number-input'],
      ['VDataTable', 'v-data-table'],
      ['RouterLink', 'router-link'],
    ];
    for (const [symbol, tag] of cases) {
      const patterns = buildMatchPatterns(
        { scope: symbol, inspectionPlan: { componentTags: [symbol] } },
        { packageName: 'vuetify' },
      );
      assert.ok(
        patterns.some((pattern) => pattern.type === 'VUE_TEMPLATE_TAG' && pattern.term === tag),
        `${symbol} → ${tag}`,
      );
    }
  });
});