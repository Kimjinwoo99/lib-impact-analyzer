/*
 * ⚠ 사용 중지 (2026-08-13) — 화면은 실구현(product)으로 고정됐다.
 *
 * App.vue가 ProductApp을 직접 마운트하므로 이 레지스트리와 선택 바는 더 이상
 * 참조되지 않는다(번들에도 포함되지 않는다). 파일럿 시안을 다시 붙일 때를
 * 위해 지우지 않고 남겨 두었다 — 복원 방법은 App.vue 상단 주석 참고.
 */
/*
 * Workspace registry.
 *
 * The app ships two independent implementations of the same dashboard:
 *
 *   prototype  the pilot screens built as the design reference. Keeps its mock
 *              placeholders, so it can show the full flow end to end.
 *   product    the real implementation. Renders measured data only; anything
 *              the backend cannot produce yet stays visibly empty.
 *
 * They are separate on purpose. Each workspace owns its own store, api client,
 * views and components under `web/src/<key>/`, and nothing crosses between the
 * two directories — a change inside one cannot alter the other's behaviour.
 * The only shared files are `styles/tokens.css` and `assets/`, because both
 * workspaces are the same product visually.
 *
 * Loading is lazy: the inactive workspace's modules — including its reactive
 * store singleton — are never evaluated, so an unselected workspace holds no
 * state and issues no requests.
 *
 * WORKSPACE CONTRACT
 * Each root component must expose three functions via `defineExpose`. The
 * shell uses only these; it never imports a workspace's store.
 *
 *   hasWorkToDiscard(): boolean   work a switch would throw away
 *   discardPoints():    string[]  what exactly is lost, for the confirm dialog
 *   teardown():         void      abort requests, cancel server jobs, clear
 *                                 timers, reset state — called before unmount
 */

import { defineAsyncComponent } from 'vue';

const STORAGE_KEY = 'lib-impact-analyzer:workspace';

export const WORKSPACES = Object.freeze([
  Object.freeze({
    key: 'prototype',
    label: '테스트',
    tone: 'test',
    summary: '파일럿 시안 화면 · 미구현 단계는 mock 표시',
    component: defineAsyncComponent(() => import('../prototype/PrototypeApp.vue')),
  }),
  Object.freeze({
    key: 'product',
    label: '실구현',
    tone: 'product',
    summary: '실데이터만 표시 · 미구현 단계는 비워 둠',
    component: defineAsyncComponent(() => import('../product/ProductApp.vue')),
  }),
]);

export const DEFAULT_WORKSPACE_KEY = 'prototype';

export function findWorkspace(key) {
  return WORKSPACES.find((workspace) => workspace.key === key) ?? WORKSPACES[0];
}

export function readStoredWorkspace() {
  if (typeof localStorage === 'undefined') return DEFAULT_WORKSPACE_KEY;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return WORKSPACES.some((workspace) => workspace.key === stored) ? stored : DEFAULT_WORKSPACE_KEY;
  } catch {
    return DEFAULT_WORKSPACE_KEY;
  }
}

export function storeWorkspace(key) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, key);
  } catch {
    /* private mode — the choice simply does not survive a reload */
  }
}
