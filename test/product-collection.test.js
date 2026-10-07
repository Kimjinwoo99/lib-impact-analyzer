import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { useAnalysis } from '../web/src/product/state/analysis.js';

/**
 * The collection table is the product workspace's answer to "what did we
 * actually read". Its one load-bearing property: a version that never came
 * back still gets a row. Building the table from what arrived would silently
 * drop exactly the versions the user needs to know about.
 */

const collection = {
  packageName: 'vuetify',
  repository: 'vuetifyjs/vuetify',
  targetVersions: ['3.6.11', '3.6.12', '3.6.13'],
  coveredVersions: ['3.6.11', '3.6.13'],
  missingVersions: [{ version: '3.6.12', reason: 'NO_ITEMS_IN_BODY' }],
  collectedReleases: [
    { version: '3.6.13', tagName: 'v3.6.13', publishedAt: '2026-07-03T00:00:00Z', sourceUrl: 'https://example.test/3', itemCount: 4 },
    { version: '3.6.12', tagName: 'v3.6.12', publishedAt: '2026-07-02T00:00:00Z', sourceUrl: 'https://example.test/2', itemCount: 0 },
    { version: '3.6.11', tagName: 'v3.6.11', publishedAt: '2026-07-01T00:00:00Z', sourceUrl: 'https://example.test/1', itemCount: 2 },
  ],
};

describe('product collection view', () => {
  test('emits one row per target version, newest first', () => {
    globalThis.fetch = async () => ({ ok: true, status: 200, text: async () => '{}' });
    const analysis = useAnalysis();
    analysis.resetSession();
    analysis.state.collection = collection;

    const rows = analysis.collectionRows.value;
    assert.deepEqual(rows.map((row) => row.version), ['3.6.13', '3.6.12', '3.6.11']);
    assert.deepEqual(rows.map((row) => row.covered), [true, false, true]);
    assert.equal(rows[1].reason, 'NO_ITEMS_IN_BODY');
    assert.equal(rows[1].itemCount, 0);
    assert.equal(rows[0].itemCount, 4);
  });

  test('keeps a row for a version the feed never returned', () => {
    globalThis.fetch = async () => ({ ok: true, status: 200, text: async () => '{}' });
    const analysis = useAnalysis();
    analysis.resetSession();
    analysis.state.collection = {
      ...collection,
      coveredVersions: ['3.6.11'],
      missingVersions: [
        { version: '3.6.12', reason: 'NO_ITEMS_IN_BODY' },
        { version: '3.6.13', reason: 'BEYOND_ENTRY_LIMIT' },
      ],
      collectedReleases: collection.collectedReleases.filter((release) => release.version === '3.6.11'),
    };

    const rows = analysis.collectionRows.value;
    assert.equal(rows.length, 3);
    const beyond = rows.find((row) => row.version === '3.6.13');
    assert.equal(beyond.covered, false);
    assert.equal(beyond.reason, 'BEYOND_ENTRY_LIMIT');
    assert.equal(beyond.sourceUrl, null);
  });

  test('is empty until a collection has run', () => {
    globalThis.fetch = async () => ({ ok: true, status: 200, text: async () => '{}' });
    const analysis = useAnalysis();
    analysis.resetSession();
    assert.deepEqual(analysis.collectionRows.value, []);
  });
});
