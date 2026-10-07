import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { assessPatchLine } from '../src/collect/line-health.js';

/*
 * Shape modeled on the real gap this module closes: a 3.6.x line that got no
 * more patches once 3.7/4.0 shipped. "0 patches ahead" and "nobody is
 * backporting to this line anymore" must not read the same.
 */
const ABANDONED_LINE_METADATA = {
  'dist-tags': { latest: '4.1.8' },
  time: {
    '3.6.10': '2024-01-01T00:00:00Z',
    '3.6.15': '2024-02-01T00:00:00Z', // last patch in the 3.6 line
    '3.7.0': '2024-06-01T00:00:00Z',
    '4.0.0': '2025-01-01T00:00:00Z',
    '4.1.8': '2026-08-07T00:00:00Z',
  },
  versions: {
    '3.6.10': {}, '3.6.15': {}, '3.7.0': {}, '4.0.0': {}, '4.1.8': {},
  },
};

describe('patch line health', () => {
  it('marks a line DORMANT when a newer line shipped after the line\'s last patch', () => {
    const health = assessPatchLine({
      metadata: ABANDONED_LINE_METADATA,
      currentVersion: '3.6.10',
      latestPatchInLine: '3.6.15',
    });
    assert.equal(health.status, 'DORMANT');
    assert.equal(health.myLineIsLatest, false);
    assert.equal(health.lineFloor, '3.6.15');
    // Everything published after 3.6.15's date, on a different line.
    assert.equal(health.fixForwardCount, 3);
    assert.equal(health.fixForwardSince, '2024-06-01T00:00:00Z');
    assert.equal(health.latestOverall, '4.1.8');
  });

  it('is ACTIVE when the installed line IS the latest line, even with zero patches ahead', () => {
    const health = assessPatchLine({
      metadata: ABANDONED_LINE_METADATA,
      currentVersion: '4.1.8',
      latestPatchInLine: null,
    });
    assert.equal(health.status, 'ACTIVE');
    assert.equal(health.myLineIsLatest, true);
    assert.equal(health.fixForwardCount, 0);
  });

  /*
   * The line this pins: no later patch in-line YET, but the line has not
   * been superseded either — nothing to call dormant, this is just "current
   * and clean", not "abandoned".
   */
  it('is ACTIVE when no later patch exists in line but no newer line exists either', () => {
    const soleLineMetadata = {
      'dist-tags': { latest: '1.2.0' },
      time: { '1.2.0': '2026-01-01T00:00:00Z' },
      versions: { '1.2.0': {} },
    };
    const health = assessPatchLine({ metadata: soleLineMetadata, currentVersion: '1.2.0', latestPatchInLine: null });
    assert.equal(health.status, 'ACTIVE');
  });

  it('does not call a line dormant when the newer line existed but shipped nothing AFTER my last patch', () => {
    // A newer line exists but nothing was published after my line's floor —
    // e.g. registry `time` data is missing for later versions. Absence of
    // evidence must not manufacture a dormant verdict.
    const sparse = {
      'dist-tags': { latest: '2.0.0' },
      time: { '1.5.0': '2024-01-01T00:00:00Z' }, // 2.0.0 has no time entry
      versions: { '1.5.0': {}, '2.0.0': {} },
    };
    const health = assessPatchLine({ metadata: sparse, currentVersion: '1.5.0', latestPatchInLine: null });
    assert.equal(health.status, 'ACTIVE');
    assert.equal(health.fixForwardCount, 0);
  });
});
