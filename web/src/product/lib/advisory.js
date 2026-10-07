/*
 * analysis.js의 packageAdvisories(패키지별 취약점·deprecated 사실 + 버전
 * 비교 결과)를 화면 문구로 옮기는 자리 — ActionChecklistTab(판정 상세 한
 * 줄)과 SummaryTab(전체 목록)이 같은 문구를 쓰게 한다. "이 버전이 이
 * 취약점을 고치는가"의 판단 자체는 analysis.js가 이미 끝냈고, 여기는 그
 * 결과를 tone·문구로 바꾸기만 한다 — 새 판단을 넣지 않는다.
 */
/*
 * 문구는 숫자로만 말한다 — "일부는 해결되지 않습니다" 같은 얼버무리는
 * 표현 대신 항상 (해결/전체) 건수와 비교 대상 버전을 명시한다.
 */
export function formatAdvisory(advisory) {
  if (!advisory) return null;
  const parts = [];
  let tone = 'ok';
  const total = advisory.vulnerabilities.length;
  if (total) {
    if (advisory.pendingCount) {
      tone = 'warn';
      parts.push(`취약점 ${total}건 — 비교할 목표 버전 없음`);
    } else if (advisory.unresolvedCount === 0) {
      parts.push(`취약점 ${total}건 모두 해결(목표 버전 ${advisory.targetVersion})`);
    } else {
      tone = 'bad';
      parts.push(`취약점 ${total}건 중 ${advisory.resolvedCount}건 해결, ${advisory.unresolvedCount}건 미해결(목표 버전 ${advisory.targetVersion})`);
    }
  }
  if (advisory.deprecated) {
    if (tone !== 'bad') tone = 'warn';
    parts.push('npm 지원 종료(deprecated)');
  }
  return { tone, text: parts.join(' · ') };
}

/*
 * OSV의 severity는 자유 텍스트("HIGH", "CVSS:3.1/...", 숫자 점수 등)라
 * 정확한 등급 파싱은 하지 않는다 — 알아볼 수 있는 단어(CRITICAL/HIGH/
 * MODERATE/LOW)만 순위로 쓰고, 나머지는 맨 뒤로 보낸다. 배지 색(tone)과
 * 정렬 순서(rank) 둘 다 이 하나의 순위표에서 나온다 — 색은 위험한데
 * 정렬은 안 앞선다는 식의 불일치를 막는다.
 */
const SEVERITY_RANK = { CRITICAL: 0, HIGH: 1, MODERATE: 2, MEDIUM: 2, LOW: 3 };

export function vulnerabilitySeverityRank(severity) {
  const key = String(severity ?? '').toUpperCase();
  const match = Object.keys(SEVERITY_RANK).find((name) => key.includes(name));
  return match ? SEVERITY_RANK[match] : 4;
}

export function vulnerabilitySeverityTone(severity) {
  if (!severity) return 'idle';
  return vulnerabilitySeverityRank(severity) <= 1 ? 'bad' : 'warn';
}

// CVE 번호가 있으면 그걸 우선 보여준다 — GHSA id보다 사람들이 검색·인지하기
// 익숙한 식별자다. 없으면 GHSA(또는 OSV) id 그대로.
export function vulnerabilityDisplayId(item) {
  return (item.aliases ?? []).find((alias) => /^CVE-/.test(alias)) ?? item.id;
}

/*
 * 목록 정렬 — 미해결부터(RESOLVED_ORDER), 같은 해결 상태 안에서는 심각도
 * 높은 것부터, 같은 심각도 안에서는 최근 발행일부터. 15건 중 대부분이
 * 해결·저심각도면 진짜 봐야 할 1~2건이 맨 위로 오게 하는 게 목적이다.
 */
const RESOLVED_ORDER = { false: 0, null: 1, undefined: 1, true: 2 };

function publishedTime(item) {
  return item.published ? new Date(item.published).getTime() : -Infinity;
}

export function compareVulnerabilities(a, b) {
  return (
    RESOLVED_ORDER[a.resolved] - RESOLVED_ORDER[b.resolved] ||
    vulnerabilitySeverityRank(a.severity) - vulnerabilitySeverityRank(b.severity) ||
    publishedTime(b) - publishedTime(a)
  );
}
