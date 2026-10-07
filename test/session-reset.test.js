import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

/**
 * The logo click wipes the session, and so does a workspace switch — the shell
 * calls the same `resetSession()` through the workspace contract. These tests
 * pin the two properties that are easy to break later: the reset must clear
 * every field (not just the ones someone remembered), and it must stop
 * server-side Agent work.
 *
 * Both workspaces are covered. They hold separate stores, so a guarantee
 * proven for one says nothing about the other.
 */

const WORKSPACES = [
  { key: 'prototype', module: '../web/src/prototype/state/analysis.js' },
  { key: 'product', module: '../web/src/product/state/analysis.js' },
];

function stubFetch(routes) {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    const path = String(url);
    calls.push({ path, method: options.method ?? 'GET' });
    const body = routes[Object.keys(routes).find((key) => path.includes(key))] ?? {};
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify(body),
    };
  };
  return calls;
}

function snapshot(state) {
  return JSON.parse(JSON.stringify(state));
}

for (const workspace of WORKSPACES) {
  describe(`session reset — ${workspace.key}`, () => {
    test('clears every field back to the initial snapshot', async () => {
      stubFetch({ '/api/config': { platform: 'test' } });
      const { useAnalysis } = await import(workspace.module);
      const analysis = useAnalysis();
      const { state } = analysis;
      const initial = snapshot(state);

      Object.assign(state, {
        view: 'result',
        activeTab: 'impact',
        projectPath: 'C:/somewhere',
        message: '뭔가 진행 중',
        messageTone: 'ok',
        lastAnalyzedAt: new Date('2026-01-01'),
        busy: true,
        error: 'boom',
        dependencies: { packages: [] },
        librarySearch: 'vue',
        libraryTypeFilter: 'devDependencies',
        librarySort: 'NAME',
        selectedDependency: { name: 'vuetify', resolvedVersion: '3.6.10' },
        targetVersion: '4.1.5',
        tick: 42,
        useMock: true,
        parseResult: { changeItemCount: 1150 },
        l4JobId: 'l4-abc',
        l4Status: 'success',
        l4Logs: [{ stream: 'system', message: 'x' }],
        l4Execution: { result: { items: [] } },
        selectedItemId: 'item-1',
        sourceMatch: { candidateFiles: [] },
        selectedFilePath: 'src/main.ts',
      });
      state.steps[0].status = 'done';
      state.steps[0].startedAt = 1;
      state.steps[0].endedAt = 2;

      analysis.resetSession();

      assert.deepEqual(snapshot(state), initial);
    });

    test('cancels a running Agent job on the server', async () => {
      const calls = stubFetch({ '/api/config': {}, '/cancel': { status: 'cancelled' } });
      const { useAnalysis } = await import(workspace.module);
      const analysis = useAnalysis();
      analysis.state.l4JobId = 'l4-running';
      analysis.state.l4Status = 'running';

      analysis.resetSession();

      const cancel = calls.find((call) => call.path.includes('/cancel'));
      assert.ok(cancel, 'expected a cancel request for the running job');
      assert.equal(cancel.method, 'POST');
      assert.ok(cancel.path.includes('l4-running'));
    });

    test('does not send a cancel when no job is running', async () => {
      const calls = stubFetch({ '/api/config': {} });
      const { useAnalysis } = await import(workspace.module);
      const analysis = useAnalysis();
      analysis.state.l4JobId = 'l4-finished';
      analysis.state.l4Status = 'success';

      analysis.resetSession();

      assert.equal(
        calls.filter((call) => call.path.includes('/cancel')).length,
        0,
      );
    });

    test('hasWorkToDiscard flags a run in flight or a finished classification', async () => {
      stubFetch({ '/api/config': {} });
      const { useAnalysis } = await import(workspace.module);
      const analysis = useAnalysis();
      analysis.resetSession();
      assert.equal(analysis.hasWorkToDiscard.value, false);

      analysis.state.busy = true;
      assert.equal(analysis.hasWorkToDiscard.value, true);

      analysis.state.busy = false;
      analysis.state.l4Execution = { result: { items: [] } };
      assert.equal(analysis.hasWorkToDiscard.value, true);

      analysis.resetSession();
      assert.equal(analysis.hasWorkToDiscard.value, false);
    });
  });
}

describe('workspace isolation', () => {
  test('the two stores are separate instances', async () => {
    stubFetch({ '/api/config': {} });
    const prototype = (await import('../web/src/prototype/state/analysis.js')).useAnalysis();
    const product = (await import('../web/src/product/state/analysis.js')).useAnalysis();

    assert.notEqual(prototype.state, product.state);

    prototype.state.projectPath = 'C:/prototype-only';
    prototype.state.l4Execution = { result: { items: [{ itemId: 'x' }] } };

    assert.equal(product.state.projectPath, '');
    assert.equal(product.state.l4Execution, null);

    // And a reset on one leaves the other untouched.
    product.state.projectPath = 'C:/product-only';
    product.resetSession();
    assert.equal(prototype.state.projectPath, 'C:/prototype-only');
  });

  test('only the prototype workspace ships mock placeholders', async () => {
    const prototype = await import('../web/src/prototype/state/analysis.js');
    const product = await import('../web/src/product/state/analysis.js');

    assert.ok('impactJudgment' in prototype.useAnalysis());
    assert.equal('impactJudgment' in product.useAnalysis(), false);
  });
});
