import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import {
  buildReleaseCadence,
  buildVersionFacts,
  collectPackageInfoBatch,
  diffRequirements,
  summarizeOsvVulnerability,
} from '../src/collect/package-info.js';

const metadata = {
  'dist-tags': { latest: '4.0.2' },
  license: 'MIT',
  time: {
    modified: '2026-07-01T00:00:00Z',
    '2.2.3': '2024-09-01T00:00:00Z',
    '4.0.2': '2026-06-20T00:00:00Z',
  },
  versions: {
    '2.2.3': {
      version: '2.2.3',
      license: 'MIT',
      engines: { node: '>=16' },
      peerDependencies: { vue: '^3.4.0', typescript: '>=4.4.4' },
    },
    '3.0.0': { version: '3.0.0', license: 'MIT' },
    '4.0.2': {
      version: '4.0.2',
      license: 'Apache-2.0',
      deprecated: 'use v5',
      engines: { node: '>=20' },
      peerDependencies: { vue: '^3.5.0' },
    },
  },
};

describe('package info card', () => {
  test('version facts: distance and dates from the registry document', () => {
    const facts = buildVersionFacts(metadata, '2.2.3');
    assert.equal(facts.latest, '4.0.2');
    assert.equal(facts.behind.majors, 2);
    assert.equal(facts.behind.versionsAhead, 2);
    assert.equal(facts.installedPublishedAt, '2024-09-01T00:00:00Z');
    assert.equal(facts.latestPublishedAt, '2026-06-20T00:00:00Z');
    assert.equal(facts.upToDate, false);
  });

  test('requirement diff: license, engines, peers and per-version deprecation', () => {
    const diff = diffRequirements(metadata, '2.2.3');
    assert.equal(diff.comparedTo, '4.0.2');
    assert.equal(diff.license.changed, true);
    assert.equal(diff.engines.installed, '>=16');
    assert.equal(diff.engines.compared, '>=20');
    // typescript peer was dropped, vue's range moved. `optional` rides along
    // from peerDependenciesMeta (absent here → required, per npm semantics);
    // L6's chain units filter on it — an optional peer the project never
    // installed forces nothing, a required one forces an install.
    assert.deepEqual(diff.peerDependencies.removed, [{ name: 'typescript', range: '>=4.4.4', optional: false }]);
    assert.deepEqual(diff.peerDependencies.changed, [{ name: 'vue', from: '^3.4.0', to: '^3.5.0', optional: false }]);
    // Deprecation is per version: latest is, installed is not.
    assert.equal(diff.deprecated.installed, null);
    assert.equal(diff.deprecated.compared, 'use v5');
    // The full deprecated-version list rides along — the signal-path chart
    // needs the escape point on the path, which the two endpoints can't give.
    assert.deepEqual(diff.deprecated.versions, ['4.0.2']);
  });

  test('peerDependenciesMeta marks optional peers — the target declaration wins', () => {
    /*
     * The vite 5→8 shape: a dozen optional peers (less/stylus/sugarss/…)
     * whose ranges all move on a major. L6 drops chain units for the optional
     * ones the project never installed, so this flag is what separates ten
     * pieces of noise from the two findings that mattered.
     */
    const withMeta = {
      'dist-tags': { latest: '8.0.0' },
      time: { '5.0.0': '2024-01-01T00:00:00Z', '8.0.0': '2026-01-01T00:00:00Z' },
      versions: {
        '5.0.0': {
          version: '5.0.0',
          peerDependencies: { sass: '*', vue: '^3.4.0' },
          peerDependenciesMeta: { sass: { optional: true } },
        },
        '8.0.0': {
          version: '8.0.0',
          peerDependencies: { sass: '^1.70.0', vue: '^3.5.0', stylus: '^0.62.0' },
          peerDependenciesMeta: { sass: { optional: true }, stylus: { optional: true } },
        },
      },
    };
    const diff = diffRequirements(withMeta, '5.0.0', '8.0.0');
    const byName = Object.fromEntries([
      ...diff.peerDependencies.changed.map((peer) => [peer.name, peer.optional]),
      ...diff.peerDependencies.added.map((peer) => [peer.name, peer.optional]),
    ]);
    assert.equal(byName.sass, true);
    assert.equal(byName.stylus, true);
    // No meta entry — npm treats that as required, and so must this.
    assert.equal(byName.vue, false);
  });

  test('OSV summary keeps the actionable fields and the cheapest fix', () => {
    const summary = summarizeOsvVulnerability(
      {
        id: 'GHSA-xxxx',
        aliases: ['CVE-2026-0001'],
        summary: 'SSRF in redirect handling',
        database_specific: { severity: 'HIGH' },
        affected: [
          {
            package: { ecosystem: 'npm', name: 'axios' },
            ranges: [{ type: 'SEMVER', events: [{ introduced: '0' }, { fixed: '1.14.2' }] }],
          },
          {
            package: { ecosystem: 'npm', name: 'axios' },
            ranges: [{ type: 'SEMVER', events: [{ introduced: '2.0.0' }, { fixed: '2.1.0' }] }],
          },
          // A different package's range must not leak in.
          {
            package: { ecosystem: 'npm', name: 'other' },
            ranges: [{ type: 'SEMVER', events: [{ fixed: '9.9.9' }] }],
          },
        ],
      },
      'axios',
    );
    assert.equal(summary.severity, 'HIGH');
    assert.deepEqual(summary.fixedIn, ['1.14.2', '2.1.0']);
    assert.equal(summary.firstFixed, '1.14.2');
    assert.deepEqual(summary.aliases, ['CVE-2026-0001']);
  });

  test('firstFixed is relative to the installed version, not the lowest line', () => {
    const vuln = {
      id: 'GHSA-yyyy',
      affected: [
        {
          package: { ecosystem: 'npm', name: 'axios' },
          // Fix landed in both the 0.x maintenance line and the 1.x line.
          ranges: [{ type: 'SEMVER', events: [{ introduced: '0' }, { fixed: '0.30.3' }, { introduced: '1.0.0' }, { fixed: '1.15.2' }] }],
        },
      ],
    };
    // Installed 1.13.1: the 0.30.3 fix is below it and not an upgrade at all.
    assert.equal(summarizeOsvVulnerability(vuln, 'axios', '1.13.1').firstFixed, '1.15.2');
    // No fix above the installed version means no remediation exists yet.
    assert.equal(summarizeOsvVulnerability(vuln, 'axios', '2.0.0').firstFixed, null);
  });

  test('batch degrades per field: OSV failure leaves registry facts intact', async () => {
    const failingFetch = async (url) => {
      if (String(url).includes('osv.dev')) return { ok: false, status: 500, statusText: 'boom' };
      return { ok: true, status: 200, json: async () => ({ downloads: 1234 }) };
    };
    const cards = await collectPackageInfoBatch(
      [{ packageName: 'pinia', installedVersion: '2.2.3' }],
      { loadMetadata: async () => metadata, fetchImpl: failingFetch },
    );
    assert.equal(cards[0].registry.latest, '4.0.2');
    assert.equal(cards[0].downloads.lastMonth, 1234);
    assert.equal(cards[0].vulnerabilities.ok, false);
    assert.match(cards[0].vulnerabilities.error, /querybatch failed/);
  });

  test('release cadence: 12 UTC month buckets, prereleases and old versions excluded', () => {
    const cadence = buildReleaseCadence(
      {
        time: {
          created: '2020-01-01T00:00:00Z',
          modified: '2026-08-19T00:00:00Z',
          '1.0.0': '2024-01-15T00:00:00Z', // 창 밖 — 세지 않는다
          '2.0.0': '2025-09-30T23:59:00Z', // 창 첫 달
          '2.0.1': '2026-08-19T00:00:00Z',
          '2.0.2': '2026-08-01T00:00:00Z',
          '2.1.0-beta.1': '2026-08-05T00:00:00Z', // 프리릴리즈 — 세지 않는다
        },
        versions: {
          '1.0.0': {}, '2.0.0': {}, '2.0.1': {}, '2.0.2': {}, '2.1.0-beta.1': {},
        },
      },
      { now: '2026-08-23T00:00:00Z' },
    );

    assert.equal(cadence.months.length, 12);
    assert.equal(cadence.months[0].month, '2025-09');
    assert.equal(cadence.months[11].month, '2026-08');
    assert.equal(cadence.months[0].count, 1);
    assert.equal(cadence.months[11].count, 2);
    assert.equal(cadence.total, 3);
    assert.equal(cadence.peak, 2);
    assert.equal(cadence.quietMonths, 10);
    // 발행 순서는 버전 순서가 아니라 시각으로 판정한다.
    assert.equal(cadence.lastVersion, '2.0.1');
    assert.equal(cadence.lastPublishedAt, '2026-08-19T00:00:00Z');
  });

  test('release cadence: a dormant package still gets 12 empty buckets and its last publish', () => {
    const cadence = buildReleaseCadence(
      { time: { '1.0.0': '2018-08-07T00:00:00Z' }, versions: { '1.0.0': {} } },
      { now: '2026-08-23T00:00:00Z' },
    );
    assert.equal(cadence.months.length, 12);
    assert.equal(cadence.total, 0);
    assert.equal(cadence.peak, 0);
    assert.equal(cadence.quietMonths, 12);
    assert.equal(cadence.lastVersion, '1.0.0');
  });
});
