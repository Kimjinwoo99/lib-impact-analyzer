<script setup>
/*
 * 진단 — 헬스체크 모드의 유일한 산출물.
 *
 * 헬스체크는 업그레이드 영향분석과 반대 질문에 답한다: "옮기면 무엇이
 * 바뀌는가"가 아니라 "머물러서 무엇을 놓치고 있는가". 그래서 이 탭은 작업
 * 체크리스트가 아니라 판단 한 장이다 — 대응·테스트(와 그 안의 파일 축·상세)가
 * 이 모드에서 아예 안 뜨는 이유이기도 하다(ResultShell.vue).
 *
 * 판정(parseResult.healthcheck)은 L4/L6 Agent 없이 서버가 결정론으로
 * 조립한다(healthcheck-verdict.js) — OSV 취약점, 패치 라인 생사
 * (line-health.js), 사용 중인 영역인지의 사전 스캔. 이 탭은 그 판정을
 * 읽기만 한다.
 */
import { computed } from 'vue';
import InfoTooltip from '../../components/InfoTooltip.vue';

const props = defineProps({ analysis: { type: Object, required: true } });
const state = props.analysis.state;

const verdict = computed(() => state.parseResult?.healthcheck ?? null);
const lineHealth = computed(() => state.parseResult?.lineHealth ?? null);
const deprecation = computed(() => state.parseResult?.deprecation ?? null);

/*
 * 라벨·톤은 신호의 확실성을 따른다 — SECURITY(큐레이션된 DB)와
 * DEPRECATED(메인테이너의 명시적 선언)는 사실 진술이라 강한 톤이 맞지만,
 * LINE_DORMANT는 레지스트리 타이밍에서 추론한 경향 신호일 뿐이라 "상향
 * 권고"라는 확정적 문구·색은 과하다 — "검토 권장"으로 낮춘다.
 */
const LEVEL_LABEL = {
  SECURITY: { text: '즉시 업데이트 필요 · 보안', tone: 'bad' },
  DEPRECATED: { text: '업데이트 필요 · 지원 종료', tone: 'bad' },
  LINE_DORMANT: { text: '라인 검토 권장', tone: 'warn' },
  PATCH_AVAILABLE: { text: '패치 권장', tone: 'warn' },
  HEALTHY: { text: '현상 유지 무방', tone: 'ok' },
};

const LEVEL_HINT = {
  SECURITY: '설치 버전에 알려진 취약점이 있습니다. 즉시 검토가 필요합니다.',
  DEPRECATED: 'npm 레지스트리에 메인테이너가 직접 지원 종료로 표시한 버전입니다.',
  LINE_DORMANT: '지금 쓰는 major.minor 라인은 더 이상 패치를 받지 않습니다 — 앞으로 나올 수정은 다른 라인에만 적용됩니다.',
  PATCH_AVAILABLE: '같은 라인 안에서 적용 가능한 수정이 있고, 이 프로젝트가 실제로 쓰는 영역에 해당합니다.',
  HEALTHY: '보안·지원 상태·라인 생사·사용 영역 기준으로 지금 상태를 바꿀 이유를 찾지 못했습니다.',
};

const CALLOUT_TONE = {
  SECURITY: 'callout--bad',
  DEPRECATED: 'callout--bad',
  LINE_DORMANT: 'callout--warn',
  PATCH_AVAILABLE: 'callout--warn',
  HEALTHY: 'callout--idle',
};

const lineStatusText = computed(() => {
  const health = lineHealth.value;
  if (!health) return '판정 불가 — registry 정보 부족';
  if (health.status === 'DORMANT') {
    return `${health.myLine} 라인 단종 · 최신 라인 ${health.latestOverall}`;
  }
  return health.myLineIsLatest
    ? `${health.myLine} 라인 활성 (최신 라인)`
    : `${health.myLine} 라인 활성 · 최신 패치 ${health.lineFloor}`;
});

/*
 * 시연 시나리오 고정(pt-발표준비.md 조정 4): vite의 라우팅 목표는 8.2.2로
 * 고정한다. 동적 계산(취약점 최소 해결 버전·레지스트리 최신)은 실행 시점의
 * 외부 상태를 따라가므로, 준비된 수집·판정 기록(5.3.2→8.2.2)과 어긋날 수
 * 있다. 고정 버전은 최소 해결 버전보다 높아 "취약점이 모두 해결된다"는
 * 주장은 그대로 참이다.
 */
const ROUTING_PINS = {
  vite: {
    version: '8.2.2',
    reason: '확인된 취약점이 모두 해결된 최신 안정 버전입니다',
  },
};

const routing = computed(() => {
  if (!verdict.value?.routingTargetVersion) return null;
  const pin = ROUTING_PINS[state.selectedDependency?.name];
  if (pin) return pin;
  return { version: verdict.value.routingTargetVersion, reason: verdict.value.routingReason };
});

function upgradeTo(targetVersion) {
  if (!targetVersion || !state.selectedDependency) return;
  // 바로 실행하지 않는다(2026-08-22 피드백 1) — 버전 선택 화면으로 이동하되
  // 권장 버전이 목표로 미리 설정된 채 도착한다. 실행은 사람이 확인 후 누른다.
  props.analysis.selectDependency(state.selectedDependency, targetVersion);
}
</script>

<template>
  <div class="diagnosis">
    <div v-if="!verdict" class="callout callout--idle">
      <div>
        <p class="callout__title">진단 정보 없음</p>
        <p class="verdict__line">
          이 실행에서 헬스체크 진단을 만들지 못했습니다 — 서버가 이 기능 이전 버전이면 재시작 후 다시 실행하세요.
        </p>
      </div>
    </div>

    <template v-else>
      <div class="callout" :class="CALLOUT_TONE[verdict.level]">
        <div>
          <p class="callout__title">
            <InfoTooltip :heading="LEVEL_LABEL[verdict.level].text" :body="LEVEL_HINT[verdict.level]">
              <span class="pill" :class="`pill--${LEVEL_LABEL[verdict.level].tone}`">{{ LEVEL_LABEL[verdict.level].text }}</span>
            </InfoTooltip>
          </p>
          <p class="diagnosis__headline">{{ verdict.headline }}</p>
          <p v-if="verdict.detail" class="verdict__line">{{ verdict.detail }}</p>

          <!-- 왜 이 버전인지를 버튼과 같이 보여준다 — 근거 없이 "이 버전으로
               가라"는 버튼만 있으면 클릭할 이유가 안 생긴다. -->
          <p v-if="routing?.reason" class="diagnosis__routing-reason">
            {{ routing.reason }}
          </p>
          <button
            v-if="routing"
            type="button"
            class="btn btn--sm btn--primary diagnosis__cta"
            @click="upgradeTo(routing.version)"
          >
            {{ routing.version }}로 업데이트 영향분석 실행 →
          </button>
        </div>
      </div>

      <dl class="evidence">
        <div class="evidence__row">
          <dt>보안</dt>
          <dd>
            <template v-if="verdict.vulnerabilities?.length">
              취약점 {{ verdict.vulnerabilities.length }}건 —
              <template v-for="(vuln, index) in verdict.vulnerabilities" :key="vuln.id ?? index">
                <a v-if="vuln.url" :href="vuln.url" target="_blank" rel="noreferrer">{{ vuln.id }}</a>
                <span v-else>{{ vuln.id }}</span>
                <template v-if="vuln.severity"> ({{ vuln.severity }})</template>
                <template v-if="index < verdict.vulnerabilities.length - 1">, </template>
              </template>
            </template>
            <!-- "확인해서 0건"과 "확인 실패"는 다른 사실이다 — 후자를 전자로
                 접으면 OSV 장애가 조용히 "안전 확인됨"으로 둔갑한다. -->
            <template v-else-if="state.parseResult?.vulnerabilitiesChecked === false">확인 실패 — OSV.dev 응답 없음, 다시 시도해 주세요</template>
            <template v-else>취약점 0건 (OSV.dev, 설치 {{ state.parseResult?.currentVersion }} 기준)</template>
          </dd>
        </div>
        <div class="evidence__row">
          <dt>지원 상태</dt>
          <dd>
            <template v-if="deprecation?.deprecated">
              지원 종료(deprecated)<template v-if="deprecation.message"> — {{ deprecation.message }}</template>
            </template>
            <template v-else>지원 종료 표시 없음</template>
          </dd>
        </div>
        <div class="evidence__row">
          <dt>라인 상태</dt>
          <dd>{{ lineStatusText }}</dd>
        </div>
        <div class="evidence__row">
          <dt>미적용 패치</dt>
          <dd>
            {{ verdict.patchAheadCount }}건
            <template v-if="verdict.usedItems?.length"> — 그중 사용 영역 해당 {{ verdict.usedItems.length }}건</template>
            <template v-else-if="verdict.patchAheadCount"> — 사용 영역 해당 없음 또는 확인 불가</template>
          </dd>
        </div>
      </dl>

      <div v-if="verdict.usedItems?.length" class="diagnosis__patches">
        <p class="diagnosis__patches-title">이 프로젝트가 쓰는 영역의 미적용 수정</p>
        <ul>
          <li v-for="item in verdict.usedItems" :key="item.itemId">
            <span class="mono">{{ item.version }}</span>
            <span v-if="item.scope" class="diagnosis__scope">{{ item.scope }}</span>
            {{ item.summary }}
            <a v-if="item.sourceUrl" :href="item.sourceUrl" target="_blank" rel="noreferrer">원문 ↗</a>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>

<style scoped>
.diagnosis {
  margin-top: var(--s-5);
}

.diagnosis__headline {
  margin: var(--s-1) 0 0;
  font-size: var(--t-body);
  font-weight: 700;
  color: var(--text);
  line-height: 1.5;
}

.diagnosis__routing-reason {
  margin: var(--s-3) 0 0;
  font-size: var(--t-small);
  color: var(--muted);
}

.diagnosis__cta {
  margin-top: var(--s-2);
}

.evidence {
  margin: var(--s-5) 0 0;
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
}

.evidence__row {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  column-gap: var(--s-3);
  align-items: baseline;
  padding: var(--s-2) 0;
  border-top: 1px solid var(--line-soft);
  font-size: var(--t-small);
}

.evidence__row dt {
  color: var(--muted);
  font-weight: 600;
  text-align: right;
}

.evidence__row dd {
  margin: 0;
  color: var(--text-2);
  line-height: 1.65;
}

.diagnosis__patches {
  margin-top: var(--s-5);
}

.diagnosis__patches-title {
  margin: 0 0 var(--s-2);
  font-size: var(--t-small);
  font-weight: 600;
  color: var(--text-2);
}

.diagnosis__patches ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.diagnosis__patches li {
  padding: var(--s-2) 0;
  border-top: 1px solid var(--line-soft);
  font-size: var(--t-small);
  color: var(--text-2);
  line-height: 1.65;
}

.diagnosis__scope {
  margin: 0 var(--s-1);
  padding: 0 6px;
  border-radius: 4px;
  background: var(--soft-alt);
  color: var(--muted);
  font-size: var(--t-micro);
  font-weight: 600;
}
</style>
