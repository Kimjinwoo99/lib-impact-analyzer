import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { groupJudgmentsByAction } from '../web/src/product/lib/actionGroups.js';
import { foldSmokeGroups, procedureOf, workRowStats } from '../web/src/product/lib/verifyProcedures.js';

/*
 * 확인 필요의 절차 병합 — 골든 실측(32건 → 절차 3 + 개별 1)의 결정론 재현.
 * 원칙: 유사도 없음(사전 키워드만) · 미매칭은 개별 행 · 정보는 접히지 않고 묶임.
 */

function smoke(unit, verify) {
  return { unit, verdict: 'SMOKE_TEST', reason: '', action: null, verify, files: [] };
}

describe('procedureOf — the curated dictionary', () => {
  it('routes by keyword with specificity order: typecheck beats build in a mixed sentence', () => {
    assert.equal(procedureOf('빌드 후 타입체크 실행으로 오류 확인')?.key, 'TYPECHECK');
    assert.equal(procedureOf('개발 서버 구동 후 HMR 확인')?.key, 'DEV_SMOKE');
    assert.equal(procedureOf('프로덕션 빌드 산출물 확인')?.key, 'BUILD_SMOKE');
  });

  it('returns null for a verify sentence the dictionary does not cover', () => {
    assert.equal(procedureOf('다른 포트의 API 호출 시 CORS 오류 여부 확인'), null);
    assert.equal(procedureOf(null), null);
  });
});

describe('foldSmokeGroups — the golden shape', () => {
  it('folds 32-style rows into procedures and keeps the unmatched one as a single', () => {
    const judgments = [
      smoke('group:types', '타입체크(vue-tsc) 실행 후 관련 에러 확인'),
      smoke('item:a:1', '타입체크 실행으로 관련 오류 없는지 확인'),
      smoke('group:hmr', '개발 서버 구동 후 HMR 정상 동작 확인'),
      smoke('guide:Advanced', '개발 서버 기동 후 프록시 및 HMR 확인'),
      smoke('group:css', '빌드 시 CSS/SCSS 컴파일 경고·에러 확인'),
      smoke('group:build', '프로덕션 빌드 실행 후 산출물 정상 여부 확인'),
      smoke('item:cors:1', '다른 포트/도메인 API 호출 시 CORS 오류 발생 여부 확인'),
    ];
    const groups = groupJudgmentsByAction(judgments);
    const { procedures, singles } = foldSmokeGroups(groups);

    assert.deepEqual(procedures.map((p) => [p.key, p.entries.length]), [
      ['TYPECHECK', 2],
      ['DEV_SMOKE', 2],
      ['BUILD_SMOKE', 2],
    ]);
    assert.equal(singles.length, 1);
    assert.equal(singles[0].judgment.unit, 'item:cors:1');
    // 확인 포인트는 전부 절차 안에 남는다 — 접힘이 아니라 묶임.
    const totalEntries = procedures.reduce((sum, p) => sum + p.entries.length, 0) + singles.length;
    assert.equal(totalEntries, judgments.length);
  });
});

describe('smokePoints absorption — the run summary stops being an unanchored copy', () => {
  it('routes a summary point into its procedure as a note, even with no judgment entries', () => {
    const { procedures } = foldSmokeGroups([], ['프로덕션 빌드 후 산출물의 브라우저 호환 범위 확인']);
    assert.equal(procedures.length, 1);
    assert.equal(procedures[0].key, 'BUILD_SMOKE');
    assert.equal(procedures[0].entries.length, 0);
    assert.deepEqual(procedures[0].notes, ['프로덕션 빌드 후 산출물의 브라우저 호환 범위 확인']);
  });

  it('promotes a dictionary-miss point to a standalone row instead of dropping it', () => {
    const { procedures } = foldSmokeGroups([], ['크로스오리진 API 호출이 차단되는지 여부']);
    assert.equal(procedures.length, 1);
    assert.equal(procedures[0].standalone, true);
    assert.equal(procedures[0].run, '크로스오리진 API 호출이 차단되는지 여부');
  });

  it('does not promote a point whose identifier a judgment already covers — no instruction-less copies', () => {
    /*
     * 골든 실측 케이스: 총평 "resolve.mainFields ... 모듈 해석 결과 변화"는
     * 지시 없는 명사구인데, 같은 토큰을 근거에 쥔 가이드 판정이 이미 방법
     * (verify)과 함께 존재한다 — 승격하면 방법 없는 사본이 된다.
     */
    const covering = {
      unit: 'guide:Removed Module Resolution Using Format Sniffing',
      verdict: 'SMOKE_TEST',
      reason: 'resolve.mainFields를 설정하지 않아 기본 해석 동작을 그대로 적용받음.',
      action: null,
      verify: '브라우저에서 앱을 로드해 서드파티 import가 정상 해석되는지 확인',
      files: [],
    };
    const { procedures } = foldSmokeGroups(
      groupJudgmentsByAction([covering]),
      ['resolve.mainFields 미설정 상태에서 포맷 스니핑 제거로 인한 모듈 해석 결과 변화'],
      [covering],
    );
    // 판정 자체는 사전 미매칭 verify라 개별(single)로 남고, 총평 승격은 없다.
    assert.equal(procedures.filter((p) => p.standalone).length, 0);
  });

  it('attaches points to procedures that judgments already created', () => {
    const groups = groupJudgmentsByAction([smoke('group:hmr', '개발 서버 구동 후 HMR 확인')]);
    const { procedures } = foldSmokeGroups(groups, ['dev 서버 프록시 경유 시 HMR 연결 확인']);
    assert.equal(procedures.length, 1);
    assert.equal(procedures[0].entries.length, 1);
    assert.equal(procedures[0].notes.length, 1);
  });
});

describe('workRowStats — the one definition badges and KPI share', () => {
  it('rows = action groups + procedures + singles; done counts procedure units too', () => {
    const judgments = [
      { unit: 'chain:node', verdict: 'ACTION_REQUIRED', action: 'Node 업그레이드', reason: '', verify: null, files: [] },
      smoke('group:hmr', '개발 서버 구동 후 HMR 확인'),
      smoke('group:build', '프로덕션 빌드 후 산출물 확인'),
      smoke('item:cors:1', 'CORS 오류 여부 확인'),
      { unit: 'item:na:1', verdict: 'NOT_AFFECTED', reason: '미사용', action: null, verify: null, files: [] },
    ];
    const groups = groupJudgmentsByAction(judgments);
    const stats = workRowStats(groups, {
      'procedure:DEV_SMOKE': { checked: true, note: 'dev 스모크 완료' },
      'chain:node': { checked: true, note: '상향 완료' },
    });
    assert.equal(stats.action, 1);
    assert.equal(stats.smoke, 3); // DEV + BUILD + 개별 1
    assert.equal(stats.total, 4);
    assert.equal(stats.done, 2);
  });
});
