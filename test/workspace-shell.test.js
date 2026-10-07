import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import {
  DEFAULT_WORKSPACE_KEY,
  WORKSPACES,
  findWorkspace,
  readStoredWorkspace,
  storeWorkspace,
} from '../web/src/shell/workspaces.js';

/**
 * ⚠ 사용 중지된 모듈에 대한 테스트 (2026-08-13).
 *
 * 화면은 실구현(product)으로 고정됐고 App.vue는 ProductApp을 직접 마운트한다 —
 * 이 레지스트리와 선택 바는 더 이상 앱에서 참조되지 않는다. 파일럿 시안을
 * 다시 붙일 가능성 때문에 모듈을 지우지 않았으므로, 그때 곧바로 쓸 수 있도록
 * 해석 규칙(알 수 없는 키 폴백 · 저장된 선택 복원 · 스토리지 차단 내성)만
 * 그대로 유지한다. 지금 이 테스트가 지키는 것은 "복원 가능성"이지
 * "현재 화면의 정확성"이 아니다.
 */

function stubStorage(initial = {}) {
  const store = { ...initial };
  globalThis.localStorage = {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value);
    },
  };
  return store;
}

describe('workspace registry', () => {
  test('registers exactly the two implementations', () => {
    assert.deepEqual(WORKSPACES.map((workspace) => workspace.key), ['prototype', 'product']);
    assert.equal(DEFAULT_WORKSPACE_KEY, 'prototype');
  });

  test('each workspace loads a different component', () => {
    const [prototype, product] = WORKSPACES;
    assert.ok(prototype.component);
    assert.ok(product.component);
    assert.notEqual(prototype.component, product.component);
  });

  test('an unknown key falls back to the first workspace instead of rendering nothing', () => {
    assert.equal(findWorkspace('does-not-exist').key, 'prototype');
    assert.equal(findWorkspace(undefined).key, 'prototype');
    assert.equal(findWorkspace('product').key, 'product');
  });

  test('reads back a stored choice, and ignores a stale one', () => {
    stubStorage();
    assert.equal(readStoredWorkspace(), DEFAULT_WORKSPACE_KEY);

    storeWorkspace('product');
    assert.equal(readStoredWorkspace(), 'product');

    stubStorage({ 'lib-impact-analyzer:workspace': 'removed-workspace' });
    assert.equal(readStoredWorkspace(), DEFAULT_WORKSPACE_KEY);
  });

  test('survives storage being unavailable', () => {
    globalThis.localStorage = {
      getItem() {
        throw new Error('blocked');
      },
      setItem() {
        throw new Error('blocked');
      },
    };
    assert.equal(readStoredWorkspace(), DEFAULT_WORKSPACE_KEY);
    assert.doesNotThrow(() => storeWorkspace('product'));
  });
});
