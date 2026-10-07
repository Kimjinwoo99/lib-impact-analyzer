import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { groupJudgmentsByAction, countActionGroups } from '../web/src/product/lib/actionGroups.js';

/*
 * 작업 축 병합 — vite 골든 실행에서 Node 상향 하나가 판정 4행(릴리즈 항목 3 +
 * chain:node)으로 나열되던 문제. 병합 신호는 L6가 문장에 남기는 유닛 id
 * 참조뿐이고, 참조가 없으면 아무것도 접지 않는다.
 */

function j(unit, verdict, fields = {}) {
  return { unit, verdict, reason: '', action: null, verify: null, files: [], ...fields };
}

describe('groupJudgmentsByAction', () => {
  it('folds the recorded Node shape: three items reference chain:node as the same action', () => {
    const judgments = [
      j('item:7.0.0:breaking-changes:9', 'ACTION_REQUIRED', {
        action: '개발/CI 실행 환경 Node를 20.19+ 또는 22.12+로 업그레이드 (chain:node와 동일 조치)',
      }),
      j('item:7.0.0:breaking-changes:13', 'ACTION_REQUIRED', {
        action: 'package.json engines 필드에 Node 명시 및 실행 환경 업그레이드 (chain:node와 동일 조치)',
      }),
      j('item:7.0.0:miscellaneous-chores:75', 'ACTION_REQUIRED', {
        reason: 'Node 18 지원 제거(chain:node, item:7.0.0:breaking-changes:13과 동일 사안).',
        action: 'Node 20.19+ 또는 22.12+로 업그레이드',
      }),
      j('chain:node', 'ACTION_REQUIRED', {
        action: '실행 환경의 Node를 20.19+ 또는 22.12+로 업그레이드하고 package.json engines 필드 갱신',
      }),
      j('chain:@vitejs/plugin-vue', 'ACTION_REQUIRED', {
        action: '@vitejs/plugin-vue를 6.0.3 이상으로 업그레이드',
      }),
    ];

    const groups = groupJudgmentsByAction(judgments);
    assert.equal(groups.length, 2);

    const node = groups.find((group) => group.judgment.unit === 'chain:node');
    assert.ok(node, 'chain:node가 대표여야 한다 — 코드가 만든 유닛이 조치 문장이 가장 완전하다');
    assert.deepEqual(
      node.members.map((member) => member.unit),
      [
        'item:7.0.0:breaking-changes:9',
        'item:7.0.0:breaking-changes:13',
        'item:7.0.0:miscellaneous-chores:75',
      ],
    );

    const plugin = groups.find((group) => group.judgment.unit === 'chain:@vitejs/plugin-vue');
    assert.equal(plugin.members.length, 0);
  });

  /*
   * 2026-08-20 실측(vite 5.3.2→8.2.2, 실제 프로젝트): 같은 모델·같은 프롬프트인데
   * 골든의 "(chain:node와 동일 조치)"가 아니라 "…변경과 동일한 사안이다"로 나왔고,
   * 조사 「한」과 수식어가 끼어 병합이 0건이 됐다(Node 4건이 4행). 표현이 흔들려도
   * 접히도록 명사 거리를 허용하되, 판정 전체가 아니라 문장 단위로만 본다.
   */
  it('folds when a particle or modifier sits between 동일 and the noun — the 2026-08-20 wording', () => {
    const judgments = [
      j('chain:node', 'ACTION_REQUIRED', {
        action: 'Node.js를 20.19+ 또는 22.12+로 업그레이드하고 package.json engines 필드 갱신',
      }),
      j('item:7.0.0:breaking-changes:9', 'ACTION_REQUIRED', {
        // 조사가 끼는 형태 + 버전 문자열의 점에서 문장이 끊기면 안 되는 형태.
        reason:
          'chain:node에서 확인된 engines 요구사항 변경(^18.0.0||>=20.0.0 → ^20.19.0||>=22.12.0)과 동일한 사안이다. ' +
          "require('vite') 사용은 코드에서 발견되지 않아 CJS 빌드 제거 자체는 무관하다.",
        action: 'Node.js를 20.19+ 또는 22.12+로 업그레이드',
      }),
      j('item:7.0.0:breaking-changes:13', 'ACTION_REQUIRED', {
        // 「동일한」과 「사안」 사이에 수식어가 여섯 어절 들어간 형태.
        reason: 'chain:node에서 확인된 engines 요구사항 변경과 동일한 Node 18 지원 종료 사안이다.',
        action: 'Node.js를 20.19+ 또는 22.12+로 업그레이드',
      }),
    ];

    const groups = groupJudgmentsByAction(judgments);
    assert.equal(groups.length, 1, 'Node 조치 3건은 한 행이어야 한다');
    assert.equal(groups[0].judgment.unit, 'chain:node');
    assert.equal(groups[0].members.length, 2, '대표를 뺀 접힌 판정 2건');
  });

  it('keeps the declaration and the id in one sentence — a mention in a later sentence is not a merge', () => {
    const judgments = [
      j('chain:node', 'ACTION_REQUIRED', { action: 'Node 업그레이드' }),
      j('item:x:1', 'ACTION_REQUIRED', {
        // 「동일한 조치」 선언은 이 판정 자신에 대한 것이고, chain:node는 다음
        // 문장에서 맥락으로만 언급된다 — 문장 경계가 없으면 오병합된다.
        reason: '설정 키 이름 변경은 앞 항목과 동일한 조치가 필요하다. chain:node는 별개 사안이다.',
        action: 'vite.config.mjs의 설정 키 갱신',
      }),
    ];
    assert.equal(groupJudgmentsByAction(judgments).length, 2);
  });

  it('does not fold a unit-id mention without the same-action declaration', () => {
    const judgments = [
      j('chain:node', 'ACTION_REQUIRED', { action: 'Node 업그레이드' }),
      j('item:7.0.0:breaking-changes:9', 'ACTION_REQUIRED', {
        // 맥락 설명으로 다른 유닛을 언급했을 뿐 "동일 조치" 선언이 아니다.
        reason: 'chain:node에서 다룬 요구와는 별개로 CJS 빌드가 제거된다.',
        action: 'require() 사용처를 ESM으로 전환',
      }),
    ];
    assert.equal(groupJudgmentsByAction(judgments).length, 2);
  });

  it('does not fold across different verdicts — a contradiction is a signal, not a merge', () => {
    const judgments = [
      j('chain:node', 'ACTION_REQUIRED', { action: 'Node 업그레이드' }),
      j('item:x:1', 'SMOKE_TEST', {
        verify: '확인',
        reason: 'chain:node와 동일 사안이지만 이 항목은 동작 확인만 필요.',
      }),
    ];
    assert.equal(groupJudgmentsByAction(judgments).length, 2);
  });

  it('ignores a reference to a unit that is not in this run', () => {
    const judgments = [
      j('item:x:1', 'ACTION_REQUIRED', { action: 'chain:ghost와 동일 조치' }),
    ];
    const groups = groupJudgmentsByAction(judgments);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].judgment.unit, 'item:x:1');
  });

  it('resolves a reference chain to the final representative', () => {
    const judgments = [
      j('item:a:1', 'ACTION_REQUIRED', { action: 'item:b:1과 동일 조치' }),
      j('item:b:1', 'ACTION_REQUIRED', { action: 'chain:node와 동일 조치' }),
      j('chain:node', 'ACTION_REQUIRED', { action: 'Node 업그레이드' }),
    ];
    const groups = groupJudgmentsByAction(judgments);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].judgment.unit, 'chain:node');
    assert.equal(groups[0].members.length, 2);
  });

  it('breaks a mutual-reference cycle deterministically instead of crashing', () => {
    const judgments = [
      j('item:a:1', 'ACTION_REQUIRED', { action: 'item:b:1과 동일 조치' }),
      j('item:b:1', 'ACTION_REQUIRED', { action: 'item:a:1과 동일 조치' }),
    ];
    const groups = groupJudgmentsByAction(judgments);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].judgment.unit, 'item:a:1');
    assert.deepEqual(groups[0].members.map((member) => member.unit), ['item:b:1']);
  });

  it('trims trailing sentence punctuation from a matched reference', () => {
    const judgments = [
      j('chain:node', 'ACTION_REQUIRED', { action: 'Node 업그레이드' }),
      j('item:x:1', 'ACTION_REQUIRED', { reason: '동일 조치: chain:node.', action: '업그레이드' }),
    ];
    const groups = groupJudgmentsByAction(judgments);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].judgment.unit, 'chain:node');
  });

  it('folds judgments whose action text is exactly identical — the no-reference run shape', () => {
    // Round 13 실측: 모델이 유닛 참조를 안 남긴 실행이 Node 조치 3건을
    // 완전히 같은 문장으로 냈다. 전문 일치만 접고, 한 글자 차이는 접지 않는다.
    const same = 'package.json engines와 실행 환경의 Node 버전을 20.19+ 또는 22.12+로 상향한다.';
    const judgments = [
      j('item:7.0.0:breaking-changes:9', 'ACTION_REQUIRED', { action: same }),
      j('item:7.0.0:breaking-changes:13', 'ACTION_REQUIRED', { action: `  ${same} ` }), // 공백만 다름
      j('item:7.0.0:miscellaneous-chores:75', 'ACTION_REQUIRED', { action: same }),
      j('chain:node', 'ACTION_REQUIRED', {
        action: 'package.json engines 필드와 개발/빌드/CI 실행 환경의 Node 버전을 20.19+ 또는 22.12+로 상향한다.',
      }),
    ];
    const groups = groupJudgmentsByAction(judgments);
    // 동일 문장 3건은 한 행, 문장이 다른 chain:node는 별도 행 — 유사해도 접지 않는다.
    assert.equal(groups.length, 2);
    const merged = groups.find((group) => group.members.length);
    assert.equal(merged.members.length, 2);
  });

  it('counts work by action groups, excluding NOT_AFFECTED', () => {
    const judgments = [
      j('chain:node', 'ACTION_REQUIRED', { action: 'Node 업그레이드' }),
      j('item:x:1', 'ACTION_REQUIRED', { action: 'chain:node와 동일 조치' }),
      j('item:y:1', 'SMOKE_TEST', { verify: '확인' }),
      j('item:z:1', 'NOT_AFFECTED', { reason: '미사용' }),
    ];
    assert.equal(countActionGroups(judgments), 2);
  });
});
