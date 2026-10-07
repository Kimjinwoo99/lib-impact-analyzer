import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ATOM_ENTRY_LIMIT,
  buildAtomFeedUrl,
  collectFromAtomXml,
  collectT1,
} from '../src/collect/atom-collector.js';
import { buildChangelogParseResult } from '../src/changelog/release-range-parser.js';
import { extractListItems, parseAtomFeed, parseTagRef, unescapeHtml } from '../src/collect/atom-feed.js';
import {
  normalizeRepositorySlug,
  resolveRepositorySlug,
  selectRecentStableVersions,
  selectVersionsAheadOf,
} from '../src/collect/npm-registry.js';

/** Escaped exactly as GitHub serves `<content type="html">`. */
function entry({ tag, title = tag, updated = '2026-07-01T00:00:00Z', body }) {
  return `
  <entry>
    <id>tag:github.com,2008:Repository/1/${tag}</id>
    <updated>${updated}</updated>
    <link rel="alternate" type="text/html" href="https://github.com/vuetifyjs/vuetify/releases/tag/${tag}"/>
    <title>${title}</title>
    <content type="html">${escapeForAtom(body)}</content>
    <author><name>release-bot</name></author>
  </entry>`;
}

function escapeForAtom(html) {
  return String(html)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function feed(entries) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Release notes from vuetify</title>${entries.join('')}
</feed>`;
}

const bugFixBody = `
<h2>:wrench: Bug Fixes</h2>
<ul>
<li><strong>VSelect:</strong> fix menu behavior (<a href="https://github.com/vuetifyjs/vuetify/issues/100">#100</a>) (<a href="https://github.com/vuetifyjs/vuetify/commit/abcdef1">abcdef1</a>)</li>
<li><strong>VBtn:</strong> restore <code>&lt;slot&gt;</code> order</li>
</ul>`;

const breakingBody = `
<h2>:warning: Breaking Changes</h2>
<ul>
<li><strong>VApp:</strong> remove deprecated behavior
  <ul><li>migration note that must not become its own top level item</li></ul>
</li>
</ul>`;

const linkOnlyBody = '<p>Please refer to <a href="https://github.com/vitejs/vite/blob/main/packages/vite/CHANGELOG.md">CHANGELOG.md</a> for details.</p>';

describe('atom feed parsing', () => {
  it('unescapes content before reading tags — the trap that reports every release as 0 items', () => {
    const xml = feed([entry({ tag: 'v3.6.11', body: bugFixBody })]);

    // The raw feed holds no list markup at all; reading it without unescaping
    // yields zero items and looks like an empty release note.
    // The character class matters: a bare `<li` prefix also matches `<link`,
    // which every atom entry carries.
    assert.equal(/<li[ >]/.test(xml), false);
    assert.ok(xml.includes('<link '));
    assert.ok(xml.includes('&lt;li&gt;'));

    const [parsed] = parseAtomFeed(xml).entries;
    assert.ok(parsed.contentHtml.includes('<li>'));
    assert.equal(parsed.sections.length, 1);
    assert.deepEqual(parsed.sections[0].items.length, 2);
  });

  it('keeps nested list text inside its parent item instead of emitting it twice', () => {
    const items = extractListItems('<ul><li>parent<ul><li>child</li></ul>tail</li><li>sibling</li></ul>');
    assert.deepEqual(items, ['parent tail', 'sibling']);
  });

  it('does not read a <link> element as a list item', () => {
    assert.deepEqual(extractListItems('<link rel="alternate" href="https://example.test"/><ul><li>real</li></ul>'), ['real']);
  });

  it('unescapes numeric and named references, resolving &amp; last', () => {
    assert.equal(unescapeHtml('&amp;lt;div&amp;gt;'), '&lt;div&gt;');
    assert.equal(unescapeHtml('a &#38; b &#x26; c'), 'a & b & c');
  });

  it('reads the tag from the release link, and splits monorepo tags', () => {
    assert.deepEqual(parseTagRef('v3.6.11'), { tagName: 'v3.6.11', packageName: null, version: '3.6.11', prerelease: false });
    assert.deepEqual(parseTagRef('create-vite@9.1.2'), { tagName: 'create-vite@9.1.2', packageName: 'create-vite', version: '9.1.2', prerelease: false });
    assert.deepEqual(parseTagRef('@vitejs/plugin-vue@6.0.0'), { tagName: '@vitejs/plugin-vue@6.0.0', packageName: '@vitejs/plugin-vue', version: '6.0.0', prerelease: false });
    assert.equal(parseTagRef('v5.9.0-dev.20260101').prerelease, true);
    assert.equal(parseTagRef('nightly').version, null);
  });
});

describe('repository slug', () => {
  it('keeps dots in the repo name and strips only a .git suffix', () => {
    assert.equal(normalizeRepositorySlug('git+https://github.com/chartjs/Chart.js.git'), 'chartjs/Chart.js');
    assert.equal(normalizeRepositorySlug('https://github.com/MikeMcl/bignumber.js'), 'MikeMcl/bignumber.js');
    assert.equal(normalizeRepositorySlug('github:eKoopmans/html2pdf.js'), 'eKoopmans/html2pdf.js');
    assert.equal(normalizeRepositorySlug('git@github.com:vuejs/core.git'), 'vuejs/core');
    // Monorepo subpaths carry a directory that is not part of the slug.
    assert.equal(normalizeRepositorySlug('https://github.com/vitejs/vite/tree/main/packages/vite'), 'vitejs/vite');
  });

  it('builds a feed url that would 404 if the dot were dropped', () => {
    assert.equal(buildAtomFeedUrl('git+https://github.com/chartjs/Chart.js.git'), 'https://github.com/chartjs/Chart.js/releases.atom');
  });

  it('falls back through registry metadata fields', () => {
    assert.equal(resolveRepositorySlug({ repository: { url: 'git+https://github.com/vuetifyjs/vuetify.git' } }), 'vuetifyjs/vuetify');
    assert.equal(resolveRepositorySlug({ homepage: 'https://github.com/axios/axios' }), 'axios/axios');
    assert.equal(resolveRepositorySlug({ homepage: 'https://sheetjs.com/' }), null);
  });
});

describe('version window', () => {
  const metadata = {
    versions: { '0.18.5': {}, '0.19.0': {}, '0.20.3': {}, '5.9.0-dev.20260101': {} },
    time: { '0.20.3': '2026-07-01T00:00:00Z' },
  };

  it('excludes prereleases and nightlies from the grading window', () => {
    assert.deepEqual(selectRecentStableVersions(metadata, 5), ['0.18.5', '0.19.0', '0.20.3']);
  });

  it('reads only versions above the installed one, so backports never inflate the list', () => {
    assert.deepEqual(selectVersionsAheadOf(metadata, '0.18.5'), ['0.19.0', '0.20.3']);
    assert.deepEqual(selectVersionsAheadOf(metadata, '0.18.5', { toVersion: '0.19.0' }), ['0.19.0']);
    // xlsx: installed 0.20.3 is ahead of the registry's newest 0.18.5.
    // Comparing only the patch position would report an update.
    assert.deepEqual(selectVersionsAheadOf(metadata, '0.20.3'), []);
  });
});

describe('T1 collector', () => {
  it('produces change items in the shared ChangeItem shape', () => {
    const result = collectFromAtomXml({
      packageName: 'vuetify',
      repository: 'vuetifyjs/vuetify',
      atomXml: feed([entry({ tag: 'v3.6.11', body: `${breakingBody}${bugFixBody}` })]),
      targetVersions: ['3.6.11'],
    });

    assert.equal(result.ok, true);
    assert.equal(result.tier, 'T1');
    assert.equal(result.grade, 'T1');
    assert.equal(result.coverage, 1);
    assert.equal(result.degraded, false);
    assert.equal(result.evidence.rateLimitCost, 0);
    assert.equal(result.changeItemCount, 3);

    // Categories come from the heading, exactly as the REST path does.
    assert.deepEqual(result.items.map((item) => item.category), ['BREAKING', 'BUG_FIX', 'BUG_FIX']);
    const bugFix = result.items[1];
    assert.equal(bugFix.scope, 'VSelect');
    assert.equal(bugFix.summary, 'fix menu behavior (#100)');
    assert.deepEqual(bugFix.prNumbers, [100]);
    assert.deepEqual(bugFix.commitHashes, ['abcdef1']);
    assert.equal(bugFix.sourceUrl, 'https://github.com/vuetifyjs/vuetify/releases/tag/v3.6.11');
  });

  it('rejects sibling monorepo tags instead of counting them as our releases', () => {
    const result = collectFromAtomXml({
      packageName: 'vite',
      repository: 'vitejs/vite',
      atomXml: feed([
        entry({ tag: 'create-vite@9.1.2', body: bugFixBody }),
        entry({ tag: 'plugin-legacy@8.2.0', body: bugFixBody }),
        entry({ tag: 'vite@7.1.0', body: bugFixBody }),
      ]),
      targetVersions: ['7.1.0'],
    });

    assert.deepEqual(result.releases.map((release) => release.version), ['7.1.0']);
    assert.deepEqual(result.rejectedEntries, [
      { tagName: 'create-vite@9.1.2', reason: 'FOREIGN_MONOREPO_TAG' },
      { tagName: 'plugin-legacy@8.2.0', reason: 'FOREIGN_MONOREPO_TAG' },
    ]);
    assert.equal(result.coverage, 1);
  });

  it('accepts an unscoped tag for a scoped package', () => {
    const result = collectFromAtomXml({
      packageName: '@vitejs/plugin-vue',
      repository: 'vitejs/vite-plugin-vue',
      atomXml: feed([entry({ tag: 'plugin-vue@6.0.0', body: bugFixBody })]),
      targetVersions: ['6.0.0'],
    });
    assert.deepEqual(result.releases.map((release) => release.version), ['6.0.0']);
  });

  it('skips prereleases by default', () => {
    const result = collectFromAtomXml({
      packageName: 'typescript',
      repository: 'microsoft/TypeScript',
      atomXml: feed([entry({ tag: 'v5.9.0-dev.20260101', body: bugFixBody }), entry({ tag: 'v5.8.3', body: bugFixBody })]),
      targetVersions: ['5.8.3'],
    });
    assert.deepEqual(result.releases.map((release) => release.version), ['5.8.3']);
    assert.deepEqual(result.rejectedEntries, [{ tagName: 'v5.9.0-dev.20260101', reason: 'PRERELEASE' }]);
  });

  it('counts a link-only release body as uncovered and routes it to T3', () => {
    const result = collectFromAtomXml({
      packageName: 'vite',
      repository: 'vitejs/vite',
      atomXml: feed([
        entry({ tag: 'vite@7.1.0', body: linkOnlyBody }),
        entry({ tag: 'vite@7.0.9', body: bugFixBody }),
      ]),
      targetVersions: ['7.0.9', '7.1.0'],
    });

    // The release exists and matched — the body simply has no items.
    assert.equal(result.releaseCount, 2);
    assert.equal(result.coverage, 0.5);
    assert.equal(result.grade, 'T1_INSUFFICIENT');
    assert.equal(result.degraded, true);
    assert.deepEqual(result.missingVersions, [{ version: '7.1.0', reason: 'NO_ITEMS_IN_BODY' }]);
    assert.deepEqual(result.needsFallback, ['T3_RAW_CHANGELOG']);
    assert.equal(result.manualReview.required, false);
  });

  it('grades by ratio, not by whether any entry had items', () => {
    const entries = [entry({ tag: 'v3.5.20', body: bugFixBody })];
    for (let index = 0; index < 9; index += 1) {
      entries.push(entry({ tag: `v3.5.${index + 21}`, body: linkOnlyBody }));
    }
    const result = collectFromAtomXml({
      packageName: 'vue',
      repository: 'vuejs/core',
      atomXml: feed(entries),
      targetVersions: entries.map((_, index) => `3.5.${index + 20}`),
    });

    assert.equal(result.coverage, 0.1);
    assert.equal(result.grade, 'T1_INSUFFICIENT');
  });

  it('blames the window, not the tag, for a gap inside a full feed', () => {
    // The feed is ordered by publish date, not by version. A maintenance
    // release on an old line evicts a newer line's release: vuetify's real
    // feed holds 3.12.9-3.13.0 next to 4.1.2-4.1.7, with 4.0.x pushed out.
    const entries = ['3.12.9', '3.12.10', '3.12.11', '3.13.0', '4.1.2', '4.1.3', '4.1.4', '4.1.5', '4.1.6', '4.1.7']
      .map((version) => entry({ tag: `v${version}`, body: bugFixBody }));
    const result = collectFromAtomXml({
      packageName: 'vuetify',
      repository: 'vuetifyjs/vuetify',
      atomXml: feed(entries),
      targetVersions: ['4.0.0', '4.1.1', '4.1.7'],
    });

    assert.equal(result.truncated, true);
    // 4.0.0 sits above the oldest entry present (3.12.9) yet is still absent.
    // Reading that as a tag mismatch would send it to a manual review it does
    // not need — the window evicted it, and T2 paginates past the window.
    assert.deepEqual(result.missingVersions, [
      { version: '4.0.0', reason: 'BEYOND_ENTRY_LIMIT' },
      { version: '4.1.1', reason: 'BEYOND_ENTRY_LIMIT' },
    ]);
    assert.deepEqual(result.needsFallback, ['T2_REST_API']);
  });

  it('blames the tag when the feed was not full', () => {
    // Fewer entries than the limit means the feed carried everything it has,
    // so an absent version really has no matching tag — the @types/node case.
    const result = collectFromAtomXml({
      packageName: '@types/node',
      repository: 'DefinitelyTyped/DefinitelyTyped',
      atomXml: feed([entry({ tag: 'v22.19.0', body: bugFixBody })]),
      targetVersions: ['22.18.0', '22.19.0'],
    });

    assert.equal(result.truncated, false);
    assert.deepEqual(result.missingVersions, [{ version: '22.18.0', reason: 'NOT_IN_FEED' }]);
  });

  it('flags versions older than the 10 entry window for T2', () => {
    const entries = [];
    for (let index = 0; index < ATOM_ENTRY_LIMIT; index += 1) {
      entries.push(entry({ tag: `v22.${index + 10}.0`, body: bugFixBody }));
    }
    const result = collectFromAtomXml({
      packageName: '@types/node',
      repository: 'DefinitelyTyped/DefinitelyTyped',
      atomXml: feed(entries),
      targetVersions: ['22.5.0', '22.10.0', '22.19.0'],
    });

    assert.equal(result.truncated, true);
    assert.deepEqual(result.missingVersions, [{ version: '22.5.0', reason: 'BEYOND_ENTRY_LIMIT' }]);
    assert.deepEqual(result.needsFallback, ['T2_REST_API']);
  });

  it('cannot claim coverage without a target list', () => {
    const result = collectFromAtomXml({
      packageName: 'vuetify',
      repository: 'vuetifyjs/vuetify',
      atomXml: feed([entry({ tag: 'v3.6.11', body: bugFixBody })]),
    });

    assert.equal(result.coverageBasis, 'FEED_ONLY');
    assert.equal(result.grade, 'UNVERIFIED_COVERAGE');
    assert.equal(result.degraded, true);
  });

  it('reports an up to date package as not applicable rather than covered', () => {
    const result = collectFromAtomXml({
      packageName: 'husky',
      repository: 'typicode/husky',
      atomXml: feed([entry({ tag: 'v9.1.7', body: bugFixBody })]),
      targetVersions: [],
    });
    assert.equal(result.coverage, null);
    assert.equal(result.grade, 'NO_TARGET_VERSIONS');
    assert.equal(result.degraded, false);
  });

  it('feeds the release range parser without a second normalization pass', () => {
    // The server hands `sourceReleases` straight to the existing parser, so a
    // T1 collection produces the same stage-3 shape the REST path did.
    const result = collectFromAtomXml({
      packageName: 'vuetify',
      repository: 'vuetifyjs/vuetify',
      atomXml: feed([
        entry({ tag: 'v3.6.11', body: bugFixBody }),
        entry({ tag: 'v3.6.12', body: breakingBody }),
      ]),
      targetVersions: ['3.6.11', '3.6.12'],
    });

    const parsed = buildChangelogParseResult({
      packageName: 'vuetify',
      currentVersion: '3.6.10',
      targetVersion: '3.6.12',
      releases: result.sourceReleases,
    });

    assert.equal(parsed.mode, 'UPGRADE_IMPACT');
    assert.equal(parsed.releaseCount, 2);
    assert.equal(parsed.changeItemCount, 3);
    assert.deepEqual(parsed.releases.map((release) => release.versionRole), ['TARGET', 'INTERMEDIATE']);

    // Fields survive the atom -> markdown-lite -> parser round trip.
    const breaking = parsed.items.find((item) => item.category === 'BREAKING');
    assert.equal(breaking.scope, 'VApp');
    const bugFix = parsed.items.find((item) => item.scope === 'VSelect');
    assert.deepEqual(bugFix.prNumbers, [100]);
    assert.deepEqual(bugFix.commitHashes, ['abcdef1']);

    // Raw text, not pre-built objects — feeding normalized items back in would
    // stringify them into "[object Object]".
    assert.equal(typeof result.sourceReleases[0].sections[0].items[0], 'string');
  });

  it('degrades a transport failure instead of reporting no changes', async () => {
    const result = await collectT1({
      packageName: 'chart.js',
      repository: 'chartjs/Chart.js',
      targetVersions: ['4.5.0'],
      fetchImpl: async () => ({ ok: false, status: 404, statusText: 'Not Found', text: async () => '' }),
    });

    assert.equal(result.ok, false);
    assert.equal(result.grade, 'T1_UNAVAILABLE');
    assert.equal(result.items.length, 0);
    assert.equal(result.coverage, 0);
    assert.deepEqual(result.missingVersions, [{ version: '4.5.0', reason: 'FEED_UNAVAILABLE' }]);
    assert.ok(result.error.message.includes('404'));
    assert.ok(result.error.message.includes('Chart.js'));
  });

  it('sends no authorization header and one request per feed', async () => {
    const calls = [];
    await collectT1({
      packageName: 'vuetify',
      repository: 'vuetifyjs/vuetify',
      targetVersions: ['3.6.11'],
      fetchImpl: async (url, init) => {
        calls.push({ url, init });
        return { ok: true, status: 200, statusText: 'OK', text: async () => feed([entry({ tag: 'v3.6.11', body: bugFixBody })]) };
      },
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://github.com/vuetifyjs/vuetify/releases.atom');
    assert.equal(Object.keys(calls[0].init.headers).some((key) => key.toLowerCase() === 'authorization'), false);
  });
});
