import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { judgmentLineRefs } from '../web/src/product/lib/judgmentLineRefs.js';

describe('judgment line refs — 판정문이 지목한 파일:라인 추출', () => {
  it('reads single lines and ranges, by full path or basename', () => {
    const refs = judgmentLineRefs('vite.config.js', [
      { unit: 'chain:@vitejs/plugin-vue', verdict: 'ACTION_REQUIRED', reason: 'vite.config.js:2,23에서 실사용', action: 'package.json:39의 @vitejs/plugin-vue를 상향' },
      { unit: 'item:8.0.0:breaking-changes:6', verdict: 'ACTION_REQUIRED', reason: 'vite.config.js:46-59에서 build.rollupOptions.output.manualChunks(id) 사용' },
    ]);
    assert.deepEqual(refs.map((ref) => [ref.start, ref.end]), [[2, 2], [46, 59]]);
    // package.json:39는 이 파일의 참조가 아니다.
    assert.ok(refs.every((ref) => ref.start !== 39));
  });

  it('does not mistake another file that merely ends with the same name', () => {
    // `runtime/env.d.ts` 화면에서 `env.d.ts:5`는 잡고, `otherenv.d.ts:9`는 버린다.
    const refs = judgmentLineRefs('runtime/env.d.ts', [
      { unit: 'chain:x', verdict: 'ACTION_REQUIRED', action: 'env.d.ts:5의 타입 참조 수정, otherenv.d.ts:9는 무관' },
    ]);
    assert.deepEqual(refs.map((ref) => ref.start), [5]);
  });

  it('caps runaway ranges and dedupes repeated citations', () => {
    const refs = judgmentLineRefs('a.js', [
      { unit: 'u1', verdict: 'SMOKE_TEST', reason: 'a.js:10-500 전체' },
      { unit: 'u2', verdict: 'SMOKE_TEST', reason: '같은 곳: a.js:10-500' },
    ]);
    assert.equal(refs.length, 1);
    assert.ok(refs[0].end - refs[0].start < 20);
  });

  it('returns nothing when the judgments cite no lines for this file', () => {
    assert.deepEqual(
      judgmentLineRefs('package.json', [{ unit: 'u', verdict: 'ACTION_REQUIRED', reason: 'engines 필드가 없음' }]),
      [],
    );
  });
});
