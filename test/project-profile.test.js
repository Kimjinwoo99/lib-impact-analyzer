import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { describe } from 'node:test';
import { detectProjectProfile } from '../src/source-match/project-profile.js';
import { prescanScopeUsage } from '../src/source-match/component-usage.js';
import { buildL6Input } from '../src/agent/l6-prompt.js';

/*
 * 프로젝트 프로파일 — JS 프로젝트에 타입 전용 항목이 "확인 불가"로 남던
 * 결함(vite 골든 재채점)의 수정. 핵심 경계: .d.ts만 있는 프로젝트는 TS를
 * "받는" 것이지 "쓰는" 것이 아니고, 프로파일을 못 읽으면 강등하지 않는다.
 */

function makeProject({ tsconfig = false, vueTscScript = false, tsSource = false, dtsOnly = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'project-profile-'));
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(join(root, 'src', 'main.js'), 'export const ok = 1;\n');
  if (dtsOnly) writeFileSync(join(root, 'src', 'env.d.ts'), 'declare const x: number;\n');
  if (tsSource) writeFileSync(join(root, 'src', 'store.ts'), 'export const n: number = 1;\n');
  if (tsconfig) writeFileSync(join(root, 'tsconfig.json'), '{}');
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({
      name: 'fixture',
      scripts: vueTscScript ? { typecheck: 'vue-tsc --noEmit' } : { dev: 'vite' },
    }),
  );
  return root;
}

describe('detectProjectProfile', () => {
  test('a JS project with only generated d.ts files has no type pipeline', () => {
    const profile = detectProjectProfile(makeProject());
    assert.equal(profile.hasTsconfig, false);
    assert.equal(profile.typeCheckScript, null);
    // .d.ts는 TS 소스로 세지 않는다 — 선언만 받는 프로젝트다.
    assert.equal(profile.tsSourceFileCount, 0);
    assert.equal(profile.hasTypePipeline, false);
  });

  test('each pipeline signal alone flips the verdict: tsconfig, script, ts source', () => {
    assert.equal(detectProjectProfile(makeProject({ tsconfig: true })).hasTypePipeline, true);
    const withScript = detectProjectProfile(makeProject({ vueTscScript: true }));
    assert.equal(withScript.hasTypePipeline, true);
    assert.equal(withScript.typeCheckScript, 'typecheck');
    assert.equal(detectProjectProfile(makeProject({ tsSource: true })).hasTypePipeline, true);
  });

  test('an unreadable path is null — unknown, not "a JS project"', () => {
    assert.equal(detectProjectProfile(join(tmpdir(), 'no-such-project-xyz')), null);
    assert.equal(detectProjectProfile(''), null);
  });
});

describe('type-only scope demotion in the usage prescan', () => {
  const ITEMS = [
    { itemId: 't', scope: 'types' },
    { itemId: 'g', scope: 'validation' }, // 타입과 무관한 일반어는 그대로
  ];

  test('a types-scoped deferred item in a JS project is confirmed UNUSED', () => {
    const result = prescanScopeUsage(makeProject(), ITEMS);
    assert.equal(result.byItemId.t.verdict, 'UNUSED');
    assert.equal(result.byItemId.t.reason, 'NO_TYPE_PIPELINE');
    assert.equal(result.byItemId.g.verdict, 'UNDETERMINED');
  });

  test('the same item in a TS project stays UNDETERMINED — the pipeline can be affected', () => {
    const result = prescanScopeUsage(makeProject({ tsconfig: true }), ITEMS);
    assert.equal(result.byItemId.t.verdict, 'UNDETERMINED');
    assert.equal(result.byItemId.t.reason, 'GENERIC_SCOPE');
  });
});

describe('L6 input carries the type-pipeline fact', () => {
  test('an absent pipeline becomes an explicit present:false with its evidence note', () => {
    const input = buildL6Input({
      packageName: 'vite',
      currentVersion: '5.2.11',
      targetVersion: '8.2.1',
      projectProfile: { hasTsconfig: false, typeCheckScript: null, tsSourceFileCount: 0, hasTypePipeline: false },
    });
    assert.equal(input.project.typePipeline.present, false);
    assert.ok(input.project.typePipeline.note.includes('도달 경로가 없다'));
  });

  test('no profile means null — the model must not read absence-of-data as absence-of-pipeline', () => {
    const input = buildL6Input({ packageName: 'vite', currentVersion: '5.2.11' });
    assert.equal(input.project.typePipeline, null);
  });
});
