/*
 * Screen 10 — what the tool could not decide.
 *
 * Every row here is derived from a signal the pipeline actually produced:
 * items the Agent never saw, terms static search cannot treat as evidence,
 * dependencies distributed outside the npm registry, packages installed at
 * more than one version. Nothing is invented.
 *
 * Two scopes, labeled so a recurring row reads as intended:
 *   이번 분석      produced by THIS run (selected package, its items/terms)
 *   프로젝트 공통  a fact about the dependency tree itself — it appears on
 *                 every run because it stays true on every run, not because
 *                 it is stale
 *
 * The one fixed row states a scope boundary of the tool itself, which is a
 * known fact rather than a finding.
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

/**
 * The review groups still awaiting a person, sorted by how much of the
 * project uses that scope — the reading order the screen recommends.
 *
 * Judged groups (an L6 `group:<scope>` verdict exists) are excluded: their
 * SMOKE_TEST rows live on the checklist and their NOT_AFFECTED is a decision.
 * Without an L6 result every group is still open.
 */
export function openReviewGroups(l4Result, l6Result) {
  const groups = l4Result?.inputSummary?.deferredTriage?.reviewGroups ?? [];
  const judgedScopes = new Set(
    (l6Result?.judgments ?? [])
      .filter((judgment) => String(judgment.unit ?? '').startsWith('group:'))
      .map((judgment) => String(judgment.unit).slice('group:'.length)),
  );
  return groups
    .filter((group) => !judgedScopes.has(group.scope))
    .sort((a, b) => (b.fileCount ?? 0) - (a.fileCount ?? 0) || (b.count ?? 0) - (a.count ?? 0));
}

export function buildManualCheckRows({ dependencies = [], l4Result = null, sourceMatch = null, l6Result = null }) {
  const rows = [];

  /*
   * Deferred items are pre-triaged by code. Only the review list — risk-shaped
   * text the usage scan could not rule out — is a person's work; the excluded
   * remainder (unused scope, fixes/features the upgrade delivers) is a
   * decision, not a task, so it produces no row here.
   *
   * And the review groups themselves go to L6 as `group:<scope>` units, so
   * once a judgment exists this row must INHERIT it instead of re-listing
   * judged work as homework. Measured on the vuetify 3→4 run: 51 groups
   * (136 items) all reached L6 and 40 came back judged — presenting all 136
   * as "원문 확인" made the manual pile look bigger than the tool's output,
   * when the real leftover was the 11 unjudged groups. Verdict-carrying
   * groups are the checklist's business (SMOKE_TEST rows live there;
   * NOT_AFFECTED is a decision, not a task); only judgment-less groups stay
   * here as reading work.
   */
  const triage = l4Result?.inputSummary?.deferredTriage ?? {};
  const reviewCount = triage.review?.length ?? 0;
  const reviewGroups = triage.reviewGroups ?? [];
  const judgedScopes = new Set(
    (l6Result?.judgments ?? [])
      .filter((judgment) => String(judgment.unit ?? '').startsWith('group:'))
      .map((judgment) => String(judgment.unit).slice('group:'.length)),
  );

  if (l6Result && reviewGroups.length) {
    const open = openReviewGroups(l4Result, l6Result);
    const openItems = open.reduce((sum, group) => sum + (group.count ?? group.items?.length ?? 0), 0);
    const judgedCount = reviewGroups.length - open.length;
    if (open.length) {
      rows.push({
        derived: true,
        scope: '이번 분석',
        category: '분류 범위',
        // The row is a doorway, not a pointer: clicking it opens the review
        // list right here (원문·내용). 수집/변경사항/분류결과 탭은 증거
        // 보관용이지 검토 동선이 아니다.
        drill: 'review-groups',
        target: `추가 검토 ${open.length}개 영역 (${openItems}건)`,
        reason: `동작 변경 신호가 있으나 Agent 분류 예산에 들지 않았고, 영역 판정도 닿지 않은 항목${judgedCount ? ` — 나머지 ${judgedCount}개 영역은 판정 완료(대응·테스트 탭)` : ''}`,
        recommendation: '행을 클릭해 검토 목록 열기 — 사용 파일 수 많은 영역부터 정렬됨',
        state: { label: '원문 확인', tone: 'warn' },
      });
    }
  } else if (reviewCount > 0) {
    // L6 미실행 — 판정이 없으니 목록 전체가 아직 사람 몫이라는 기존 사실 그대로.
    rows.push({
      derived: true,
      scope: '이번 분석',
      category: '분류 범위',
      drill: 'review-groups',
      target: `추가 검토 ${reviewGroups.length || reviewCount}개 영역 (${reviewCount}건)`,
      reason: '동작 변경 신호가 있으나 Agent 분류 예산에 들지 않은 항목',
      recommendation: '행을 클릭해 검토 목록 열기 — 사용 파일 수 많은 영역부터 정렬됨',
      state: { label: '원문 확인', tone: 'warn' },
    });
  }

  /*
   * A term the static search did not find is normally evidence of ABSENCE —
   * the same epistemics the deferred triage applies to unused scopes. It
   * turns into a person's work only when this project builds component or
   * module names at runtime, because then the search is blind, not the
   * project innocent. The matcher scans for exactly those patterns; without
   * them, a miss is a finding, not a task, and step 8 already reports the
   * unmatched count.
   */
  const unmatched = sourceMatch?.unmatchedTerms ?? [];
  const dynamicAccess = sourceMatch?.dynamicAccess;
  if (unmatched.length > 0 && dynamicAccess?.detected) {
    // A handoff list must be complete: the person doing the manual pass needs
    // every term and every dynamic-access site, not the first few with '등'.
    // Terms are deduped by their letters only — the matcher searches the same
    // component as `VNumberInput` (×3 pattern types) and `v-number-input`,
    // but the human's unit is the component, once.
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

  /*
   * URL dependencies ARE pinned by the lockfile and their usage IS statically
   * searchable — what breaks is every registry-based signal: release
   * collection, latest-version comparison, and vulnerability-to-version
   * mapping all key off registry.npmjs.org, which never saw this artifact.
   * That is also why the library screen marks these packages 비표준 배포.
   */
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
