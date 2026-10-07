<script setup>
import { computed, ref, watch } from 'vue';

import { diffBlock } from '../lib/diffLines.js';

defineOptions({ name: 'FixDiffPanel' });

/*
 * 수정할 코드 위치 — git 방식 diff.
 *
 * 에디터 카드: 상단바에 파일 경로, 본문은 어두운 코드 바탕에서 삭제 줄
 * 빨강(−)/추가 줄 초록(+)/문맥 줄 무채색. 좌측 거터에 줄 번호(수정 전 기준 —
 * 블록의 시작 줄은 서버 대조(verifyFixBlocks)가 실측해 온다. 추가 줄은 원본에
 * 없던 줄이라 번호를 비운다). 명령은 파일이 아니므로 terminal 카드로 —
 * 줄 번호 없음(2026-08-22 사용자 지정).
 *
 * verified:false 블록은 diff로 그리지 않는다 — before가 실제 파일과 대조에
 * 실패한 생성물이다.
 */
const props = defineProps({
  fix: { type: Object, required: true },
});

const fileIndex = ref(0);
watch(() => props.fix, () => { fileIndex.value = 0; });

const files = computed(() => props.fix.files ?? []);
const currentFile = computed(() => files.value[fileIndex.value] ?? null);
const unverifiedCount = computed(() => (currentFile.value?.blocks ?? []).filter((block) => block.verified === false).length);

const diffBlocks = computed(() =>
  (currentFile.value?.blocks ?? [])
    .filter((block) => block.verified !== false)
    .map((block) => diffBlock(block)),
);

const SIGN = { del: '−', add: '+', ctx: ' ' };
</script>

<template>
  <div class="fixdiff">
    <div v-if="files.length > 1" class="fixdiff__files" role="tablist">
      <button
        v-for="(file, index) in files"
        :key="file.path"
        type="button"
        class="fixdiff__file mono"
        :aria-pressed="String(index === fileIndex)"
        @click="fileIndex = index"
      >
        {{ file.path }}
        <span class="fixdiff__blockcount">{{ file.blocks.length }}</span>
      </button>
    </div>

    <template v-if="currentFile">
      <div v-for="(block, index) in diffBlocks" :key="index" class="fixdiff__block">
        <p v-if="block.note" class="fixdiff__note">{{ block.note }}</p>
        <div class="fixdiff__editor">
          <div class="fixdiff__bar mono">
            <span class="fixdiff__dot" /><span class="fixdiff__dot" /><span class="fixdiff__dot" />
            <span class="fixdiff__path">{{ currentFile.path }}</span>
          </div>
          <div class="fixdiff__code">
            <div
              v-for="(line, lineIndex) in block.lines"
              :key="lineIndex"
              class="fixdiff__line"
              :class="`fixdiff__line--${line.type}`"
            ><span v-if="block.hasLineNumbers" class="fixdiff__no">{{ line.no ?? '' }}</span><span class="fixdiff__sign">{{ SIGN[line.type] }}</span><span class="fixdiff__text">{{ line.text }}</span></div>
          </div>
        </div>
      </div>
      <p v-if="unverifiedCount" class="fixdiff__unverified">
        생성된 수정안 {{ unverifiedCount }}건이 현재 파일과 일치하지 않아 표시하지 않습니다 — 조치 문장을 따르세요.
      </p>
    </template>

    <div v-if="fix.command" class="fixdiff__editor fixdiff__editor--terminal">
      <div class="fixdiff__bar mono">
        <span class="fixdiff__dot" /><span class="fixdiff__dot" /><span class="fixdiff__dot" />
        <span class="fixdiff__path">terminal</span>
      </div>
      <p class="fixdiff__command mono">$ {{ fix.command }}</p>
    </div>
  </div>
</template>

<style scoped>
.fixdiff__files {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
  margin-bottom: var(--s-3);
}
.fixdiff__file {
  padding: 4px 10px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--bg-soft, transparent);
  color: var(--fg);
  font-size: var(--t-small);
  cursor: pointer;
}
.fixdiff__file[aria-pressed='true'] {
  border-color: var(--accent, currentColor);
  font-weight: 600;
}
.fixdiff__blockcount {
  opacity: 0.6;
  margin-left: 4px;
}
.fixdiff__block + .fixdiff__block {
  margin-top: var(--s-4);
}
.fixdiff__note {
  font-size: var(--t-small);
  margin-bottom: var(--s-2);
  opacity: 0.85;
}
/* 에디터 카드 — 상단바(파일 경로) + 코드 본문. */
.fixdiff__editor {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(120, 130, 150, 0.25);
}
.fixdiff__editor--terminal {
  margin-top: var(--s-3);
}
.fixdiff__bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  background: #22252c;
  color: #aab1bf;
  font-size: var(--t-micro);
}
.fixdiff__dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #3d4250;
}
.fixdiff__path {
  margin-left: 6px;
  letter-spacing: 0.02em;
}
/* 검은 코드 화면 — git 스타일: 삭제 줄 빨강, 추가 줄 초록, 문맥 줄 무채색. */
.fixdiff__code {
  background: #16181d;
  color: #d6d9e0;
  padding: 8px 0;
  overflow-x: auto;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: var(--t-small);
  line-height: 1.6;
}
.fixdiff__line {
  display: flex;
  white-space: pre;
  padding: 0 12px 0 0;
}
.fixdiff__no {
  width: 44px;
  flex: none;
  text-align: right;
  padding-right: 10px;
  color: #5a6172;
  user-select: none;
}
.fixdiff__sign {
  width: 22px;
  flex: none;
  text-align: center;
  opacity: 0.9;
  font-weight: 700;
  user-select: none;
}
.fixdiff__line--del {
  background: rgba(229, 83, 75, 0.16);
  color: #f2b8b3;
}
.fixdiff__line--del .fixdiff__sign {
  color: #e5534b;
}
.fixdiff__line--add {
  background: rgba(70, 167, 88, 0.16);
  color: #b9e6c4;
}
.fixdiff__line--add .fixdiff__sign {
  color: #46a758;
}
.fixdiff__unverified {
  margin-top: var(--s-2);
  font-size: var(--t-small);
  color: var(--warn-fg, inherit);
}
.fixdiff__command {
  margin: 0;
  padding: 10px 12px;
  background: #16181d;
  color: #9fd0ff;
  font-size: var(--t-small);
  overflow-x: auto;
  white-space: pre;
}
</style>
