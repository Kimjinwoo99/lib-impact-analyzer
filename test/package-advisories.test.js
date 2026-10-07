import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { useAnalysis } from '../web/src/product/state/analysis.js';
import { diffRequirements } from '../src/collect/package-info.js';

const { state, packageAdvisories } = useAnalysis();

function vuln({ id = 'GHSA-test', firstFixed = null } = {}) {
  return { id, aliases: [], summary: 'test vuln', severity: null, fixedIn: firstFixed ? [firstFixed] : [], firstFixed, published: null, url: null };
}

// package-info.js의 collectPackageInfoBatch()가 실제로 만드는 card 모양
// 그대로 — deprecated는 registry가 아니라 requirements 쪽에 있다(버그로
// registry 쪽을 읽었던 적이 있어, mock이 그 실수를 그대로 따라가지 않게
// 실제 collectPackageInfoBatch/diffRequirements 계약에 맞춘다).
function infoCard({ vulnerabilities = [], deprecated = null } = {}) {
  return {
    vulnerabilities: { ok: true, count: vulnerabilities.length, items: vulnerabilities, error: null },
    requirements: { deprecated: { installed: deprecated, compared: null } },
  };
}

beforeEach(() => {
  state.selectedDependency = null;
  state.targetVersion = '';
  state.infoCards = {};
  state.peerAudit = null;
});

describe('packageAdvisories', () => {
  it('is empty with no dependency selected', () => {
    assert.deepEqual(packageAdvisories.value, {});
  });

  it('marks a vulnerability resolved (per item and in aggregate) when the target clears it', () => {
    state.selectedDependency = { name: 'vite' };
    state.targetVersion = '8.2.1';
    state.infoCards = { vite: infoCard({ vulnerabilities: [vuln({ firstFixed: '6.0.0' })] }) };

    const advisory = packageAdvisories.value.vite;
    assert.equal(advisory.vulnerabilities.length, 1);
    assert.equal(advisory.vulnerabilities[0].resolved, true);
    assert.equal(advisory.resolvedCount, 1);
    assert.equal(advisory.unresolvedCount, 0);
    assert.equal(advisory.pendingCount, 0);
    assert.equal(advisory.targetVersion, '8.2.1');
  });

  it('marks a vulnerability unresolved when the target version does not clear it', () => {
    state.selectedDependency = { name: 'vite' };
    state.targetVersion = '6.0.0';
    state.infoCards = { vite: infoCard({ vulnerabilities: [vuln({ firstFixed: '8.0.0' })] }) };

    const advisory = packageAdvisories.value.vite;
    assert.equal(advisory.vulnerabilities[0].resolved, false);
    assert.equal(advisory.resolvedCount, 0);
    assert.equal(advisory.unresolvedCount, 1);
  });

  it('is unresolved when no fix has been published at all, regardless of target', () => {
    state.selectedDependency = { name: 'vite' };
    state.targetVersion = '8.2.1';
    state.infoCards = { vite: infoCard({ vulnerabilities: [vuln({ firstFixed: null })] }) };

    const advisory = packageAdvisories.value.vite;
    assert.equal(advisory.vulnerabilities[0].resolved, false);
    assert.equal(advisory.unresolvedCount, 1);
  });

  it('reports pendingCount, not unresolved, when there is no target version to compare against yet', () => {
    state.selectedDependency = { name: 'vite' };
    state.targetVersion = '';
    state.infoCards = { vite: infoCard({ vulnerabilities: [vuln({ firstFixed: '8.0.0' })] }) };

    const advisory = packageAdvisories.value.vite;
    assert.equal(advisory.vulnerabilities[0].resolved, null);
    assert.equal(advisory.pendingCount, 1);
    assert.equal(advisory.resolvedCount, 0);
    assert.equal(advisory.unresolvedCount, 0);
  });

  it('mixes resolved and unresolved items in one package independently', () => {
    state.selectedDependency = { name: 'vite' };
    state.targetVersion = '5.4.18';
    state.infoCards = {
      vite: infoCard({
        vulnerabilities: [vuln({ id: 'a', firstFixed: '5.4.10' }), vuln({ id: 'b', firstFixed: '6.0.0' })],
      }),
    };

    const advisory = packageAdvisories.value.vite;
    assert.equal(advisory.vulnerabilities.find((v) => v.id === 'a').resolved, true);
    assert.equal(advisory.vulnerabilities.find((v) => v.id === 'b').resolved, false);
    assert.equal(advisory.resolvedCount, 1);
    assert.equal(advisory.unresolvedCount, 1);
  });

  it('surfaces a deprecated package even with no vulnerabilities', () => {
    state.selectedDependency = { name: 'vite-plugin-remove-console' };
    state.infoCards = { 'vite-plugin-remove-console': infoCard({ deprecated: '더 이상 유지보수되지 않습니다' }) };

    const advisory = packageAdvisories.value['vite-plugin-remove-console'];
    assert.equal(advisory.deprecated, '더 이상 유지보수되지 않습니다');
    assert.equal(advisory.vulnerabilities.length, 0);
  });

  /*
   * 실제로 한 번 터진 버그: card.registry.deprecated를 읽었는데 실제 계약은
   * card.requirements.deprecated다(package-info.js의 diffRequirements 참고).
   * mock을 직접 짜면 그 실수를 그대로 따라가므로, 진짜 diffRequirements()가
   * 만드는 모양을 그대로 통과시켜 계약이 다시 어긋나면 여기서 잡는다.
   */
  it('reads deprecated from the real diffRequirements() shape, not a hand-rolled mock', () => {
    const metadata = {
      versions: { '2.2.0': { deprecated: '더 이상 유지보수되지 않습니다' } },
      'dist-tags': { latest: '2.2.0' },
    };
    const requirements = diffRequirements(metadata, '2.2.0');
    assert.equal(requirements.deprecated.installed, '더 이상 유지보수되지 않습니다');

    state.selectedDependency = { name: 'vite-plugin-remove-console' };
    state.infoCards = {
      'vite-plugin-remove-console': { vulnerabilities: { ok: true, count: 0, items: [] }, requirements },
    };

    assert.equal(packageAdvisories.value['vite-plugin-remove-console'].deprecated, '더 이상 유지보수되지 않습니다');
  });

  it('says nothing about a healthy package — no noisy all-clear entries', () => {
    state.selectedDependency = { name: 'vite' };
    state.infoCards = { vite: infoCard() };

    assert.equal(packageAdvisories.value.vite, undefined);
  });

  it('covers peerAudit.blocked companions, checked against their own firstCompatible', () => {
    state.selectedDependency = { name: 'vite' };
    state.infoCards = {
      vite: infoCard(),
      'vite-plugin-vue-layouts': infoCard({ vulnerabilities: [vuln({ firstFixed: '1.0.0' })] }),
    };
    state.peerAudit = { blocked: [{ name: 'vite-plugin-vue-layouts', firstCompatible: '1.0.0' }], companions: [] };

    const advisory = packageAdvisories.value['vite-plugin-vue-layouts'];
    assert.equal(advisory.resolvedCount, 1);
    assert.equal(advisory.targetVersion, '1.0.0');
  });

  it('falls back to latestVersion for a companion with no firstCompatible', () => {
    state.selectedDependency = { name: 'vite' };
    state.infoCards = {
      vite: infoCard(),
      'unplugin-vue-components': infoCard({ vulnerabilities: [vuln({ firstFixed: '32.1.0' })] }),
    };
    state.peerAudit = {
      blocked: [],
      companions: [{ name: 'unplugin-vue-components', firstCompatible: null, latestVersion: '32.1.0' }],
    };

    const advisory = packageAdvisories.value['unplugin-vue-components'];
    assert.equal(advisory.resolvedCount, 1);
    assert.equal(advisory.targetVersion, '32.1.0');
  });

  it('does not report a package that is not in scope for this run', () => {
    state.selectedDependency = { name: 'vite' };
    state.infoCards = { axios: infoCard({ vulnerabilities: [vuln({ firstFixed: '2.0.0' })] }) };
    state.peerAudit = { blocked: [], companions: [] };

    assert.deepEqual(packageAdvisories.value, {});
  });
});
