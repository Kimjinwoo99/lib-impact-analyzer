import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { buildManualCheckRows, openReviewGroups } from '../web/src/product/state/manualCheck.js';

/*
 * The vuetify 3→4 measurement shape, miniaturized: review groups that all
 * went to L6, most judged, some not. The manual tab must count only the
 * unjudged remainder as reading work — judged groups are the checklist's
 * business (SMOKE_TEST rows there; NOT_AFFECTED a decision, not a task).
 */
const l4Result = {
  inputSummary: {
    deferredTriage: {
      review: Array.from({ length: 10 }, (unused, index) => ({ itemId: `it${index}` })),
      reviewGroups: [
        { scope: 'VSelect', count: 4 },
        { scope: 'VDialog', count: 3 },
        { scope: 'VBadge', count: 2 },
        { scope: 'VTreeview', count: 1 },
      ],
    },
  },
};

const l6Result = {
  judgments: [
    { unit: 'group:VSelect', verdict: 'SMOKE_TEST' },
    { unit: 'group:VBadge', verdict: 'NOT_AFFECTED' },
    // item/guide units must not be mistaken for group coverage.
    { unit: 'item:v4.0.0:breaking-changes:1', verdict: 'ACTION_REQUIRED' },
  ],
};

const reviewRow = (rows) => rows.find((row) => row.category === '분류 범위');

describe('manual check — review groups inherit L6 group verdicts', () => {
  it('counts only judgment-less groups as reading work once L6 ran', () => {
    const row = reviewRow(buildManualCheckRows({ l4Result, l6Result }));
    // VSelect(ST)·VBadge(NA) are covered; VDialog·VTreeview (3+1건) remain.
    assert.equal(row.target, '추가 검토 2개 영역 (4건)');
    assert.match(row.reason, /나머지 2개 영역은 판정 완료/);
  });

  it('produces no reading-work row when every group is judged', () => {
    const allJudged = {
      judgments: l4Result.inputSummary.deferredTriage.reviewGroups.map((group) => ({
        unit: `group:${group.scope}`,
        verdict: 'NOT_AFFECTED',
      })),
    };
    const rows = buildManualCheckRows({ l4Result, l6Result: allJudged });
    assert.equal(reviewRow(rows), undefined);
  });

  it('keeps the full list as homework while L6 has not run', () => {
    const row = reviewRow(buildManualCheckRows({ l4Result, l6Result: null }));
    assert.equal(row.target, '추가 검토 4개 영역 (10건)');
    assert.equal(row.state.label, '원문 확인');
  });

  it('the row is a doorway to the in-tab review list, not a pointer to an evidence tab', () => {
    // 수집/변경사항/분류결과 탭은 증거 보관용 — 검토 동선을 그리로 보내지 않는다.
    for (const l6 of [l6Result, null]) {
      const row = reviewRow(buildManualCheckRows({ l4Result, l6Result: l6 }));
      assert.equal(row.drill, 'review-groups');
      assert.ok(!row.recommendation.includes('분류결과 탭'));
      assert.match(row.recommendation, /행을 클릭해/);
    }
  });
});

describe('open review groups — the drill-down list source', () => {
  it('returns unjudged groups sorted by project usage (file count first)', () => {
    const withUsage = {
      inputSummary: {
        deferredTriage: {
          review: [{}, {}, {}],
          reviewGroups: [
            { scope: 'VDialog', count: 3, fileCount: 8 },
            { scope: 'VSelect', count: 4, fileCount: 173 },
            { scope: 'types', count: 2, fileCount: 0 },
          ],
        },
      },
    };
    const open = openReviewGroups(withUsage, { judgments: [{ unit: 'group:VDialog', verdict: 'NOT_AFFECTED' }] });
    assert.deepEqual(open.map((group) => group.scope), ['VSelect', 'types']);
  });

  it('treats every group as open before L6 runs', () => {
    assert.equal(openReviewGroups(l4Result, null).length, 4);
  });
});
