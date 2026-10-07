import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { assembleJudgmentEvidence } from '../src/agent/l6-evidence.js';

function makeProject(files) {
  const root = mkdtempSync(resolve(tmpdir(), 'l6-evidence-'));
  for (const [path, content] of Object.entries(files)) {
    const full = resolve(root, path);
    mkdirSync(resolve(full, '..'), { recursive: true });
    writeFileSync(full, content, 'utf8');
  }
  return root;
}

describe('assembleJudgmentEvidence', () => {
  it('is a no-op when the project path is missing or unreadable — never throws', () => {
    const result = assembleJudgmentEvidence({ packageName: 'vite', currentVersion: '5.2.11' });
    assert.deepEqual(result, { payload: { packageName: 'vite', currentVersion: '5.2.11' }, planQuality: {}, scannedFiles: 0 });

    const result2 = assembleJudgmentEvidence({ packageName: 'vite', projectPath: '/definitely/does/not/exist' });
    assert.equal(result2.scannedFiles, 0);
  });

  it('attaches usageEvidence to a selected item and to a review group by scope', () => {
    const project = makeProject({
      'main.scss': "@import './parts/palette';\n",
      'package.json': '{}',
    });
    const payload = {
      packageName: 'vite',
      currentVersion: '7.0.0',
      targetVersion: '8.0.0',
      projectPath: project,
      classifiedItems: [
        { itemId: 'a', reviewRequired: true, version: '7.0.0', scope: 'css', summary: 'sass', inspectionPlan: { searchTerms: ['@import'], fileGlobs: ['*.scss'] } },
      ],
      reviewGroups: [{ scope: 'VSelect', count: 3, usageVerdict: 'UNDETERMINED', fileCount: 0, items: [] }],
    };

    const { payload: enriched, scannedFiles } = assembleJudgmentEvidence(payload);
    assert.ok(scannedFiles >= 1);
    const item = enriched.classifiedItems.find((entry) => entry.itemId === 'a');
    assert.ok(item.usageEvidence.files.some((file) => file.path === 'main.scss'));

    // The fixture has no VSelect usage anywhere — this must come back as
    // "searched, not there" (unmatchedTerms), not a silent empty result.
    const group = enriched.reviewGroups.find((entry) => entry.scope === 'VSelect');
    assert.deepEqual(group.usageEvidence.files, []);
    assert.ok(group.usageEvidence.unmatchedTerms.some((term) => term.term === 'VSelect'));
  });

  it('does not attach usageEvidence to an item the L6 gate would not select (large range, no review flag)', () => {
    const project = makeProject({ 'package.json': '{}' });
    const classifiedItems = Array.from({ length: 25 }, (unused, index) => ({
      itemId: `item-${index}`,
      reviewRequired: index < 3,
      preliminaryRisk: 'MEDIUM',
      version: '7.0.0',
      scope: 'css',
      summary: `change ${index}`,
      inspectionPlan: { searchTerms: [] },
    }));
    const { payload: enriched } = assembleJudgmentEvidence({
      packageName: 'vite',
      projectPath: project,
      classifiedItems,
    });
    const unselected = enriched.classifiedItems.find((item) => item.itemId === 'item-10');
    assert.equal(unselected.usageEvidence, undefined, 'an item outside the review-filter gate should not carry usageEvidence');
    const selected = enriched.classifiedItems.find((item) => item.itemId === 'item-0');
    assert.ok(selected.usageEvidence, 'a reviewRequired item within the gate should carry usageEvidence');
  });

  it('reports an empty references array for a candidate with no reference anywhere, never omits it', () => {
    const project = makeProject({ 'package.json': '{}' });
    const { payload: enriched } = assembleJudgmentEvidence({
      packageName: 'vite',
      projectPath: project,
      peerAudit: { targetVersion: '8.0.0', rows: [{ name: 'ghost-plugin', verdict: 'DEAD_END' }] },
    });
    assert.deepEqual(enriched.peerAudit.rows[0].references, []);
  });

  it('leaves peerAudit untouched when there is no audit at all', () => {
    const project = makeProject({ 'package.json': '{}' });
    const { payload: enriched } = assembleJudgmentEvidence({ packageName: 'vite', projectPath: project });
    assert.equal(enriched.peerAudit, undefined);
  });

  it('surfaces planQuality without leaking it into the payload buildL6Input reads', () => {
    const project = makeProject({ 'package.json': '{}' });
    const { payload: enriched, planQuality } = assembleJudgmentEvidence({
      packageName: 'vite',
      projectPath: project,
      classifiedItems: [{ itemId: 'a', reviewRequired: true, version: '1.0.0', summary: 'x', inspectionPlan: { searchTerms: ['nope-anywhere'] } }],
    });
    assert.ok(planQuality['item:a']);
    assert.ok(planQuality['item:a'].termsMatchedNothing.includes('nope-anywhere'));
    assert.equal(enriched.classifiedItems[0].planQuality, undefined, 'planQuality must not ride along on the item itself');
  });

  it('emits a log line summarizing what was scanned', () => {
    const project = makeProject({ 'package.json': '{}' });
    const logs = [];
    assembleJudgmentEvidence(
      { packageName: 'vite', projectPath: project, classifiedItems: [{ itemId: 'a', reviewRequired: true, inspectionPlan: {} }] },
      { onLog: (entry) => logs.push(entry) },
    );
    assert.equal(logs.length, 1);
    assert.match(logs[0].message, /evidence assembled/);
  });
});
