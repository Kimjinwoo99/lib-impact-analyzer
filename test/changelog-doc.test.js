import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import {
  extractBullets,
  listChangelogFiles,
  parseChangelogMarkdown,
} from '../src/collect/changelog-doc.js';
import { dedupeReleases, mergeCollection } from '../src/collect/collect-chain.js';

/*
 * Fixtures mirror the four formats measured on real repositories in round 0
 * of the tuning log — sass, prettier, date-fns, and the vue family. The parser
 * exists because these differ; the tests pin each difference.
 */

const SASS_STYLE = `## 1.102.0

* Use the 2.4 gamma transfer function for rec2020, as specified by the latest
  draft of CSS Color 4.

## 1.101.7

* No user-visible changes.

## 1.101.4

* Avoid emitting \`rgb()\` functions with non-percent decimal
  channels. Older browsers only support integer values.

* Fix a bug where plain-CSS \`if()\` expressions were emitted using
  their \`meta.inspect()\` format.
`;

const PRETTIER_STYLE = `# 3.9.6

[diff](https://github.com/prettier/prettier/compare/3.9.5...3.9.6)

#### TypeScript: Preserve quotes for methods named \`new\` ([#19621](https://github.com/prettier/prettier/pull/19621) by [@kovsu](https://github.com/kovsu))

<!-- prettier-ignore -->
\`\`\`tsx
// Input
interface Container {
  "new"(id: string): number;
}
\`\`\`

#### TypeScript: Support \`import defer\` ([#19624](https://github.com/prettier/prettier/pull/19624) by [@fisker](https://github.com/fisker))

# 3.9.5

[diff](https://github.com/prettier/prettier/compare/3.9.4...3.9.5)

#### JavaScript: Fix comments print on class methods ([#19599](https://github.com/prettier/prettier/pull/19599) by [@fisker](https://github.com/fisker))
`;

const KEEP_A_CHANGELOG_STYLE = `# Change Log

All notable changes to this project will be documented in this file.

## v5.0.0-alpha.0 - 2026-05-30

### Changed

- **BREAKING**: The CDN scripts are now available via the \`@date-fns/cdn\` npm package.

## v4.4.0 - 2026-05-30

This release revisits the approach to CDN usage and deprecates the \`date-fns\` CDN scripts.

### Changed

- **DEPRECATED**: The \`date-fns\` CDN scripts are now deprecated.
- Removed CDN source maps to reduce the package size.

## v4.3.0 - 2026-05-22

### Fixed

- Fixed \`pt\` locale first day of week to be Sunday. See [#4195](https://github.com/date-fns/date-fns/pull/4195).
`;

const CONVENTIONAL_STYLE = `## [3.5.41](https://github.com/vuejs/core/compare/v3.5.40...v3.5.41) (2026-06-01)

### Bug Fixes

* **runtime-core:** fix component update ([#13210](https://github.com/vuejs/core/issues/13210)) ([abc1234](https://github.com/vuejs/core/commit/abc1234))

### Features

* **compiler:** new transform ([def5678](https://github.com/vuejs/core/commit/def5678))
`;

describe('parseChangelogMarkdown', () => {
  test('sass style: version headings with plain bullets and continuation lines', () => {
    const entries = parseChangelogMarkdown(SASS_STYLE);
    assert.deepEqual(entries.map((entry) => entry.version), ['1.102.0', '1.101.7', '1.101.4']);

    const [latest, noChanges, multi] = entries;
    assert.equal(latest.itemCount, 1);
    assert.match(latest.sections[0].items[0], /gamma transfer function for rec2020, as specified by the latest draft/);

    // "No user-visible changes." is covered-with-zero-items, not a failure —
    // and must not surface as a fake change item either.
    assert.equal(noChanges.noChanges, true);
    assert.equal(noChanges.itemCount, 0);

    assert.equal(multi.itemCount, 2);
  });

  test('prettier style: h1 versions, one h4 heading per change, code fences ignored', () => {
    const entries = parseChangelogMarkdown(PRETTIER_STYLE);
    assert.deepEqual(entries.map((entry) => entry.version), ['3.9.6', '3.9.5']);

    const latest = entries[0];
    assert.equal(latest.itemCount, 2);
    assert.match(latest.sections[0].items[0], /^TypeScript: Preserve quotes/);
    // The PR reference must survive so the item parser extracts it.
    assert.match(latest.sections[0].items[0], /#19621/);
    // Content inside the ```tsx fence must not leak into items.
    assert.ok(!latest.sections[0].items.some((item) => item.includes('interface Container')));
  });

  test('keep-a-changelog style: dates, categories, prerelease exclusion left to caller', () => {
    const entries = parseChangelogMarkdown(KEEP_A_CHANGELOG_STYLE);
    assert.deepEqual(entries.map((entry) => entry.version), ['5.0.0', '4.4.0', '4.3.0']);
    assert.equal(entries[0].prerelease, true);

    const v440 = entries[1];
    assert.equal(v440.publishedAt, '2026-05-30T00:00:00Z');
    const changed = v440.sections.find((section) => section.title === 'Changed');
    assert.equal(changed.items.length, 2);
    // Prose above the first category heading must not swallow the bullets.
    assert.match(changed.items[0], /DEPRECATED/);
  });

  test('conventional-changelog style: linked version heading, scoped bullets', () => {
    const entries = parseChangelogMarkdown(CONVENTIONAL_STYLE);
    assert.equal(entries[0].version, '3.5.41');
    assert.equal(entries[0].publishedAt, '2026-06-01T00:00:00Z');
    const fixes = entries[0].sections.find((section) => section.title === 'Bug Fixes');
    assert.match(fixes.items[0], /^\*\*runtime-core:\*\*/);
  });

  test('an empty entry body is a covered no-changes version, unreadable content is not', () => {
    // conventional-changelog emits a bare heading for a release with no
    // fix/feat commits — the vue 3.5.37 shape.
    const empty = parseChangelogMarkdown('## [3.5.38](url) (2026-06-11)\n## [3.5.37](url) (2026-06-11)\n## [3.5.36](url) (2026-06-11)\n\n### Bug Fixes\n\n- real fix\n');
    assert.equal(empty[0].noChanges, true);
    assert.equal(empty[1].noChanges, true);
    assert.equal(empty[2].noChanges, false);
    assert.equal(empty[2].itemCount, 1);
    // Prose the parser cannot structure still covers the version as one item
    // instead of claiming nothing changed.
    const prose = parseChangelogMarkdown('## 1.2.3\n\nRewrote the resolver for performance.\n');
    assert.equal(prose[0].noChanges, false);
    assert.equal(prose[0].itemCount, 1);
  });

  test('entry headings that merely contain a version are not version headings', () => {
    const entries = parseChangelogMarkdown('# 2.0.0\n\n#### Support TypeScript 5.6.2 in the parser\n');
    assert.deepEqual(entries.map((entry) => entry.version), ['2.0.0']);
    assert.deepEqual(entries[0].sections[0].items, ['Support TypeScript 5.6.2 in the parser']);
  });
});

describe('extractBullets', () => {
  test('joins indented continuation lines and drops nested bullets', () => {
    const items = extractBullets([
      '- top level item that',
      '  continues on the next line',
      '  - nested detail dropped',
      '- second item',
    ]);
    assert.deepEqual(items, ['top level item that continues on the next line', 'second item']);
  });
});

describe('listChangelogFiles', () => {
  test('package directory beats root beats siblings; templates never match', () => {
    const ranked = listChangelogFiles(
      [
        'CHANGELOG.md',
        'changelog_unreleased/TEMPLATE.md',
        'pkgs/tz/CHANGELOG.md',
        'pkgs/core/CHANGELOG.md',
        'docs/HISTORY.md',
      ],
      { pathFilter: 'pkgs/core' },
    );
    assert.deepEqual(ranked, ['pkgs/core/CHANGELOG.md', 'CHANGELOG.md', 'docs/HISTORY.md', 'pkgs/tz/CHANGELOG.md']);
  });
});

describe('collect chain merge', () => {
  const t1 = {
    tier: 'T1',
    source: 'GITHUB_RELEASES_ATOM',
    ok: true,
    precision: 'RELEASE_NOTE',
    coverage: 0.333,
    coverageThreshold: 0.8,
    targetVersions: ['1.0.1', '1.0.2', '1.0.3'],
    coveredVersions: ['1.0.3'],
    missingVersions: [
      { version: '1.0.1', reason: 'BEYOND_ENTRY_LIMIT' },
      { version: '1.0.2', reason: 'NO_ITEMS_IN_BODY' },
    ],
    evidence: { source: 'GITHUB_RELEASES_ATOM', rateLimitCost: 0, collectedAt: 'now' },
    sourceReleases: [
      { version: '1.0.3', itemCount: 2 },
      // Seen by the feed but unreadable — the vite pattern.
      { version: '1.0.2', itemCount: 0 },
    ],
  };
  const t3 = {
    tier: 'T3_CHANGELOG',
    source: 'REPO_CHANGELOG',
    ok: true,
    precision: 'CHANGELOG',
    coverage: 0.5,
    targetVersions: ['1.0.1', '1.0.2'],
    coveredVersions: ['1.0.2'],
    missingVersions: [{ version: '1.0.1', reason: 'VERSION_NOT_IN_CHANGELOG' }],
    evidence: { source: 'REPO_CHANGELOG', rateLimitCost: 0, collectedAt: 'now' },
    sourceReleases: [{ version: '1.0.2', itemCount: 3 }],
  };

  test('a version T1 saw but could not read keeps only the tier that read it', () => {
    const releases = dedupeReleases([t1, t3]);
    const v102 = releases.find((entry) => entry.release.version === '1.0.2');
    assert.equal(v102.tier, 'T3_CHANGELOG');
    assert.equal(releases.filter((entry) => entry.release.version === '1.0.2').length, 1);
  });

  test('missing reason comes from the last tier that tried, coverage from the union', () => {
    const merged = mergeCollection({
      packageName: 'demo',
      repository: 'owner/demo',
      targetVersions: ['1.0.1', '1.0.2', '1.0.3'],
      tiers: [t1, t3],
    });
    assert.deepEqual(merged.coveredVersions, ['1.0.2', '1.0.3']);
    assert.equal(merged.missingVersions.length, 1);
    assert.equal(merged.missingVersions[0].reason, 'VERSION_NOT_IN_CHANGELOG');
    assert.equal(merged.changeItemCount, 5);
    assert.deepEqual(merged.needsFallback, ['T2_REST_API']);
    // One row per version in the table the UI renders.
    assert.deepEqual(merged.collectedReleases.map((release) => release.version), ['1.0.3', '1.0.2']);
  });
});

describe('round-2 accuracy fixes', () => {
  test('atom release declaring "No significant changes" is covered with zero items', async () => {
    const { collectFromAtomXml } = await import('../src/collect/atom-collector.js');
    const atomXml = `<?xml version="1.0"?><feed>
      <entry>
        <id>tag:github.com,2008:Repository/1/v32.1.0</id>
        <title>v32.1.0</title>
        <updated>2026-07-01T00:00:00Z</updated>
        <link rel="alternate" href="https://github.com/unplugin/unplugin-vue-components/releases/tag/v32.1.0"/>
        <content type="html">&lt;p&gt;&lt;em&gt;No significant changes&lt;/em&gt;&lt;/p&gt;</content>
      </entry>
    </feed>`;
    const result = collectFromAtomXml({
      packageName: 'unplugin-vue-components',
      repository: 'unplugin/unplugin-vue-components',
      atomXml,
      targetVersions: ['32.1.0'],
    });
    assert.deepEqual(result.coveredVersions, ['32.1.0']);
    assert.deepEqual(result.missingVersions, []);
    assert.equal(result.releases[0].items.length, 0);
  });

  test('a merged revert PR with trailing ref is a change item, with the ref kept', async () => {
    const { parseConventionalCommit } = await import('../src/collect/git-collector.js');
    const parsed = parseConventionalCommit('Revert "fix: generate unique component id" (#548)');
    assert.equal(parsed.type, 'revert');
    assert.match(parsed.summary, /^revert "generate unique component id" \(#548\)$/);
  });
});
