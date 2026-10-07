<script setup>
/*
 * Agent 실행 고지 — 이 버튼을 누르면 무엇이 로컬 Claude CLI로 전송되는지,
 * 비용이 발생한다는 사실을 버튼 옆에서 밝히는 공용 블록.
 *
 * 버튼마다 전송 범위가 실제로 다르기 때문에 문구를 컴포넌트에 하드코딩하지
 * 않고 `items`로 받는다 — 분류 Agent는 공개 릴리즈 노트만 보고, 판정 Agent는
 * 거기에 프로젝트 파일 경로·발췌가 더해지고, 판정 Q&A는 Agent가 프로젝트
 * 파일을 직접 열어볼 수 있다. 한 문구로 뭉치면 그중 가장 넓은 범위를 모든
 * 버튼에 잘못 고지하거나, 가장 좁은 범위로 축소해 고지하게 된다.
 *
 * 항상 보이는 한 줄(비용·전송 사실) + 펼쳐서 보는 상세 목록 구조다. 전문을
 * 늘 펼쳐두면 화면이 고지문으로 덮이고, 반대로 전부 접어두면 "명시했다"고
 * 하기 어렵다.
 */
import { computed } from 'vue';

const props = defineProps({
  // 버튼 이름 — 어느 동작에 대한 고지인지 문장에서 지목한다.
  action: { type: String, required: true },
  // 전송 항목. 각 항목은 사용자가 알아볼 수 있는 명사구로 쓴다.
  items: { type: Array, required: true },
  /*
   * 사용량 규모를 API 요금으로 환산한 금액대만 넣는다(예: '$1~4'). 문장은
   * 컴포넌트가 쓰므로 호출부는 숫자만 준다 — 화면마다 표현이 갈리지 않게.
   *
   * 왜 '요금'이 아니라 '환산'인가: 이 도구는 로컬 Claude CLI를 호출하고, CLI는
   * 로그인된 구독 계정으로 동작한다(실측: init 이벤트의 apiKeySource가 none,
   * 스트림에 rateLimitType·utilization을 담은 rate_limit_event가 실린다).
   * 즉 호출마다 청구서가 발생하는 것이 아니라 구독 사용량 한도가 소비된다.
   * CLI가 보고하는 total_cost_usd는 API로 같은 일을 했을 때의 환산 값이라
   * 규모 비교용으로만 쓸 수 있다.
   *
   * SDK나 API 키 방식으로 옮기면 실제 청구가 발생하므로 이 문구를 다시
   * 써야 한다.
   */
  usageEquivalent: { type: String, default: '' },
  // Agent가 프로젝트 파일을 직접 열어볼 수 있는 경우에만 true.
  readsProjectFiles: { type: Boolean, default: false },
});

/*
 * 주제 조사 은/는은 앞 글자의 받침 유무로 갈린다 — 버튼 이름이 props로
 * 들어오므로 문장에 고정해 둘 수 없다("「다시 판정」은"은 맞지만
 * "「Agent에게 질문하기」은"은 비문이다).
 *
 * 한글 음절의 종성 인덱스는 (코드포인트 - 0xAC00) % 28로 얻고, 0이면 받침이
 * 없다. 한글이 아닌 문자로 끝나면(영문·숫자) 판정할 근거가 없으므로 읽을 때
 * 어색함이 덜한 '는'을 기본값으로 둔다.
 */
const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;
const JONGSEONG_COUNT = 28;

const topicParticle = computed(() => {
  const last = String(props.action ?? '').trim().slice(-1);
  if (!last) return '는';
  const code = last.charCodeAt(0);
  if (code < HANGUL_START || code > HANGUL_END) return '는';
  return (code - HANGUL_START) % JONGSEONG_COUNT === 0 ? '는' : '은';
});
</script>

<template>
  <details class="notice">
    <summary class="notice__summary">
      <span class="notice__mark" aria-hidden="true">ⓘ</span>
      <span class="notice__lead">
        「{{ action }}」{{ topicParticle }} 로컬에 설치된 Claude CLI를 호출하며, 호출할 때마다 로그인된 Claude 계정의
        사용량 한도가 소비됩니다. 전송되는 정보와 사용량 규모는 펼쳐서 확인하십시오.
      </span>
    </summary>

    <div class="notice__body">
      <p class="notice__label">Claude CLI로 전송되는 정보</p>
      <ul class="notice__list">
        <li v-for="item in items" :key="item">{{ item }}</li>
      </ul>

      <p class="notice__label">사용량</p>
      <p class="notice__row">
        이 기능은 실행할 때마다 별도로 요금이 청구되지 않습니다. 로컬 Claude CLI에 로그인된 계정의
        구독 사용량이 소비되며, 사용량 한도를 모두 소진하면 한도가 갱신될 때까지 같은 계정으로
        진행하는 다른 Claude 작업도 함께 제한됩니다.
      </p>
      <p v-if="usageEquivalent" class="notice__row">
        1회 실행의 사용량은 API 요금으로 환산하면 약 {{ usageEquivalent }} 수준입니다.
        실제로 청구되는 금액이 아니라, 기능 사이의 사용량 규모를 비교하기 위한 참고 값입니다.
      </p>

      <!--
        범위를 "주의하세요"가 아니라 "여기까지만 가능합니다"로 쓴다 —
        `Read(./**)` 스코프가 권한 계층에서 폴더 밖 접근을 실제로 차단하므로
        (실측: 설계 §6.7) 단정할 수 있는 사실이다.
      -->
      <p v-if="readsProjectFiles" class="notice__row notice__row--attention">
        이 기능은 Agent가 분석 대상 프로젝트 폴더의 파일을 직접 열어 확인합니다.
        질문 내용에 따라 위 목록에 없는 파일도 읽힙니다. 읽기 범위는 프로젝트 폴더
        내부로 제한되며, 상위 디렉터리와 시스템 파일 등 폴더 밖의 경로는 차단됩니다.
      </p>

      <!--
        사용 조건은 지시형으로 쓴다. 차단 목록은 파일 이름 기준이라 목록 밖을
        막지 못하는데, 그 사실을 완충 표현으로 적으면 사용자가 무엇을 해야 하는지
        알 수 없다. 막지 못한다는 사실과 그때 사용하지 말라는 지시를 함께 단정한다.
      -->
      <p v-if="readsProjectFiles" class="notice__row notice__row--precondition">
        <strong>사용 조건</strong> — 이 기능은 API 키·비밀번호 등 민감 정보를
        <code>.env</code>와 같은 별도 파일로 분리하여 관리하는 프로젝트에서만
        사용하십시오. 다음 파일은 읽기가 차단됩니다: <code>.env</code> 계열,
        개인키 및 인증서(<code>*.pem</code>, <code>*.key</code> 등),
        <code>.npmrc</code>, <code>.netrc</code>, <code>credentials.json</code>,
        서비스 계정 키 파일, <code>.ssh</code> 및 <code>.aws</code> 디렉터리.
        위 목록에 포함되지 않는 파일과 소스 코드에 직접 작성된 민감 정보는
        차단되지 않습니다. 이에 해당하는 프로젝트에서는 이 기능을 사용하지 마십시오.
      </p>

      <!--
        판단 기준을 우리가 정하지 않고 사내 정책을 가리킨다 — 무엇을 외부로
        보낼 수 있는지는 이 도구가 결정할 사항이 아니고, 사용자가 근거로
        삼아야 하는 문서는 사내 정책이다.
      -->
      <p class="notice__row">
        전송된 정보는 Anthropic의 Claude 모델이 요청을 처리하는 데 사용됩니다.
        이 기능을 사용하기 전에 AI 도구 사용에 관한 사내 보안 정책을 확인하고,
        해당 정책을 준수하여 사용하십시오.
      </p>

      <p class="notice__row">
        Agent는 읽기 전용으로 동작합니다. 프로젝트 파일을 수정하거나 생성하거나
        삭제하지 않으며, 셸 명령도 실행하지 않습니다.
      </p>
    </div>
  </details>
</template>

<style scoped>
.notice {
  border: 1px solid var(--line);
  border-radius: var(--radius-inner);
  background: var(--soft);
}

.notice__summary {
  display: flex;
  align-items: flex-start;
  gap: var(--s-2);
  padding: var(--s-3);
  cursor: pointer;
  list-style: none;
}

/* 기본 삼각형 마커 제거 — 좌측 ⓘ 마크가 그 역할을 한다. */
.notice__summary::-webkit-details-marker {
  display: none;
}

.notice__mark {
  flex: none;
  color: var(--muted);
  font-size: var(--t-small);
  line-height: 1.6;
}

.notice__lead {
  font-size: var(--t-small);
  line-height: 1.65;
  color: var(--muted);
}

.notice__body {
  padding: 0 var(--s-3) var(--s-3) var(--s-6);
  border-top: 1px solid var(--line-soft);
  padding-top: var(--s-3);
}

.notice__label {
  margin: 0 0 var(--s-2);
  font-size: var(--t-small);
  font-weight: 700;
  color: var(--text-2);
}

.notice__list {
  margin: 0 0 var(--s-3);
  padding-left: var(--s-5);
  font-size: var(--t-small);
  line-height: 1.7;
  color: var(--text-2);
}

.notice__row {
  margin: 0 0 var(--s-2);
  font-size: var(--t-small);
  line-height: 1.65;
  color: var(--muted);
}

.notice__row:last-child {
  margin-bottom: 0;
}

/* 사용 조건 — 경고(주의) 박스와 구분되게 차분한 강조로 둔다. */
.notice__row--precondition {
  padding: var(--s-2) var(--s-3);
  border-left: 3px solid var(--line-strong);
  border-radius: var(--radius-sm);
  background: var(--soft-alt);
  color: var(--text-2);
}

.notice__row--precondition code {
  font-size: var(--t-micro);
}

.notice__row--attention {
  padding: var(--s-2) var(--s-3);
  border-left: 3px solid var(--warn-fg);
  border-radius: var(--radius-sm);
  background: var(--warn-bg);
  color: var(--text-2);
}
</style>
