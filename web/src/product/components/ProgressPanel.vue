<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  percent: { type: Number, required: true },
  message: { type: String, default: '' },
  tone: { type: String, default: 'muted' },
  active: { type: Boolean, default: false },
  /*
   * 진행 바 위의 단계 표식.
   * `[{ view, title, label, percent, body, interactive }]` — 도달한 단계만
   * 원점으로 남고(지나온 단계의 점은 계속 보인다), 원점에 커서를 올리면 그 단계
   * 설명 팝업이 뜬다. 문안은 호출부(ProductApp)가 준다. 팝업 제목은 `title`(그
   * 단계 화면의 제목)이고 `label`(스텝바 축약)은 대체값이다.
   *
   * `tag`가 있으면 사람이 관여하는 단계다 — 그 팝업만 연한 초록 바탕이 되고
   * 제목 옆에 이 문구가 라벨로 붙는다(도구가 자동 진행하는 단계와 구분).
   * 한 필드가 색과 문구를 함께 결정하므로 둘이 어긋날 수 없다.
   */
  milestones: { type: Array, default: () => [] },
});

const hovered = ref(null);

const reached = computed(() =>
  props.milestones
    .filter((mark) => mark.percent <= props.percent)
    .map((mark) => ({ ...mark, current: mark.percent === props.percent })),
);

/*
 * 팝업은 원점 중앙 정렬이 기본이지만, 양 끝 원점(20%·100%)에서는 중앙 정렬이
 * 패널 밖으로 넘친다 — 끝 쪽은 모서리를 맞춰 안쪽으로 눕힌다. 측정 없이
 * 위치만으로 가르므로 창 크기가 바뀌어도 다시 계산할 것이 없다.
 */
function alignClass(mark) {
  if (mark.percent >= 85) return 'mark__pop--end';
  if (mark.percent <= 15) return 'mark__pop--start';
  return '';
}
</script>

<template>
  <section class="progress" :class="{ 'progress--active': active }">
    <!--
      The bar tracks the wizard step. The number is intentionally not printed:
      it would read as "how much analysis is done", which it is not.
      aria-valuenow keeps the value available to assistive tech.
    -->
    <div class="progress__bar">
      <div
        class="progress__track"
        role="progressbar"
        aria-label="분석 단계 진행률"
        :aria-valuenow="percent"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div class="progress__fill" :class="{ 'progress__fill--active': active }" :style="{ width: `${percent}%` }" />
      </div>

      <div v-if="reached.length" class="progress__marks">
        <div v-for="mark in reached" :key="mark.view" class="mark" :style="{ left: `${mark.percent}%` }">
          <button
            type="button"
            class="mark__dot"
            :class="{ 'mark__dot--current': mark.current }"
            :aria-label="`${mark.label} 단계 설명`"
            @mouseenter="hovered = mark.view"
            @mouseleave="hovered = null"
            @focus="hovered = mark.view"
            @blur="hovered = null"
          />
          <div
            v-if="hovered === mark.view"
            class="mark__pop"
            :class="[alignClass(mark), { 'mark__pop--user': mark.tag }]"
            role="tooltip"
          >
            <p class="mark__pophead">
              <span class="mark__poptitle">{{ mark.title ?? mark.label }}</span>
              <!-- 바탕색만으로는 무엇을 뜻하는지 전달되지 않는다 — 색이 말하려던
                   것을 글자로도 적는다. 자동 진행 단계에는 붙지 않는다. -->
              <span v-if="mark.tag" class="mark__tag">{{ mark.tag }}</span>
            </p>
            <p v-if="mark.body" class="mark__popbody">{{ mark.body }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="progress__row">
      <p class="progress__message" :class="`progress__message--${tone}`" aria-live="polite">
        <span v-if="active" class="progress__spinner" aria-hidden="true" />
        {{ message }}
      </p>
    </div>
  </section>
</template>

<style scoped>
/*
 * overflow는 트랙에만 준다 — 패널이 잘라내면 원점 팝업까지 잘린다. 트랙이
 * 자기 위쪽 모서리를 직접 둥글려 패널 모서리와 어긋나지 않게 한다.
 */
.progress {
  position: relative;
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-inner);
  background: var(--panel);
  box-shadow: var(--shadow-card);
}

.progress__bar {
  position: relative;
}

.progress__track {
  position: relative;
  height: 5px;
  background: var(--track);
  border-radius: var(--radius-inner) var(--radius-inner) 0 0;
  overflow: hidden;
}

.progress__fill {
  height: 100%;
  background: var(--brand);
  transition: width 0.45s var(--ease);
}

/* Moving stripe while a run is in flight, so a long step never reads as frozen. */
.progress__fill--active {
  background-image: linear-gradient(
    115deg,
    rgba(255, 255, 255, 0) 25%,
    rgba(255, 255, 255, 0.38) 50%,
    rgba(255, 255, 255, 0) 75%
  );
  background-size: 220px 100%;
  background-repeat: repeat-x;
  animation: progress-stripe 1.4s linear infinite;
}

@keyframes progress-stripe {
  to {
    background-position: 220px 0;
  }
}

.progress__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-4);
  padding: var(--s-3) var(--s-5);
}

.progress__message {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  margin: 0;
  min-width: 0;
  font-size: var(--t-small);
  color: var(--muted);
}

.progress__message--ok {
  color: var(--ok-fg);
}
.progress__message--warn {
  color: var(--warn-fg);
}
.progress__message--bad {
  color: var(--bad-fg);
}

.progress__spinner {
  width: 12px;
  height: 12px;
  flex: none;
  border-radius: 50%;
  border: 2px solid var(--accent-bg);
  border-top-color: var(--accent);
  animation: progress-spin 0.7s linear infinite;
}

@keyframes progress-spin {
  to {
    transform: rotate(360deg);
  }
}

/* ---- 단계 원점 + 호버 팝업 ------------------------------------------- */

.progress__marks {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 5px;
}

.mark {
  position: absolute;
  top: 0;
}

/*
 * 히트 영역은 시각적 점보다 넉넉하게(14px) — 5px 바 위의 점은 조준하기
 * 어렵다. 실제로 보이는 원은 ::before가 그린다.
 */
.mark__dot {
  position: relative;
  display: block;
  width: 16px;
  height: 16px;
  padding: 0;
  border: 0;
  background: none;
  transform: translate(-50%, -5.5px);
  cursor: pointer;
}

.mark__dot::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 9px;
  height: 9px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: var(--brand);
  border: 2px solid var(--panel);
  box-sizing: content-box;
  transition: transform var(--fast);
}

.mark__dot:hover::before,
.mark__dot:focus-visible::before {
  transform: translate(-50%, -50%) scale(1.25);
}

/* 현재 단계의 점만 후광 — 어디까지 왔는지가 한눈에 보이게. */
.mark__dot--current::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 17px;
  height: 17px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: var(--brand);
  opacity: 0.22;
}

.mark__pop {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  width: max-content;
  max-width: min(320px, 78vw);
  padding: var(--s-3) var(--s-4);
  border: 1px solid var(--line);
  border-radius: var(--radius-inner);
  background: var(--panel);
  box-shadow: var(--shadow-pop, 0 10px 24px rgba(15, 23, 42, 0.16));
  pointer-events: none;
}

/*
 * 사람이 판단·선택하는 단계 — 연한 브랜드 초록 바탕. 완료를 뜻하는 --ok 계열이
 * 아니라 --accent 계열을 쓴다: 이 표시가 말하는 것은 "끝났다"가 아니라
 * "여기서는 사람이 결정한다"이기 때문이다.
 */
.mark__pop--user {
  background: var(--accent-bg);
  border-color: var(--accent-border);
}

.mark__pop--user .mark__poptitle {
  color: var(--accent-alt);
}

.mark__pop--user .mark__popbody {
  color: var(--text-2);
}

.mark__pop--start {
  left: 0;
  transform: none;
}

.mark__pop--end {
  left: auto;
  right: 0;
  transform: none;
}

/* 제목과 라벨이 같은 줄에 앉고, 라벨은 오른쪽 끝으로 밀린다. */
.mark__pophead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-3);
  margin: 0;
}

.mark__poptitle {
  font-size: var(--t-small);
  font-weight: 700;
  color: var(--text);
}

.mark__tag {
  flex: none;
  padding: 2px 7px;
  border-radius: var(--radius-pill);
  background: var(--panel);
  border: 1px solid var(--accent-border);
  font-size: var(--t-micro);
  font-weight: 700;
  color: var(--accent-alt);
  white-space: nowrap;
}

.mark__popbody {
  margin: var(--s-2) 0 0;
  font-size: var(--t-small);
  line-height: 1.65;
  color: var(--muted);
  white-space: normal;
}
</style>
