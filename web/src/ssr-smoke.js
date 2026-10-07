/*
 * Render-only smoke test. Not shipped to the browser build.
 *
 * There is no headless browser in this environment, so every screen is
 * rendered through vue/server-renderer with a pre-populated store to catch
 * template reference errors (missing bindings, wrong ref unwrapping) that a
 * type-free SFC would otherwise only surface at runtime.
 *
 * This harness is the one file that reaches into both workspaces, because its
 * job is to render each of them. It is a build-time entry, never bundled into
 * the app, so the workspaces still never meet at runtime.
 */
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import PrototypeApp from './prototype/PrototypeApp.vue';
import { useAnalysis as usePrototypeAnalysis } from './prototype/state/analysis.js';
import ProductApp from './product/ProductApp.vue';
import { useAnalysis as useProductAnalysis } from './product/state/analysis.js';

const WORKSPACES = {
  prototype: { component: PrototypeApp, useAnalysis: usePrototypeAnalysis },
  product: { component: ProductApp, useAnalysis: useProductAnalysis },
};

export const WORKSPACE_KEYS = Object.keys(WORKSPACES);

export async function renderScreens(fixtures, options = {}) {
  const key = options.workspace ?? 'prototype';
  const workspace = WORKSPACES[key];
  if (!workspace) throw new Error(`unknown workspace: ${key}`);

  const analysis = workspace.useAnalysis();
  const results = [];

  for (const fixture of fixtures) {
    Object.assign(analysis.state, fixture.patch);
    const app = createSSRApp(workspace.component);
    // eslint-disable-next-line no-await-in-loop
    const html = await renderToString(app);
    results.push({ workspace: key, name: fixture.name, length: html.length, html });
  }

  return results;
}
