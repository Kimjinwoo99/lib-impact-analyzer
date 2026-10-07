/*
 * Placeholder data for pipeline stages the backend does not implement yet.
 *
 * Everything exported here is display-only. It never flows back into an API
 * request, and every consumer renders it behind <MockBadge>, so a screenshot
 * of the dashboard can never pass mock output off as analysis output.
 *
 * Missing backend pieces, as of 2026-08-02:
 *   - npm registry lookup  -> "최신 버전" / "업데이트 후보" / "상태"  (screen 02)
 *   - L6 impact judgment   -> 검토·테스트 체크리스트, 대응 권장안     (screens 08, 09)
 *   - L7 risk rollup       -> 최종 위험도                             (screens 08, 09)
 */

// --- screen 02: npm registry latest versions ---------------------------
// Placeholder values for unimplemented stages.
const LATEST_VERSION_CATALOG = {
  axios: '1.18.1',
  pinia: '4.0.2',
  vuetify: '4.1.5',
  'vue-router': null,
  realgrid: null,
  xlsx: null,
};

export function mockLatestVersion(packageName) {
  return LATEST_VERSION_CATALOG[packageName] ?? null;
}

/*
 * There is deliberately no "업데이트 가능 / 확인 필요" status here.
 *
 * At this stage the tool knows the declared range and the locked version, and
 * nothing else — not whether an upgrade is advisable, not whether a missing
 * latest version means trouble. Printing a verdict would be exactly the kind
 * of unfounded claim this project is built to avoid. The version columns state
 * the facts; the judgment belongs to L6/L7 once they exist.
 */

// --- screens 08 / 09: L6 impact judgment -------------------------------

const L6_STATUS_BY_RISK = {
  HIGH: 'REVIEW_REQUIRED',
  MEDIUM: 'REVIEW_REQUIRED',
  LOW: 'LIKELY_NOT_AFFECTED',
  UNKNOWN: 'UNKNOWN',
};

/**
 * Shapes a fake L6 judgment for one classification item plus its Step 5
 * evidence. Deterministic — derived only from fields already on screen.
 */
export function mockImpactJudgment(item, sourceMatch) {
  if (!item) return null;
  const risk = String(item.preliminaryRisk ?? 'UNKNOWN').toUpperCase();
  const topFile = sourceMatch?.candidateFiles?.[0] ?? null;
  const scope = item.scope || item.agentCategory || '변경 항목';

  return {
    status: L6_STATUS_BY_RISK[risk] ?? 'UNKNOWN',
    headline: `${scope} 관련 변경이 프로젝트 코드에서 사용 중인 경로와 겹칩니다.`,
    detail:
      topFile
        ? `${topFile.path}에서 ${topFile.matches?.length ?? 0}건의 증거가 발견되었습니다. 업데이트 후 실제 적용 결과를 확인해야 합니다.`
        : '검사 대상 용어가 프로젝트 소스에서 발견되지 않았습니다. 영향 없음으로 단정하지 말고 수동 확인이 필요합니다.',
    recommendations: [
      'src/plugins/vuetify.ts의 defaults 설정 확인',
      `${scope}에 전달되는 기본값 비교`,
      '공통 래퍼가 있다면 상속 경로 우선 점검',
      '수정 전·후 화면 캡처 및 동작 비교',
    ],
    testSteps: [
      '해당 컴포넌트가 쓰인 화면 열기·닫기',
      '다중 선택 및 아이콘 표시 비교',
      'defaults 제거 후 결과와 교차 확인',
    ],
  };
}

// --- screen 10: items outside automatic analysis -----------------------

/**
 * Screen 10 is the one place the tool admits what it could not decide.
 * Rows are derived from real signals wherever a real signal exists; the
 * `derived` flag marks which ones those are.
 */
/** Unique terms by their letters alone: `VNumberInput` ≡ `v-number-input`. */
function dedupeTerms(entries) {
  const seen = new Set();
  const terms = [];
  for (const entry of entries) {
    const signature = String(entry.term).replace(/[^a-z0-9]/gi, '').toLowerCase();
    if (seen.has(signature)) continue;
    seen.add(signature);
    terms.push(entry.term);
  }
  return terms;
}

export function buildManualCheckRows({ dependencies = [], l4Result = null, sourceMatch = null }) {
  const rows = [];

  const deferred = l4Result?.inputSummary?.selectionPolicy?.deferredSummary;
  const deferredCount = l4Result?.inputSummary?.deferredItemCount ?? 0;
  if (deferredCount > 0) {
    rows.push({
      derived: true,
      scope: '이번 분석',
      category: '문서 수집',
      target: `분류 보류 항목 ${deferredCount}건`,
      reason:
        typeof deferred === 'string' && deferred
          ? deferred
          : '항목 예산을 초과해 Agent 분류 입력에서 제외됨. 보류는 안전을 뜻하지 않음',
      recommendation: '릴리즈 원문에서 breaking·deprecated 항목 직접 대조',
      state: { label: '원문 확인', tone: 'warn' },
    });
  }

  /*
   * A term the static search did not find is normally evidence of ABSENCE.
   * It becomes a person's work only when the matcher detected runtime-built
   * component/module names in this project — then the search is blind, not
   * the project innocent. Same rule as the product screen.
   */
  const unmatched = sourceMatch?.unmatchedTerms ?? [];
  const dynamicAccess = sourceMatch?.dynamicAccess;
  if (unmatched.length > 0 && dynamicAccess?.detected) {
    // A handoff list must be complete — every term, every site, no '등'.
    // Same rule as the product screen.
    const terms = dedupeTerms(unmatched);
    const spots = [...new Set((dynamicAccess.hits ?? []).map((hit) => (hit.line ? `${hit.path}:${hit.line}` : hit.path)))];
    rows.push({
      derived: true,
      scope: '이번 분석',
      category: '동적 사용',
      target: `미매칭 검사 용어 ${terms.length}건`,
      reason: `이 프로젝트는 컴포넌트/모듈 이름을 실행 시점에 조립합니다 (${spots.join(', ')}) — 정적 검색의 미매칭이 부재 증거가 되지 못함`,
      recommendation: `${terms.join(', ')} — 위 동적 생성 경로에서 수동 대조`,
      state: { label: '코드 추적', tone: 'accent' },
    });
  }

  // URL dependencies ARE lockfile-pinned and their usage IS searchable; what
  // breaks is every registry-based signal. Same honest wording as the product
  // screen.
  const urlDeps = dependencies.filter((dep) => dep.isUrlDependency);
  if (urlDeps.length > 0) {
    rows.push({
      derived: true,
      scope: '프로젝트 공통',
      category: '비표준 배포',
      target: urlDeps.map((dep) => dep.name).join(', '),
      reason: 'npm registry 밖에서 배포(CDN tarball 등)되어 릴리즈 수집·최신 버전 비교·취약점 버전 매핑이 이 도구에서 정확하지 않음. 소스 내 사용처 검색은 정상 동작',
      recommendation: '배포처의 공지·체인지로그·보안 권고를 직접 확인',
      state: { label: '별도 점검', tone: 'bad' },
    });
  }

  const multiVersion = dependencies.filter((dep) => dep.hasMultipleInstalledVersions);
  if (multiVersion.length > 0) {
    rows.push({
      derived: true,
      scope: '프로젝트 공통',
      category: '중복 설치',
      target: multiVersion.map((dep) => `${dep.name} (${dep.installedVersions.join(', ')})`).join(', '),
      reason: '직접 경로와 전이 경로에서 서로 다른 버전이 설치되어 실행 시점 버전이 불확정',
      recommendation: '번들 결과에서 실제 로드되는 버전 확인',
      state: { label: '범위 확장', tone: 'warn' },
    });
  }

  rows.push({
    derived: false,
    scope: '프로젝트 공통',
    category: '외부 범위',
    target: '공통 패키지 / workspace',
    reason: '현재 선택 프로젝트 밖의 공통 패키지는 검사 대상에서 제외',
    recommendation: '연결된 workspace와 배포 번들의 사용 여부 확인',
    state: { label: '범위 확장', tone: 'warn' },
  });

  return rows;
}
