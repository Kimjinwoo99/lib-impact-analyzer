import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  formatAdvisory,
  vulnerabilitySeverityTone,
  vulnerabilitySeverityRank,
  vulnerabilityDisplayId,
  compareVulnerabilities,
} from '../web/src/product/lib/advisory.js';

describe('formatAdvisory', () => {
  it('returns null for no advisory', () => {
    assert.equal(formatAdvisory(null), null);
  });

  it('states an exact count when every vulnerability is resolved', () => {
    const result = formatAdvisory({
      vulnerabilities: [{ resolved: true }, { resolved: true }],
      resolvedCount: 2,
      unresolvedCount: 0,
      pendingCount: 0,
      deprecated: null,
      targetVersion: '8.2.1',
    });
    assert.equal(result.tone, 'ok');
    assert.equal(result.text, '취약점 2건 모두 해결(목표 버전 8.2.1)');
  });

  // 회귀 픽스처: "일부는 해결되지 않습니다" 같은 얼버무리는 표현 대신
  // 항상 정확한 건수를 말한다.
  it('states exact resolved/unresolved counts when only some are resolved', () => {
    const result = formatAdvisory({
      vulnerabilities: [{ resolved: true }, { resolved: false }, { resolved: false }],
      resolvedCount: 1,
      unresolvedCount: 2,
      pendingCount: 0,
      deprecated: null,
      targetVersion: '6.0.0',
    });
    assert.equal(result.tone, 'bad');
    assert.equal(result.text, '취약점 3건 중 1건 해결, 2건 미해결(목표 버전 6.0.0)');
    assert.ok(!/일부/.test(result.text));
  });

  it('flags a missing target version distinctly from an unresolved one', () => {
    const result = formatAdvisory({
      vulnerabilities: [{ resolved: null }],
      resolvedCount: 0,
      unresolvedCount: 0,
      pendingCount: 1,
      deprecated: null,
      targetVersion: null,
    });
    assert.equal(result.tone, 'warn');
    assert.equal(result.text, '취약점 1건 — 비교할 목표 버전 없음');
  });

  it('appends a deprecated clause without overwriting a bad tone', () => {
    const result = formatAdvisory({
      vulnerabilities: [{ resolved: false }],
      resolvedCount: 0,
      unresolvedCount: 1,
      pendingCount: 0,
      deprecated: '더 이상 유지보수되지 않습니다',
      targetVersion: '2.0.0',
    });
    assert.equal(result.tone, 'bad');
    assert.equal(result.text, '취약점 1건 중 0건 해결, 1건 미해결(목표 버전 2.0.0) · npm 지원 종료(deprecated)');
  });

  it('reports deprecated-only as warn with no vulnerability clause', () => {
    const result = formatAdvisory({
      vulnerabilities: [],
      resolvedCount: 0,
      unresolvedCount: 0,
      pendingCount: 0,
      deprecated: '더 이상 유지보수되지 않습니다',
      targetVersion: null,
    });
    assert.equal(result.tone, 'warn');
    assert.equal(result.text, 'npm 지원 종료(deprecated)');
  });
});

describe('vulnerabilitySeverityTone', () => {
  it('flags HIGH/CRITICAL as bad', () => {
    assert.equal(vulnerabilitySeverityTone('HIGH'), 'bad');
    assert.equal(vulnerabilitySeverityTone('CRITICAL'), 'bad');
  });
  it('flags everything else as warn', () => {
    assert.equal(vulnerabilitySeverityTone('MODERATE'), 'warn');
    assert.equal(vulnerabilitySeverityTone('LOW'), 'warn');
  });
  it('flags missing severity as idle', () => {
    assert.equal(vulnerabilitySeverityTone(null), 'idle');
  });
});

describe('vulnerabilityDisplayId', () => {
  it('prefers the CVE alias when present', () => {
    assert.equal(vulnerabilityDisplayId({ id: 'GHSA-x', aliases: ['CVE-2025-1'] }), 'CVE-2025-1');
  });
  it('falls back to the raw id with no CVE alias', () => {
    assert.equal(vulnerabilityDisplayId({ id: 'GHSA-x', aliases: [] }), 'GHSA-x');
  });
});

describe('vulnerabilitySeverityRank', () => {
  it('ranks CRITICAL above HIGH above MODERATE above LOW', () => {
    assert.ok(vulnerabilitySeverityRank('CRITICAL') < vulnerabilitySeverityRank('HIGH'));
    assert.ok(vulnerabilitySeverityRank('HIGH') < vulnerabilitySeverityRank('MODERATE'));
    assert.ok(vulnerabilitySeverityRank('MODERATE') < vulnerabilitySeverityRank('LOW'));
  });
  it('sends unrecognized free-text severity to the back, not the front', () => {
    assert.ok(vulnerabilitySeverityRank('CVSS:3.1/AV:N/AC:L') > vulnerabilitySeverityRank('LOW'));
    assert.ok(vulnerabilitySeverityRank(null) > vulnerabilitySeverityRank('LOW'));
  });
});

describe('compareVulnerabilities', () => {
  const item = (overrides) => ({ resolved: true, severity: 'LOW', published: null, ...overrides });

  it('sorts unresolved before pending before resolved', () => {
    const items = [item({ resolved: true }), item({ resolved: false }), item({ resolved: null })];
    const order = [...items].sort(compareVulnerabilities).map((v) => v.resolved);
    assert.deepEqual(order, [false, null, true]);
  });

  it('within the same resolved status, sorts higher severity first', () => {
    const items = [item({ severity: 'LOW' }), item({ severity: 'CRITICAL' }), item({ severity: 'MODERATE' })];
    const order = [...items].sort(compareVulnerabilities).map((v) => v.severity);
    assert.deepEqual(order, ['CRITICAL', 'MODERATE', 'LOW']);
  });

  it('within the same severity, sorts the most recently published first', () => {
    const items = [
      item({ published: '2024-01-01T00:00:00Z' }),
      item({ published: '2026-01-01T00:00:00Z' }),
      item({ published: '2025-01-01T00:00:00Z' }),
    ];
    const order = [...items].sort(compareVulnerabilities).map((v) => v.published.slice(0, 4));
    assert.deepEqual(order, ['2026', '2025', '2024']);
  });

  it('sends a missing publish date to the end within its severity tier', () => {
    const items = [item({ published: null }), item({ published: '2025-06-01T00:00:00Z' })];
    const order = [...items].sort(compareVulnerabilities).map((v) => v.published);
    assert.deepEqual(order, ['2025-06-01T00:00:00Z', null]);
  });
});
