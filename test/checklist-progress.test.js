import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { useAnalysis } from '../web/src/product/state/analysis.js';

const { state, completeChecklistItem, reopenChecklistItem } = useAnalysis();

beforeEach(() => {
  state.checklistProgress = {};
});

describe('checklistProgress', () => {
  it('does nothing without both a check and a note', () => {
    completeChecklistItem('chain:vite-plugin-vue-layouts', '');
    assert.deepEqual(state.checklistProgress, {});
  });

  it('does nothing without a unit', () => {
    completeChecklistItem('', '레이아웃 플러그인 제거 완료');
    assert.deepEqual(state.checklistProgress, {});
  });

  it('records checked, trimmed note, and a completion timestamp', () => {
    completeChecklistItem('chain:vite-plugin-vue-layouts', '  레이아웃 플러그인 제거 완료  ');
    const entry = state.checklistProgress['chain:vite-plugin-vue-layouts'];
    assert.equal(entry.checked, true);
    assert.equal(entry.note, '레이아웃 플러그인 제거 완료');
    assert.equal(typeof entry.completedAt, 'string');
    assert.ok(!Number.isNaN(Date.parse(entry.completedAt)));
  });

  it('a blank note is rejected even after trimming', () => {
    completeChecklistItem('chain:x', '   ');
    assert.equal(state.checklistProgress['chain:x'], undefined);
  });

  it('reopening removes the entry entirely, not just the checked flag', () => {
    completeChecklistItem('chain:x', '처리함');
    reopenChecklistItem('chain:x');
    assert.equal(state.checklistProgress['chain:x'], undefined);
  });

  it('tracks multiple units independently', () => {
    completeChecklistItem('chain:a', '완료 A');
    completeChecklistItem('chain:b', '완료 B');
    assert.equal(state.checklistProgress['chain:a'].note, '완료 A');
    assert.equal(state.checklistProgress['chain:b'].note, '완료 B');
  });
});
