/**
 * L6 — project-impact judgment, as ONE synthesized call.
 *
 * L4 classifies changelog items one by one; L6 does what an engineer actually
 * does before an upgrade: hold the whole picture — what changed, what this
 * project uses, what the migration guide says, what must move together — and
 * decide per area whether something must be done, merely smoke-tested, or is
 * not this project's problem. Measured against a real upgrade session (vite
 * 5→8), that judgment compressed ~30 breaking changes to 9 actions; the value
 * is in the cross-evidence view, so the call is one big prompt, not hundreds
 * of small ones.
 *
 * The judgment units are the compact structures the code side already built:
 * scope-folded review groups, the Agent's REVIEW items, migration-guide
 * sections filtered to used components, and the requirement diff. The LLM
 * never sees raw 1,000-item lists.
 */

const VERDICTS = ['ACTION_REQUIRED', 'SMOKE_TEST', 'NOT_AFFECTED'];

const MAX_GROUPS = 40;
const MAX_ITEMS_PER_GROUP = 3;
const MAX_L4_ITEMS = 40;
const MAX_GUIDE_SECTIONS = 20;

/*
 * The classified-item gate: which L4 items become judgment units.
 *
 * reviewRequired is an LLM bit, and on borderline patch bug-fixes it flips
 * between runs — measured twice on the same input (vuetify 3.6.10→3.6.11,
 * same model): one run said 판정 대상 ×4, the next said 대상 아님 ×4. Gating
 * L6 on that bit alone means the pipeline's most valuable output (project-
 * evidence verdicts) appears or vanishes by luck.
 *
 * So the gate has a floor, not an open door — it only ever WIDENS a starved
 * selection, never exceeds the existing MAX_L4_ITEMS ceiling:
 *   ≤ FULL_COVERAGE_MAX_ITEMS items  → all of them. Small ranges are where
 *     the flip actually starves the judgment, and "all" is bounded by
 *     definition. L6 confirming 무영향 with evidence is output, not waste.
 *   > that, review items exist       → today's behavior, unchanged. Large
 *     ranges cannot starve structurally: HIGH forces reviewRequired in
 *     synthesis, and mandatory categories (BREAKING/REVERT/보안) are numerous.
 *   > that, review came back empty   → top STARVATION_BACKFILL_LIMIT by
 *     risk, so a pathological all-false run still judges something.
 */
const FULL_COVERAGE_MAX_ITEMS = 20;
const STARVATION_BACKFILL_LIMIT = 10;
const RISK_RANK = { HIGH: 0, MEDIUM: 1, LOW: 2 };

/**
 * Exported so `l6-evidence.js`'s assembly step can scan EXACTLY the units L6
 * will actually judge — not the full classifiedItems array — before
 * `buildL6Input` re-runs this same (pure, deterministic) selection. Calling
 * it twice on the same array yields the same result, so the two stay in sync
 * without the assembly step needing to know buildL6Input's internals.
 */
export function selectClassifiedForJudgment(items) {
  const all = items ?? [];
  const reviewCount = all.filter((item) => item.reviewRequired).length;

  if (all.length <= FULL_COVERAGE_MAX_ITEMS) {
    return {
      selected: all,
      gate: { rule: 'small-range-full-coverage', totalItems: all.length, reviewItems: reviewCount, selectedItems: all.length },
    };
  }

  if (reviewCount > 0) {
    const selected = all.filter((item) => item.reviewRequired).slice(0, MAX_L4_ITEMS);
    return {
      selected,
      gate: { rule: 'review-filter', totalItems: all.length, reviewItems: reviewCount, selectedItems: selected.length },
    };
  }

  // Stable sort: MEDIUM before LOW, original order within a tier.
  const selected = [...all]
    .sort((a, b) => (RISK_RANK[a.preliminaryRisk] ?? 1) - (RISK_RANK[b.preliminaryRisk] ?? 1))
    .slice(0, STARVATION_BACKFILL_LIMIT);
  return {
    selected,
    gate: { rule: 'starvation-backfill', totalItems: all.length, reviewItems: 0, selectedItems: selected.length },
  };
}

export function buildL6Input(payload = {}) {
  const reviewGroups = (payload.reviewGroups ?? []).slice(0, MAX_GROUPS).map((group) => ({
    unit: `group:${group.scope}`,
    scope: group.scope,
    itemCount: group.count,
    usage: group.usageVerdict === 'USED' ? { fileCount: group.fileCount } : { fileCount: 0, note: '사용 판정 불가' },
    samples: (group.items ?? []).slice(0, MAX_ITEMS_PER_GROUP).map((item) => `${item.version}: ${item.summary}`),
    // E3 batch evidence (assembleJudgmentEvidence attaches this before
    // buildL6Input runs) — file:line matches for this scope's inspectionPlan,
    // and unmatchedTerms as the decisive "searched, not there" fact.
    usageEvidence: normalizeUsageEvidence(group.usageEvidence),
  }));

  const classifiedSelection = selectClassifiedForJudgment(payload.classifiedItems);
  const classifiedItems = classifiedSelection.selected
    .map((item) => ({
      unit: `item:${item.itemId}`,
      version: item.version,
      scope: item.scope ?? null,
      category: item.agentCategory ?? item.parserCategory ?? null,
      preliminaryRisk: item.preliminaryRisk ?? null,
      summary: item.summary,
      searchTerms: [
        ...(item.inspectionPlan?.componentTags ?? []),
        ...(item.inspectionPlan?.configKeys ?? []),
      ].slice(0, 6),
      usageEvidence: normalizeUsageEvidence(item.usageEvidence),
    }));

  const guideSections = (payload.migrationSections ?? []).slice(0, MAX_GUIDE_SECTIONS).map((section) => ({
    unit: `guide:${section.heading}`,
    heading: section.heading,
    excerpt: section.excerpt ?? null,
    usedComponents: section.usedComponents ?? [],
    files: (section.files ?? []).slice(0, 4),
    fileCount: section.fileCount ?? 0,
    hasDiff: Boolean(section.hasDiff),
    /*
     * Deterministic answer to "does this project set the option this section
     * is about". PRESENT carries file+line to edit; ABSENT is the reason a
     * changed default lands on this project unfiltered. Sections about
     * nothing configurable carry neither.
     */
    configVerdict: section.config?.verdict ?? null,
    configPresent: (section.config?.presentKeys ?? []).slice(0, 4),
    configAbsent: (section.config?.absentKeys ?? []).slice(0, 4),
    configEvidence: (section.config?.evidence ?? []).slice(0, 3),
    /*
     * 템플릿 축 — 슬롯 프로퍼티 접근(item.title 등)의 소스 실측. PRESENT의
     * evidence는 소스 file·line이므로 그 자체가 수정 위치다. 설정 축과 분리한
     * 이유: 이 토큰이 설정 스캔으로 새면 당연한 ABSENT가 "코드에 없음"이라는
     * 거짓 부정 증거가 된다(2026-08-22 vuetify 실측 오판).
     */
    templateVerdict: section.template?.verdict ?? null,
    templatePresent: (section.template?.presentTerms ?? []).slice(0, 4),
    templateAbsent: (section.template?.absentTerms ?? []).slice(0, 6),
    templateEvidence: (section.template?.evidence ?? []).slice(0, 6),
  }));

  const requirements = requirementsForThisTarget(payload);
  const peerAudit = peerAuditForThisTarget(payload);
  const companions = companionsForThisTarget(payload);

  return {
    packageName: payload.packageName,
    currentVersion: payload.currentVersion,
    targetVersion: payload.targetVersion ?? null,
    mode: payload.mode ?? 'UPGRADE_IMPACT',
    project: {
      framework: 'Vue 3 SPA (Vite build)',
      // Direction, not identity: which files use the package and how much.
      usageSummary: payload.usageSummary ?? null,
      /*
       * 타입 검사 파이프라인의 존재 — 코드가 확정한 사실(project-profile.js).
       * 없음이 확정되면 타입 전용 변경은 이 프로젝트에 도달 경로가 없다.
       * null은 "프로파일을 못 읽음"이지 "없음"이 아니다.
       */
      typePipeline: payload.projectProfile
        ? payload.projectProfile.hasTypePipeline
          ? { present: true }
          : {
              present: false,
              note: 'tsconfig·TS 소스(.d.ts 제외)·타입체크 스크립트가 전부 없음 — 타입 선언에만 있는 변경은 이 프로젝트에 도달 경로가 없다',
            }
        : null,
    },
    requirements,
    peerAudit,
    companions,
    units: [
      ...guideSections,
      ...reviewGroups,
      ...classifiedItems,
      ...buildChainUnits({ requirements, peerAudit, companions, installedPackages: payload.installedPackages ?? null }),
    ],
    // Which gate rule shaped the classified units — for run logs, NOT for the
    // prompt; buildL6Prompt strips it before serializing.
    gate: classifiedSelection.gate,
  };
}

/*
 * chain:* units, built by code — not manufactured by the model.
 *
 * Until 2026-08-13 the prompt told the model to CREATE `chain:<패키지>` units
 * from the requirements/peerAudit/companions rows. The data was deterministic;
 * the unit creation was not — and across Rounds 8/10/11 the model dropped
 * between one and ALL of them (chain:node·chain:sass·chain:@types/node gone
 * from Round 11 despite all three needing real action). Three observations
 * make it a standing defect, and §T showed prompt rules cannot fix it: rule
 * effects drown in run-to-run variance. So the units move to code — same
 * treatment peerAudit/migrationSections already got — and the model only
 * judges what is listed.
 *
 * Sources, in dedup priority order (first wins the `sources[0]` slot; later
 * sources merge their field group onto the same unit instead of duplicating):
 *   peer-blocked  peerAudit.blocked rows — registry says the installed
 *                 version cannot serve the target (UPGRADE_REQUIRED/DEAD_END)
 *   engines       requirements.engines.changed — the target's Node range
 *   peer-diff     requirements.peerDependencies added/changed — the target
 *                 tightened or introduced a peer range. `removed` builds NO
 *                 unit: a dropped constraint is a relaxation, it forces no
 *                 companion work.
 *   companion     companions rows — related packages the registry cannot
 *                 rule on (no peer declared); dormancy/majorsBehind evidence
 *
 * Every helper feeding this is already target-gated (requirementsForThisTarget
 * & friends), so health checks and stale-card diffs produce zero chain units
 * by construction — the same invariant, inherited.
 *
 * `installedPackages` (E2c, l6-evidence.js) filters the peer-diff source and
 * only that one. Measured on the vite 5→8 golden: without it the source built
 * 12 units, 10 of them for OPTIONAL peers the project never installed
 * (tsx/jiti/yaml/esbuild/less/stylus/terser/sugarss/sass-embedded/
 * @vitejs/devtools) — noise the model cannot even rule on, since nothing in
 * the payload said whether they were installed. A tightened range on a peer
 * you do not have forces nothing; a REQUIRED peer you do not have is the
 * opposite (you must add it), so `optional` decides which way absence cuts.
 * peer-blocked and companion rows need no such filter — they are derived from
 * the installed set to begin with.
 */
export function buildChainUnits({ requirements = null, peerAudit = null, companions = null, installedPackages = null } = {}) {
  // null = the project could not be read. Unknown must not silently drop
  // units, so the filter simply does not apply.
  const installed = installedPackages && typeof installedPackages === 'object' ? installedPackages : null;
  // Only an OPTIONAL peer disappears by not being installed. npm treats a peer
  // with no peerDependenciesMeta entry as required, so unknown optionality
  // keeps the unit — "you must add this" is exactly what must not be dropped.
  const skipPeer = (peer) => Boolean(installed) && peer.optional === true && !(peer.name in installed);
  const installedVersionOf = (name) => (installed ? installed[name] ?? null : null);
  const byName = new Map();
  const merge = (name, source, fields) => {
    if (!name) return;
    const existing = byName.get(name);
    if (existing) {
      existing.sources.push(source);
      for (const [key, value] of Object.entries(fields)) {
        if (key === 'references') {
          existing.references = normalizeReferences([...existing.references, ...value]);
        } else if (!(key in existing)) {
          existing[key] = value;
        }
      }
      return;
    }
    byName.set(name, {
      unit: `chain:${name}`,
      name,
      sources: [source],
      references: [],
      ...fields,
    });
  };

  for (const row of peerAudit?.blocked ?? []) {
    merge(row.name, 'peer-blocked', {
      blocked: {
        installedVersion: row.installedVersion ?? null,
        installedPeerRange: row.installedPeerRange ?? null,
        verdict: row.verdict,
        firstCompatible: row.firstCompatible ?? null,
        latestCompatible: row.latestCompatible ?? null,
      },
      references: normalizeReferences(row.references),
    });
  }

  /*
   * `compared`(목표 버전의 요구 범위)가 있어야 유닛이 된다 — engines 필드가
   * 목표에서 **사라진** 것은 제약 소멸(완화)이라 peer의 `removed`와 같은 규칙로
   * 아무 동반 작업도 강제하지 않는다. 실제 프로젝트 실측(2026-08-24): vuetify 4.1.11이
   * engines를 아예 안 싣는데 changed=true만 보고 chain:node ACTION이 나왔다(FP —
   * 대장 §J·§L의 "Node engines 뿌리"와 같은 계열).
   */
  if (requirements?.engines?.changed && requirements.engines.compared) {
    merge('node', 'engines', {
      engines: { installed: requirements.engines.installed, compared: requirements.engines.compared },
    });
  }
  for (const added of requirements?.peerDependencies?.added ?? []) {
    if (skipPeer(added)) continue;
    merge(added.name, 'peer-diff', {
      peer: {
        from: null,
        to: added.range ?? null,
        optional: added.optional ?? null,
        installedVersion: installedVersionOf(added.name),
      },
    });
  }
  for (const changed of requirements?.peerDependencies?.changed ?? []) {
    if (skipPeer(changed)) continue;
    merge(changed.name, 'peer-diff', {
      peer: {
        from: changed.from ?? null,
        to: changed.to ?? null,
        optional: changed.optional ?? null,
        installedVersion: installedVersionOf(changed.name),
      },
    });
  }

  for (const row of companions ?? []) {
    merge(row.name, 'companion', {
      companion: {
        installedVersion: row.installedVersion ?? null,
        latestVersion: row.latestVersion ?? null,
        latestPublishedAt: row.latestPublishedAt ?? null,
        majorsBehind: row.majorsBehind ?? null,
        dormant: Boolean(row.dormant),
      },
      references: normalizeReferences(row.references),
    });
  }

  return [...byName.values()];
}

/**
 * A requirements diff is evidence ONLY when it was computed against this
 * run's target version.
 *
 * The library-screen info cards are collected before a target exists, so
 * their diff is against the registry's latest — reusing that here makes the
 * model manufacture `chain:` ACTION_REQUIRED units for upgrades the chosen
 * target never forces (observed: vite-plugin-vuetify flagged on a 3.6.10 →
 * 3.6.11 patch because the card compared against 4.1.8). The judgment must
 * then contradict its own evidence to be useful, which is exactly backwards.
 *
 * So the invariant lives here, in front of every runner (real and mock): a
 * diff compared against anything other than the target — including no target
 * at all, as in health checks, where "companion upgrades" have no meaning —
 * is dropped. Absence is honest; the wrong comparison is not.
 */
function requirementsForThisTarget(payload) {
  const requirements = payload.requirements ?? null;
  const targetVersion = payload.targetVersion ?? null;
  if (!requirements || !targetVersion) return null;
  return requirements.comparedTo === targetVersion ? requirements : null;
}

/**
 * Reverse peer audit rows, same evidence rule as requirements: only a scan
 * computed against THIS run's target counts. Non-OK rows are what the model
 * must act on; the OK count rides along so "나머지는 확인됨" is a statement,
 * not an absence.
 */
/*
 * Companions the peer audit must stay silent about: related to the analyzed
 * package (config reference, name, peer history) but with no peer declared by
 * the installed version, so the registry cannot rule on compatibility. What
 * it CAN say — latest version, publish date, dormancy — is what turns "확보
 * 하라" into per-package instructions. Capped and stripped to the fields the
 * judgment can actually cite.
 */
const MAX_COMPANIONS = 10;

function companionsForThisTarget(payload) {
  const audit = payload.peerAudit ?? null;
  const targetVersion = payload.targetVersion ?? null;
  if (!audit || !targetVersion || audit.targetVersion !== targetVersion) return null;
  const rows = (Array.isArray(audit.companions) ? audit.companions : [])
    // peer-declared rows already travel as peerAudit.blocked/okCount —
    // repeating them here invites double chain units.
    .filter((row) => row.peerVerdict === null)
    /*
     * Structurally wired only: referenced by the tool's config or related by
     * name. A row discovered solely through peer HISTORY while its installed
     * version declares nothing is the vue-router shape — newer versions grew
     * a relationship the project does not have — and prescribing work for it
     * would re-admit the false companion the peer-audit fix removed.
     */
    .filter((row) => (row.discoveredBy ?? []).some((rule) => rule !== 'PEER_HISTORY'))
    .slice(0, MAX_COMPANIONS)
    .map((row) => ({
      name: row.name,
      installedVersion: row.installedVersion,
      latestVersion: row.latestVersion,
      latestPublishedAt: row.latestPublishedAt ? String(row.latestPublishedAt).slice(0, 10) : null,
      majorsBehind: row.majorsBehind,
      dormant: Boolean(row.dormant),
      // E1 evidence (assembleJudgmentEvidence attaches this per row before
      // buildL6Input runs) — where THIS package is actually wired into the
      // project, so "확보하라" comes with a file to open instead of a name.
      references: normalizeReferences(row.references),
    }));
  return rows.length ? rows : null;
}

function peerAuditForThisTarget(payload) {
  const audit = payload.peerAudit ?? null;
  const targetVersion = payload.targetVersion ?? null;
  if (!audit || !targetVersion || audit.targetVersion !== targetVersion) return null;
  const rows = Array.isArray(audit.rows) ? audit.rows : [];
  return {
    blocked: rows
      .filter((row) => row.verdict !== 'OK')
      .slice(0, 12)
      .map((row) => ({
        name: row.name,
        installedVersion: row.installedVersion,
        installedPeerRange: row.installedPeerRange,
        verdict: row.verdict,
        firstCompatible: row.firstCompatible,
        latestCompatible: row.latestCompatible,
        references: normalizeReferences(row.references),
      })),
    okCount: rows.filter((row) => row.verdict === 'OK').length,
  };
}

/** E1's `{file, line, kind, excerpt}` shape, capped defensively — the
 * collector already caps to 4, this guards hand-built test/API payloads. */
function normalizeReferences(references) {
  return Array.isArray(references) ? references.slice(0, 4) : [];
}

/**
 * E3's `{files, unmatchedTerms}` shape. Absence (no evidence attached yet,
 * or the assembly step was skipped — e.g. a payload built by hand) must not
 * crash the prompt build; it degrades to "no evidence", which the prompt
 * rules already treat as "confirm from the project" territory.
 */
function normalizeUsageEvidence(usageEvidence) {
  if (!usageEvidence || typeof usageEvidence !== 'object') return { files: [], unmatchedTerms: [] };
  return {
    files: Array.isArray(usageEvidence.files) ? usageEvidence.files.slice(0, 4) : [],
    unmatchedTerms: Array.isArray(usageEvidence.unmatchedTerms) ? usageEvidence.unmatchedTerms.slice(0, 8) : [],
  };
}

export function buildL6Prompt(payload = {}) {
  // `gate` is run-log metadata, not judgment input — the model gets the units.
  const { gate, ...input } = buildL6Input(payload);
  return [
    '너는 라이브러리 업그레이드의 프로젝트 영향 판정자다.',
    '아래 JSON의 `units` 각각에 대해, 이 프로젝트 기준으로 판정하라.',
    '',
    /*
     * 도구 문단 삭제 (l6-deterministic-evidence-design.md §7). L6는 이제 L4와
     * 같은 계약이다 — 도구 0개, 입력에 실린 것이 전부. 재검증 금지 문단도
     * 함께 사라진다: 재검증할 도구가 없으니 "재검증하지 마라"는 지시 자체가
     * 성립하지 않는다. 오늘 이 문단을 두 번 고쳐 쓴 것(Round O 원문 → Round T
     * 원칙화)이 전부 도구 존재의 부작용 관리였다.
     */
    '판정·조치·근거는 아래 입력에 실린 증거만으로 쓴다 — 이 프로젝트의 소스를 직접 읽거나',
    '검색할 방법이 없다. 입력에 없는 파일 경로를 짐작으로 채우지 않는다: judgments[].files에는',
    'usageEvidence.files·configEvidence·references에 실제로 등장한 경로만 담는다.',
    '',
    'usageEvidence.unmatchedTerms(해당 유닛의 검사어를 코드에서 찾아봤으나 없었다)는',
    'NOT_AFFECTED의 유효한 근거다 — "검색어 X·Y가 코드 어디에도 없음"은 이미 확정된',
    '결정론 사실이지 재확인이 필요한 추측이 아니다.',
    '',
    '입력의 증거가 한 유닛의 판정을 확정하기에 부족하면(예: usageEvidence.files가 비어',
    '있고 unmatchedTerms도 그 질문에 답하지 않을 때) 확신 없는 판정을 지어내지 말고',
    'SMOKE_TEST를 고르고, 출력의 `evidenceGaps`에 "무엇이 확인되면 이 판정이 확정되는지"를',
    '한 문장으로 적는다. 이건 벌점이 아니라 이 시스템이 갭을 발견하는 방식이다 — 반복',
    '관측되면 다음에 그 사실을 코드가 미리 수집하도록 바뀐다.',
    '',
    '판정 규칙:',
    `- verdict는 ${VERDICTS.join(' | ')} 중 하나.`,
    '- ACTION_REQUIRED: 코드/설정을 고쳐야 목표 버전에서 동작. action(무엇을 고칠지)과 verify(어떻게 검증할지)를 반드시 채운다.',
    '- SMOKE_TEST: 수정은 없지만 런타임 동작이 달라질 수 있어 실제 화면/경로를 눌러 확인해야 함. verify에 확인 경로를 쓴다.',
    '- NOT_AFFECTED: 이 프로젝트가 쓰지 않거나(usageEvidence 근거), 동작이 달라질 여지가 없음. reason에 근거를 명시한다 — 근거 없는 NOT_AFFECTED 금지.',
    '- project.typePipeline.present가 false면, 타입 선언에만 존재하는 변경(types 스코프·d.ts 전용)은 NOT_AFFECTED다 — reason에 그 사실을 쓴다. 런타임 동작을 함께 바꾸는 변경에는 적용하지 않는다.',
    '- 확신이 없으면 SMOKE_TEST를 고른다. 판정을 회피하는 중간 값은 없다.',
    /*
     * `등` 금지 규칙은 2026-08-13에 넣었다가 되돌렸다. 백업:
     * scratchpad/removed-vague-rule.txt · 전말은 260813개발.md §T.
     *
     * 되돌린 이유는 "규칙이 해로웠다"가 아니라 **"효과를 실행 간 편차와 구분할
     * 수 없었다"**이다. 골든 3회로 확인한 편차 폭이 규칙 효과보다 크다:
     *
     *   `등` 개수   Round 8(규칙X) 13 · Round 10(규칙O) 11 · Round 11(규칙X) 9
     *   evidenceGaps           18   ·              23   ·              25
     *   출력 토큰          57,111   ·          60,106   ·          53,727
     *
     * 규칙 없는 Round 11이 `등`을 더 줄이고 gaps를 더 남겼다. 유닛 단위로 봐도
     * 같다 — 규칙 O는 해결 11/유지 2/신규 9, 규칙 X는 해결 9/유지 4/신규 5.
     * 어느 쪽이든 기준선의 대부분이 바뀌고 다른 데서 새로 생긴다. 한 쌍의
     * A/B로는 아무것도 귀속시킬 수 없다.
     *
     * 다시 시도한다면 두 가지가 먼저다:
     *  1) 같은 프롬프트로 3회 이상 돌려 편차 폭을 먼저 확정한다. 그보다 작은
     *     효과는 이 방법으로 측정할 수 없다.
     *  2) 금지가 아니라 대상이 닫힌 집합일 때만 적용되는 형태로 쓴다. 남은
     *     `등`의 절반 이상은 열린 집합이었다 — "사내 도메인, 리버스 프록시,
     *     사설 IP 등"은 사용자 환경이고 "오류(임포트 실패 등)"는 오류 클래스다.
     *     뭉갠 게 아니라 실제로 열려 있어서, 금지해도 고칠 수 없다.
     */
    '- item:*/group:* unit의 usageEvidence.files는 그 유닛의 검사어(searchTerms/componentTags)가',
    '  실제 코드에서(주석 제외) 매치된 file:line·발췌다 — 판정의 reason·files에 그대로 인용한다.',
    '  files가 비어 있고 unmatchedTerms만 있다면 "찾아봤으나 코드에 없다"가 그 자체로 근거다.',
    /*
     * chain unit 생성을 모델에 맡기던 규칙("…만들어 답에 추가한다")은 2026-08-14에
     * 제거됐다 — Round 8/10/11에서 모델이 유닛을 1~3건씩, 최악에는 조치 필요한
     * 3건 전부를 빠뜨렸다(l6-deterministic-evidence-design.md §8.2). 이제 유닛은
     * buildChainUnits가 코드로 만들어 units에 넣고, 모델은 판정만 한다.
     */
    '- chain:* unit은 requirements(peer/engines 변화)·peerAudit.blocked·companions 실측에서 코드가',
    '  만들어 units에 이미 넣은 동반 상향 유닛이다 — 다른 유닛과 똑같이 목록에 있는 것만 판정한다.',
    '  chain unit을 새로 만들거나 빼지 않는다. top-level requirements/peerAudit/companions는 같은',
    '  실측의 원본 문맥이다 — 거기 실린 행은 대응하는 chain unit에서 판정한다.',
    '  chain unit의 필드 그룹은 출처별 실측이고(sources가 그 목록), 필드를 그대로 대조해 가른다:',
    '  · blocked: 설치된 다른 패키지가 이 패키지에 거는 peer 제약의 registry 실측. UPGRADE_REQUIRED는',
    '    동반 상향(firstCompatible 이상), DEAD_END는 어떤 발행 버전도 목표를 지원하지 않아 교체/제거가',
    '    필요하다 — 모두 ACTION_REQUIRED로 답하고, references의 file:line을 조치에 그대로 인용한다',
    '    (references는 그 패키지가 프로젝트 어디서 실제로 쓰이는지(import·설정 등록·타입 참조·가상',
    '    모듈·manifest)의 실측이라 따로 찾지 않는다). references가 빈 배열이면 "선언만 되고 실제',
    '    참조가 없다"는 사실이다 — 안전하게 제거 가능하다는 근거로 쓴다.',
    '  · engines: 목표 버전의 Node 요구 범위 변화(installed→compared)다. package.json engines와',
    '    개발/빌드/CI 실행 환경의 Node 버전 조치를 action에 쓴다.',
    '  · peer: 목표 버전이 그 패키지에 거는 peer 범위 변화(from→to, from=null이면 신설)다.',
    '    installedVersion은 이 프로젝트가 실제로 선언한 직접 의존성의 해석된 버전 실측이다 —',
    '    to 범위와 직접 대조해 가른다: 이미 범위를 만족하면 NOT_AFFECTED(근거로 두 값을 적는다),',
    '    미만이면 ACTION_REQUIRED(상향 대상 버전을 action에 적는다). installedVersion이 null이면',
    '    직접 의존성으로 선언되지 않았다는 사실이고(optional=true면 애초에 유닛이 만들어지지 않는다),',
    '    optional=false인데 미설치면 새로 추가해야 한다는 뜻이므로 ACTION_REQUIRED다.',
    '  · companion: 분석 대상과의 관계(설정 참조·이름·peer 이력)는 확인됐지만 설치 버전이 peer를',
    '    선언하지 않아 registry로 호환을 판정할 수 없는 패키지의 실측이다. "전체 확보" 식으로',
    '    뭉뚱그리지 말고 latestVersion과 발행일을 명시하고, references 경로를 인용해 어디를 고칠지',
    '    구체화한다. majorsBehind가 크면 그 버전으로 상향하며 릴리즈 노트에서 목표 메이저 지원을',
    '    확인하라고 지시한다. dormant=true(장기 무발행)면 상향이 아니라 대체/제거 검토를 지시한다.',
    '- guide unit의 configVerdict는 설정 파일 실측이다. PRESENT면 configEvidence의 file·line이 실제로 그 옵션을 설정한 위치이므로 조치에 그 경로를 명시한다. ABSENT는 "그 옵션을 설정하지 않았다"는 확인이지 무관하다는 뜻이 아니다 — **기본값이 바뀌는 변경이면 미설정이야말로 영향을 그대로 받는다는 근거**이므로 SMOKE_TEST로, 쓰지도 않는 기능이 제거된 것이면 NOT_AFFECTED로 가르고 reason에 어느 쪽인지 적는다. configVerdict가 null인 섹션은 설정 축으로 판단할 수 없다 — usedComponents/files(사용 컴포넌트 실측)로 판단하거나, 그마저 없으면 SMOKE_TEST + evidenceGaps로 남긴다.',
    '  configEvidence 각 항목의 valueForm은 그 줄에 실제로 적힌 값의 형태 실측이다',
    '  (FUNCTION/OBJECT/ARRAY/STRING/PRIMITIVE/REFERENCE 중 하나, 판정 불가면 UNKNOWN이거나 아예 없음).',
    '  가이드 문구가 "이제 객체 형태여야 한다"·"함수 형태는 지원 종료" 식으로 특정 형태를 요구하면,',
    '  valueForm과 그 요구를 직접 대조해 이미 맞는 형태인지 갈라라 — 맞으면 NOT_AFFECTED, 어긋나거나',
    '  UNKNOWN/없음이면 조치 필요 여부를 그 갭 그대로 SMOKE_TEST+evidenceGaps로 남긴다. valueForm만으로',
    '  섣불리 확신하지 말 것: 값이 다음 줄에서 시작하거나 변수 참조인 경우가 UNKNOWN에 해당한다.',
    '- guide unit의 templateVerdict는 슬롯 프로퍼티·prop·디렉티브·Sass 변수 같은 템플릿/소스 토큰의 **소스 파일 전수 실측**이다.',
    '  PRESENT면 templateEvidence의 file·line이 개명·제거되는 패턴을 지금 쓰고 있는 위치 그 자체이므로',
    '  ACTION_REQUIRED로 판정하고 action에 그 파일·줄과 바꿀 표현을 명시한다. 이 증거는 설정 축',
    '  (configVerdict)과 무관하다 — configAbsent에 같은 토큰이 보여도 그것은 설정 파일 얘기일 뿐,',
    '  소스 사용을 부정하는 근거가 아니다.',
    '  templateAbsent는 그 토큰이 소스 전체에서 0히트라는 확정이다. 변경이 **그 기능의 사용을 전제**로',
    '  하면(특정 prop을 썼을 때만 달라지는 동작, 제거되는 변수를 재정의한 경우 등) NOT_AFFECTED로 접고',
    '  reason에 그 토큰이 미사용임을 적는다 — "쓰는지 확인하라"고 사람에게 넘기지 않는다. 단 미사용과',
    '  무관하게 적용되는 변경(기본값 변경·전역 스타일)은 configAbsent 규칙과 동일하게 SMOKE_TEST가 맞다.',
    '',
    '출력은 아래 형태의 JSON **하나만**. 설명 문장, 코드펜스, 주석 금지.',
    '{',
    '  "judgments": [ { "unit": "...", "verdict": "...", "reason": "...", "action": "..."|null, "verify": "..."|null, "files": ["..."] } ],',
    '  "smokePoints": [ "빌드는 통과하지만 런타임에 드러나는 유형의 확인 지점" ],',
    '  "evidenceGaps": [ { "unit": "...", "gap": "무엇이 확인되면 이 판정이 확정되는지 한 문장" } ],',
    '  "summary": {',
    '    "keyActions": [ "이번 업그레이드의 뼈대가 되는 조치 — 개별 조치 하나를 짧은 명사구로" ],',
    '    "commonRisks": [ "여러 판정에 걸쳐 반복 등장하는 공통 원인 — 짧은 명사구로" ]',
    '  }',
    '}',
    '',
    'evidenceGaps는 SMOKE_TEST로 내려간 유닛 중 입력 증거가 부족했던 것만 담는다 — 확신 있게',
    '판정한 유닛은 넣지 않는다. 갭이 없으면 빈 배열이 정답이다.',
    '',
    '건수 집계 문장은 쓰지 않는다(화면이 judgments 배열에서 직접 센다). keyActions는 아래 작업',
    '목록(judgments)을 그대로 재나열하는 자리가 아니다 — ACTION_REQUIRED 전체가 아니라 그중에서도',
    '이번 업그레이드의 뼈대가 되는 것만 추린다(보통 몇 개 안 된다. 개수를 채우려고 사소한 항목을',
    '끌어오지 않는다). 각 항목은 괄호 섞인 긴 문장이 아니라 독립된 짧은 명사구로 — 화면이 리스트로',
    '그대로 나열한다. commonRisks는 개별 조치가 아니라 그 조치들을 관통하는 원인(예: 특정 기반',
    '기술의 교체)일 때만 쓴다 — 없으면(원인 없이 조치들이 서로 독립적이면) 빈 배열이 정답이다.',
    '',
    '모든 텍스트 값은 한국어. unit 키는 입력의 unit 값을 그대로 쓴다.',
    '',
    JSON.stringify(input, null, 2),
  ].join('\n');
}

/**
 * summary는 구조화된 형태({ keyActions, commonRisks })가 현재 계약이다.
 * 문자열 형태는 이 스키마 이전에 기록된 재생 데이터(data/recordings/*.json)
 * 호환용으로만 남긴다 — 새 실행이 문자열을 반환하면 그건 계약 위반이지
 * 정상 경로가 아니다.
 */
function normalizeSummary(summary) {
  if (typeof summary === 'string') return summary;
  if (summary && typeof summary === 'object') {
    return {
      keyActions: Array.isArray(summary.keyActions) ? summary.keyActions : [],
      commonRisks: Array.isArray(summary.commonRisks) ? summary.commonRisks : [],
    };
  }
  return null;
}

/**
 * Light shape validation — enough to reject a malformed answer loudly.
 *
 * `options.expectedUnits` (unit-key array) adds the completeness check the
 * chain:* determinization made possible: every unit the code put into the
 * input MUST have a judgment. Before 2026-08-14 nothing enforced this, and
 * unit omission surfaced only as a golden-run scoring diff — Round 11
 * silently dropped three units whose actions were real. A missing unit now
 * fails the run loudly instead of shipping a quietly incomplete judgment.
 * (Extra units the model invented are NOT rejected here: they violate the
 * "목록에 있는 것만" rule but carry content, and killing a whole paid run
 * over surplus text helps no one — the screen just shows them.)
 */
export function validateL6Result(result, options = {}) {
  if (!result || !Array.isArray(result.judgments)) {
    throw new Error('L6 result is missing a judgments array');
  }
  for (const judgment of result.judgments) {
    if (!judgment.unit || !VERDICTS.includes(judgment.verdict)) {
      throw new Error(`L6 judgment has an invalid unit/verdict: ${JSON.stringify(judgment).slice(0, 120)}`);
    }
  }
  const expectedUnits = Array.isArray(options.expectedUnits) ? options.expectedUnits : [];
  if (expectedUnits.length) {
    const judged = new Set(result.judgments.map((judgment) => judgment.unit));
    const missing = expectedUnits.filter((unit) => !judged.has(unit));
    if (missing.length) {
      throw new Error(`L6 result is missing judgments for ${missing.length} unit(s): ${missing.join(', ')}`);
    }
  }
  return {
    judgments: result.judgments,
    smokePoints: Array.isArray(result.smokePoints) ? result.smokePoints : [],
    // evidenceGaps — new in the tool-free contract (§7): the model's own
    // backlog of "input evidence did not cover this" instead of silently
    // grepping the gap shut. Missing on older recordings; defaults to empty.
    evidenceGaps: Array.isArray(result.evidenceGaps) ? result.evidenceGaps : [],
    summary: normalizeSummary(result.summary),
  };
}
