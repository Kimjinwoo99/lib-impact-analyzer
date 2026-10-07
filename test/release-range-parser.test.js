import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildChangelogParseResult, compareSemver, selectReleasesInUpgradeRange } from '../src/changelog/release-range-parser.js';

const releases = [
  {
    version: '3.6.10',
    tagName: 'v3.6.10',
    publishedAt: '2024-01-01T00:00:00Z',
    sourceUrl: 'https://example.test/v3.6.10',
    sections: [{ title: ':wrench: Bug Fixes', items: ['**VDatePicker:** current release fix ([abc1234](https://github.com/vuetifyjs/vuetify/commit/abc1234))'] }],
  },
  {
    version: '3.6.11',
    tagName: 'v3.6.11',
    publishedAt: '2024-01-02T00:00:00Z',
    sourceUrl: 'https://example.test/v3.6.11',
    sections: [
      { title: ':rocket: Features', items: ['**VBtn:** add feature ([bbbbbbb](https://github.com/vuetifyjs/vuetify/commit/bbbbbbb))'] },
      { title: ':warning: Breaking Changes', items: ['**VApp:** remove deprecated behavior ([ccccccc](https://github.com/vuetifyjs/vuetify/commit/ccccccc))'] },
      { title: ':wrench: Bug Fixes', items: ['**VSelect:** fix menu behavior ([#100](https://github.com/vuetifyjs/vuetify/issues/100)) ([abcdef1](https://github.com/vuetifyjs/vuetify/commit/abcdef1)), closes [#99](https://github.com/vuetifyjs/vuetify/issues/99)'] },
    ],
  },
  {
    version: '4.1.5',
    tagName: 'v4.1.5',
    publishedAt: '2026-07-13T00:00:00Z',
    sourceUrl: 'https://example.test/v4.1.5',
    sections: [{ title: ':rocket: Features', items: ['**VTable:** add caption slot ([1234567](https://github.com/vuetifyjs/vuetify/commit/1234567))'] }],
  },
];

describe('release range parser', () => {
  it('selects all releases in (current, target] order', () => {
    const selected = selectReleasesInUpgradeRange(releases, '3.6.10', '4.1.5');
    assert.deepEqual(selected.map((release) => release.version), ['3.6.11', '4.1.5']);
  });

  it('healthcheck reads forward through later patches in the same minor line', () => {
    const result = buildChangelogParseResult({ packageName: 'vuetify', currentVersion: '3.6.10', releases });
    assert.equal(result.mode, 'CURRENT_VERSION_HEALTHCHECK');
    assert.equal(result.targetVersion, null);

    // 3.6.10 for context + 3.6.11 because its fixes describe defects still
    // present in 3.6.10. 4.1.5 is a different minor line and is excluded.
    assert.equal(result.releaseCount, 2);
    assert.deepEqual(result.releases.map((release) => release.version), ['3.6.10', '3.6.11']);
    assert.deepEqual(result.releases.map((release) => release.versionRole), ['CURRENT', 'PATCH_AHEAD']);

    assert.equal(result.latestPatchInLine, '3.6.11');
    assert.equal(result.patchesAhead, 1);
    assert.equal(result.range.minorLine, '3.6');
    // The stated limitation must say, in plain words, that fixes landing only
    // in later minors are invisible to a same-line healthcheck.
    assert.ok(result.range.limitation.includes('수정판이 나오지 않은 결함'));

    assert.equal(result.items[0].scope, 'VDatePicker');
    assert.equal(result.items[0].versionRole, 'CURRENT');
    assert.ok(result.items.slice(1).every((item) => item.versionRole === 'PATCH_AHEAD'));
  });

  it('healthcheck on the newest patch reports nothing ahead', () => {
    const result = buildChangelogParseResult({ packageName: 'vuetify', currentVersion: '3.6.11', releases });
    assert.equal(result.patchesAhead, 0);
    assert.equal(result.latestPatchInLine, null);
    assert.equal(result.releaseCount, 1);
    assert.deepEqual(result.releases.map((release) => release.versionRole), ['CURRENT']);
  });

  it('builds upgrade impact result in display order and extracts structured item fields', () => {
    const result = buildChangelogParseResult({ packageName: 'vuetify', currentVersion: '3.6.10', targetVersion: '4.1.5', releases });
    assert.equal(result.mode, 'UPGRADE_IMPACT');
    assert.equal(result.releaseCount, 3);
    assert.equal(result.upgradeReleaseCount, 2);
    assert.equal(result.changeItemCount, 5);
    assert.deepEqual(result.releases.map((release) => release.versionRole), ['CURRENT', 'TARGET', 'INTERMEDIATE']);
    assert.deepEqual(result.releases.map((release) => release.version), ['3.6.10', '4.1.5', '3.6.11']);
    assert.deepEqual(result.items.map((item) => item.version), ['3.6.10', '4.1.5', '3.6.11', '3.6.11', '3.6.11']);
    assert.deepEqual(result.releases[2].items.map((item) => item.category), ['BREAKING', 'BUG_FIX', 'FEATURE']);
    const bugFix = result.releases[2].items[1];
    assert.equal(bugFix.scope, 'VSelect');
    assert.deepEqual(bugFix.prNumbers, [100, 99]);
    assert.deepEqual(bugFix.issueNumbers, [99]);
    assert.deepEqual(bugFix.commitHashes, ['abcdef1']);
  });

  it('compares semver text numerically', () => {
    assert.equal(compareSemver('3.10.0', '3.9.9'), 1);
    assert.equal(compareSemver('3.6.10', '3.6.10'), 0);
    assert.equal(compareSemver('3.6.9', '3.6.10'), -1);
  });
});
