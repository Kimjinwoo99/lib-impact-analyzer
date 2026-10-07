import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { aggregateImpactFiles } from '../web/src/product/lib/impactFiles.js';

describe('run-level impact file aggregation', () => {
  it('folds judgment evidence files by path, most severe verdict first', () => {
    const judgments = [
      { unit: 'a', verdict: 'SMOKE_TEST', reason: 'sass 체인', files: ['runtime/skin/main.scss', 'vite.config.js'] },
      { unit: 'b', verdict: 'ACTION_REQUIRED', reason: 'manualChunks', action: '이전', files: ['vite.config.js'] },
      { unit: 'c', verdict: 'NOT_AFFECTED', reason: '없음 확인', files: ['runtime/entry.js'] },
      { unit: 'd', verdict: 'SMOKE_TEST', reason: '빈 경로 방어', files: ['', null] },
    ];

    const rows = aggregateImpactFiles(judgments);
    assert.deepEqual(rows.map((row) => row.path), ['vite.config.js', 'runtime/skin/main.scss']);
    // vite.config.js carries both verdicts; the badge is the severe one.
    assert.equal(rows[0].verdict, 'ACTION_REQUIRED');
    assert.equal(rows[0].judgments.length, 2);
    // Evidence-of-absence files are not "impact".
    assert.ok(!rows.some((row) => row.path === 'runtime/entry.js'));
  });
});
