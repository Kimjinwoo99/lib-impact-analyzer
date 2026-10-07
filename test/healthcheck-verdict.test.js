import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { assembleHealthcheckVerdict } from '../src/collect/healthcheck-verdict.js';

const ACTIVE_LINE = { myLine: '3.6', latestOverall: '3.6.15', myLineIsLatest: true, lineFloor: '3.6.15', status: 'ACTIVE', fixForwardCount: 0, fixForwardSince: null };
const DORMANT_LINE = { myLine: '3.6', latestOverall: '4.1.8', myLineIsLatest: false, lineFloor: '3.6.15', status: 'DORMANT', fixForwardCount: 8, fixForwardSince: '2024-06-01T00:00:00Z' };

const CURRENT_ITEM = { itemId: 'v3.6.10:bug-fixes:1', versionRole: 'CURRENT', scope: 'VSelect' };
const USED_PATCH = { itemId: 'v3.6.15:bug-fixes:2', versionRole: 'PATCH_AHEAD', scope: 'VSelect' };
const UNUSED_PATCH = { itemId: 'v3.6.12:bug-fixes:1', versionRole: 'PATCH_AHEAD', scope: 'VTreeview' };

describe('healthcheck verdict — priority order', () => {
  it('SECURITY outranks everything, even a dormant line', () => {
    const verdict = assembleHealthcheckVerdict({
      packageName: 'axios', currentVersion: '1.2.0', lineHealth: DORMANT_LINE,
      vulnerabilities: [{ id: 'GHSA-1', severity: 'HIGH', firstFixed: '1.5.0' }],
      items: [CURRENT_ITEM, USED_PATCH],
      usageByItemId: { [USED_PATCH.itemId]: { verdict: 'USED' } },
    });
    assert.equal(verdict.level, 'SECURITY');
    assert.equal(verdict.routingTargetVersion, '1.5.0');
    // 라우팅 버튼 옆에 뜨는 근거 — "왜 이 버전인가"가 비어 있으면 안 된다.
    assert.match(verdict.routingReason, /가장 낮은 버전/);
  });

  it('SECURITY outranks DEPRECATED, and DEPRECATED outranks a dormant line', () => {
    const secured = assembleHealthcheckVerdict({
      packageName: 'x', currentVersion: '1.0.0', lineHealth: ACTIVE_LINE,
      vulnerabilities: [{ id: 'GHSA-1', firstFixed: '1.0.1' }],
      deprecation: { deprecated: true, message: 'use y instead' },
      items: [], usageByItemId: {},
    });
    assert.equal(secured.level, 'SECURITY');

    const deprecated = assembleHealthcheckVerdict({
      packageName: 'x', currentVersion: '1.0.0', lineHealth: DORMANT_LINE,
      vulnerabilities: [], deprecation: { deprecated: true, message: 'critical bug, use 1.0.1' },
      items: [], usageByItemId: {},
    });
    assert.equal(deprecated.level, 'DEPRECATED');
    // 메인테이너의 원문을 그대로 인용한다 — paraphrase하지 않는다.
    assert.equal(deprecated.detail, 'critical bug, use 1.0.1');
    assert.equal(deprecated.routingTargetVersion, DORMANT_LINE.latestOverall);
    assert.match(deprecated.routingReason, /지목할 근거가 없어/);
  });

  it('LINE_DORMANT fires when the line was abandoned, regardless of usage', () => {
    const verdict = assembleHealthcheckVerdict({
      packageName: 'vuetify', currentVersion: '3.6.10', lineHealth: DORMANT_LINE,
      vulnerabilities: [], items: [CURRENT_ITEM], usageByItemId: {},
    });
    assert.equal(verdict.level, 'LINE_DORMANT');
    assert.match(verdict.detail, /8개 릴리즈/);
    assert.equal(verdict.routingTargetVersion, '4.1.8');
    assert.match(verdict.routingReason, /지목할 근거가 없습니다/);
  });

  it('PATCH_AVAILABLE fires only when a later-in-line patch touches a USED scope', () => {
    const verdict = assembleHealthcheckVerdict({
      packageName: 'vuetify', currentVersion: '3.6.10', lineHealth: ACTIVE_LINE,
      vulnerabilities: [], items: [CURRENT_ITEM, USED_PATCH, UNUSED_PATCH],
      usageByItemId: { [USED_PATCH.itemId]: { verdict: 'USED' }, [UNUSED_PATCH.itemId]: { verdict: 'UNUSED' } },
    });
    assert.equal(verdict.level, 'PATCH_AVAILABLE');
    assert.deepEqual(verdict.usedItems.map((item) => item.itemId), [USED_PATCH.itemId]);
    assert.equal(verdict.routingTargetVersion, ACTIVE_LINE.lineFloor);
    assert.match(verdict.routingReason, /호환성을 깨지 않으므로/);
  });

  /*
   * The CURRENT-release item must never count as an "unapplied fix" even if
   * usage marks its scope USED — it describes what 3.6.10 itself already
   * fixed, not something still broken.
   */
  it('a USED verdict on the CURRENT-release item does not trigger PATCH_AVAILABLE', () => {
    const verdict = assembleHealthcheckVerdict({
      packageName: 'vuetify', currentVersion: '3.6.10', lineHealth: ACTIVE_LINE,
      vulnerabilities: [], items: [CURRENT_ITEM],
      usageByItemId: { [CURRENT_ITEM.itemId]: { verdict: 'USED' } },
    });
    assert.equal(verdict.level, 'HEALTHY');
  });

  it('HEALTHY distinguishes "nothing to fix" from "fixes exist but are irrelevant"', () => {
    const nothingToFix = assembleHealthcheckVerdict({
      packageName: 'vuetify', currentVersion: '3.6.15', lineHealth: ACTIVE_LINE,
      vulnerabilities: [], items: [CURRENT_ITEM], usageByItemId: {},
    });
    assert.equal(nothingToFix.level, 'HEALTHY');
    assert.match(nothingToFix.headline, /최신 패치를 쓰고 있습니다/);

    const irrelevantFixes = assembleHealthcheckVerdict({
      packageName: 'vuetify', currentVersion: '3.6.10', lineHealth: ACTIVE_LINE,
      vulnerabilities: [], items: [CURRENT_ITEM, UNUSED_PATCH],
      usageByItemId: { [UNUSED_PATCH.itemId]: { verdict: 'UNUSED' } },
    });
    assert.equal(irrelevantFixes.level, 'HEALTHY');
    assert.match(irrelevantFixes.headline, /무관합니다/);
    assert.equal(irrelevantFixes.patchAheadCount, 1);
  });

  it('without a usage scan (no projectPath), PATCH_AVAILABLE cannot fire — absence of a check is not evidence of use', () => {
    const verdict = assembleHealthcheckVerdict({
      packageName: 'vuetify', currentVersion: '3.6.10', lineHealth: ACTIVE_LINE,
      vulnerabilities: [], items: [CURRENT_ITEM, USED_PATCH], usageByItemId: {},
    });
    assert.equal(verdict.level, 'HEALTHY');
  });
});

describe('healthcheck verdict — security target selection', () => {
  /*
   * The bug this section pins: recommending "latest" for a security finding
   * overstates what is required. A fix in 3.7.2 needs a target of 3.7.2, not
   * a jump to 4.1.8 — and "latest" was not even guaranteed to contain a fix
   * at all when OSV names none.
   */
  it('targets the highest of each vulnerability\'s own minimum fix, not the overall latest', () => {
    const verdict = assembleHealthcheckVerdict({
      packageName: 'x', currentVersion: '1.0.0', lineHealth: { ...ACTIVE_LINE, latestOverall: '9.9.9' },
      vulnerabilities: [
        { id: 'GHSA-1', firstFixed: '1.2.0' },
        { id: 'GHSA-2', firstFixed: '1.5.0' }, // the higher bar — target must clear this one too
      ],
      items: [], usageByItemId: {},
    });
    assert.equal(verdict.routingTargetVersion, '1.5.0');
    assert.equal(verdict.detail, null);
  });

  it('states the unresolved count and still offers the partial fix when some vulnerabilities have no fix yet', () => {
    const verdict = assembleHealthcheckVerdict({
      packageName: 'x', currentVersion: '1.0.0', lineHealth: ACTIVE_LINE,
      vulnerabilities: [
        { id: 'GHSA-1', firstFixed: '1.2.0' },
        { id: 'GHSA-2', firstFixed: null }, // no fix published anywhere yet
      ],
      items: [], usageByItemId: {},
    });
    assert.equal(verdict.routingTargetVersion, '1.2.0');
    assert.match(verdict.detail, /1건은 아직 해결 버전이 없습니다/);
  });

  /*
   * When NOTHING is fixed yet, offering "latest" as if it were a remedy is
   * the exact false-confidence this tool exists to avoid — no target, and
   * the headline says so instead of implying upgrading helps.
   */
  it('offers no routing target when no vulnerability has a published fix', () => {
    const verdict = assembleHealthcheckVerdict({
      packageName: 'x', currentVersion: '1.0.0', lineHealth: ACTIVE_LINE,
      vulnerabilities: [{ id: 'GHSA-1', firstFixed: null }],
      items: [], usageByItemId: {},
    });
    assert.equal(verdict.routingTargetVersion, null);
    assert.match(verdict.headline, /해결 버전이 아직 발행되지 않았습니다/);
  });
});
