/*
 * 확인 필요(SMOKE_TEST)의 행 단위는 판정이 아니라 "검증 절차"다.
 *
 * 골든 실측(vite 5.2.11→8.2.1): 확인 필요 32건의 verify 문장을 읽으면 실제
 * 할 일은 "프로덕션 빌드 1회 · dev 서버 스모크 1회 · 타입체크 1회"가 대부분을
 * 흡수한다(32건 → 절차 3 + 개별 1). 사람은 빌드를 32번 돌리지 않는다 — 한 번
 * 돌리고 확인 포인트들을 함께 본다. 이 파일은 그 묶음을 결정론으로 만든다.
 *
 * 조치 병합(actionGroups.js)과 같은 안전 원칙:
 *   - 유사도 없음 — 큐레이션된 절차 사전의 키워드 매칭만
 *   - 접는 게 아니라 묶는 것 — 각 판정의 verify 문장은 절차 행의 확인
 *     포인트로 전부 남고, 개별 유닛으로 계속 열 수 있다
 *   - 미매칭은 개별 행 그대로 — 실패 모드가 현상 유지
 *
 * 2단계(예정): L6 스키마에 verifyProcedure enum을 추가해 사전 매칭의 애매함을
 * 원천 제거 — sameActionAs와 같은 프롬프트 개정 묶음.
 */

// 우선순위 순서: 문장에 "빌드"와 "타입체크"가 같이 나오면 더 구체적인
// 절차(타입체크)가 이긴다. dev 서버 문장도 종종 "빌드/개발 서버"를 병기한다.
export const VERIFY_PROCEDURES = [
  {
    key: 'TYPECHECK',
    label: '타입체크 1회 실행',
    run: '프로젝트의 타입체크(vue-tsc --noEmit 등)를 한 번 실행하고 아래 포인트의 오류 여부를 확인한다.',
    pattern: /타입\s*체크|타입체크|vue-tsc|\btsc\b|타입 오류/,
  },
  {
    key: 'DEV_SMOKE',
    label: '개발 서버 스모크 1회',
    run: '개발 서버를 띄워 주요 화면을 훑고, HMR·프록시 경로가 정상인지 아래 포인트를 함께 확인한다.',
    pattern: /개발 서버|dev 서버|HMR|프록시|핫 모듈/,
  },
  {
    key: 'BUILD_SMOKE',
    label: '프로덕션 빌드 스모크 1회',
    run: '프로덕션 빌드를 한 번 수행해 경고·에러와 산출물을 확인하고, 아래 포인트를 함께 본다.',
    // 영문 `build`도 잡는다 — 설정 키(build.rollupOptions 등)를 언급하는
    // 확인 문장은 빌드를 돌려야 확인된다.
    pattern: /빌드|산출물|번들|컴파일|\bbuild\b/i,
  },
  {
    key: 'UI_SMOKE',
    label: '화면 확인 1회 (시각·상호작용)',
    run: '앱을 띄워 주요 화면을 한 바퀴 돌며 아래 포인트(레이아웃·표시·포커스·상호작용)를 함께 확인한다.',
    /*
     * UI 컴포넌트 라이브러리(vuetify류) 업그레이드의 확인은 대부분 이 한
     * 바퀴로 수렴한다 — 실측(vuetify 3.6→4.1): SMOKE 39건 중 다수의 verify가
     * "…시각 확인" · "…포커스/동작 확인" 문장이었고, 사람은 화면을 39번
     * 열지 않는다. 문장 패턴은 화면을 봐야만 확인되는 표현으로 한정한다 —
     * "registry 재확인"·"npm ls로 확인" 같은 비화면 확인을 삼키면 안 된다.
     */
    /*
     * verify 문장은 실행마다 표현이 바뀐다(같은 판정이 "…시각 확인" ↔
     * "…표시되는지 확인"으로) — 화면을 봐야만 확인되는 **동사 표현**을 넓게
     * 수집하되, 비화면 확인의 동사("재확인"·"조회"·"npm ls로 확인" 등)는
     * 여기 없는 표현이라 안 삼킨다. 근본 해법은 이 파일 서두의 2단계
     * (L6 스키마 verifyProcedure enum)다.
     */
    pattern: /시각 확인|시각적으로 확인|화면(?:에서)? 확인|브라우저에서 확인|렌더링[^\n]{0,16}확인|레이아웃[^\n]{0,16}확인|포커스[^\n]{0,16}(?:확인|이동)|동작 (?:재)?확인|정상 (?:동작|이동|검색|표시)|정상인지 확인|탐색이 정상|표시되는지|보이는지|깨지지 않는지|간격[^\n]{0,10}확인|표시 여부 확인|표시 텍스트[^\n]{0,10}확인|키보드[^\n]{0,10}(?:이동|조작|탐색|열)|깜빡임|트랜지션[^\n]{0,10}확인/,
  },
];

/*
 * 문장에서 "우연히 일치할 수 없는" 식별자만 뽑는다: 점 표기 설정 키
 * (resolve.mainFields · build.rollupOptions)와 camelCase/PascalCase 심볼.
 * 일반 단어는 증거력이 없다 — 사용 스캔과 같은 규칙.
 */
export function distinctiveTokens(text) {
  const value = String(text ?? '');
  const dotted = [...value.matchAll(/[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+/g)].map((m) => m[0]);
  const camel = [...value.matchAll(/\b[a-z][a-z0-9]*[A-Z][A-Za-z0-9]*\b/g)].map((m) => m[0]);
  const pascal = [...value.matchAll(/\b[A-Z][a-z0-9]+[A-Z][A-Za-z0-9]*\b/g)].map((m) => m[0]);
  return [...new Set([...dotted, ...camel, ...pascal])];
}

export function procedureOf(verifyText) {
  const text = String(verifyText ?? '');
  if (!text) return null;
  return VERIFY_PROCEDURES.find((procedure) => procedure.pattern.test(text)) ?? null;
}

/** 절차 행의 체크리스트 키 — 판정 유닛과 같은 저장소(checklistProgress)를 쓴다. */
export function procedureUnit(key) {
  return `procedure:${key}`;
}

/**
 * SMOKE_TEST 조치 그룹들(+ L6 총평의 smokePoints) → 절차 행 + 개별 행.
 * 입력은 actionGroups.js의 그룹(대표 판정 기준)이라 두 병합이 자연 합성된다.
 *
 * smokePoints는 L6가 총평으로 내는 자유 문장 목록인데, 실측(vite 골든)에서
 * 전부 판정 verify의 재진술이었다 — 별도 섹션으로 두면 앵커 없는 사본이
 * 된다. 같은 절차 사전으로 분류해서: 절차에 해당하면 그 절차 행의 '총평
 * 포인트'로 붙이고, 사전 밖이면 '총평 단독' 행으로 승격한다. 포인트↔판정
 * 1:1 문장 매칭은 하지 않는다 — 재진술은 표현이 달라 유사도 매칭이 되고,
 * 그건 이 화면이 금지하는 방식이다. 절차 단위 귀속이면 충분히 정직하다.
 *
 * 사전 밖 문장은 곧장 승격하지 않는다 — 총평은 판정 verify의 재진술이라
 * "지시 없는 명사구"("~로 인한 모듈 해석 결과 변화")가 흔한데, 그런 행은
 * 사람에게 무엇을 하라는 건지 말하지 못한다. 대신 문장에서 식별자 토큰
 * (`resolve.mainFields` 같은 점 표기 키·camelCase)을 뽑아 판정들의
 * 근거·검증·조치와 대조한다: 토큰이 어느 판정에든 등장하면 그 주제는 이미
 * 방법과 근거를 가진 행이 있다 — 사본을 만들지 않는다. 진짜로 어디에도
 * 없는 문장만 승격한다. (유사도가 아니라 정확 토큰 포함 — 사용 스캔의
 * searchable-token 철학과 같다.)
 *
 * @param coverageJudgments 토큰 대조 대상 — 실행의 전체 판정(모든 verdict)
 * @returns { procedures: [{ key, label, run, unit, entries: group[], notes: string[], standalone?: true }], singles: group[] }
 */
export function foldSmokeGroups(smokeGroups, smokePoints = [], coverageJudgments = []) {
  const byKey = new Map();
  const singles = [];
  const ensure = (procedure) => {
    if (!byKey.has(procedure.key)) {
      byKey.set(procedure.key, { ...procedure, unit: procedureUnit(procedure.key), entries: [], notes: [] });
    }
    return byKey.get(procedure.key);
  };

  for (const group of smokeGroups ?? []) {
    const procedure = procedureOf(group.judgment.verify);
    if (!procedure) {
      singles.push(group);
      continue;
    }
    ensure(procedure).entries.push(group);
  }

  const judgmentText = (coverageJudgments ?? [])
    .map((judgment) =>
      [judgment.unit, judgment.reason, judgment.action, judgment.verify].filter(Boolean).join(' '),
    )
    .join('\n');

  const standalone = [];
  (smokePoints ?? []).forEach((point, index) => {
    const text = String(point ?? '').trim();
    if (!text) return;
    const procedure = procedureOf(text);
    if (procedure) {
      // 판정 없이 총평 포인트만으로도 절차 행은 성립한다 — 그 확인 행위
      // (빌드 1회 등)가 필요하다는 사실 자체는 총평만으로 참이다.
      ensure(procedure).notes.push(text);
      return;
    }
    // 사전 밖: 판정이 이미 다룬 주제(토큰 일치)면 사본을 만들지 않는다.
    const tokens = distinctiveTokens(text);
    if (tokens.length && tokens.some((token) => judgmentText.includes(token))) return;
    standalone.push({
      key: `POINT_${index}`,
      label: '개별 확인 — 총평',
      run: text,
      unit: procedureUnit(`POINT_${index}`),
      entries: [],
      notes: [],
      standalone: true,
    });
  });

  // 사전 순서대로 — 타입체크가 있으면 맨 위(가장 싸고 빠른 확인부터).
  // 총평 단독 행은 절차들 뒤에 붙는다.
  const procedures = [
    ...VERIFY_PROCEDURES.filter((p) => byKey.has(p.key)).map((p) => byKey.get(p.key)),
    ...standalone,
  ];
  return { procedures, singles };
}

/**
 * 작업 행 통계 — 대응·테스트 탭 배지·요약 KPI가 같은 정의를 쓰는 단일 지점.
 * 행 = 수정 필요 조치 그룹 + 확인 절차 + 개별 확인. 무영향은 행이 아니다.
 */
export function workRowStats(actionGroups, checklistProgress = {}, smokePoints = []) {
  const actionRows = (actionGroups ?? []).filter((group) => group.judgment.verdict === 'ACTION_REQUIRED');
  const smokeGroups = (actionGroups ?? []).filter((group) => group.judgment.verdict === 'SMOKE_TEST');
  const allJudgments = (actionGroups ?? []).flatMap((group) => [group.judgment, ...group.members]);
  const { procedures, singles } = foldSmokeGroups(smokeGroups, smokePoints, allJudgments);

  const isChecked = (unit) => Boolean(checklistProgress[unit]?.checked);
  const done =
    actionRows.filter((group) => isChecked(group.judgment.unit)).length +
    procedures.filter((procedure) => isChecked(procedure.unit)).length +
    singles.filter((group) => isChecked(group.judgment.unit)).length;

  return {
    action: actionRows.length,
    smoke: procedures.length + singles.length,
    total: actionRows.length + procedures.length + singles.length,
    done,
  };
}
