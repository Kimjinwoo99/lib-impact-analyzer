<script setup>
/*
 * Application shell — mounts the product implementation, and only that.
 *
 * 2026-08-13: the 테스트/실구현 선택 바를 없애고 실구현 화면으로 고정했다.
 * 파일럿 시안(prototype)은 더 이상 쓰지 않지만 **삭제하지 않았다** —
 * `web/src/prototype/`에 그대로 있고, 전환 장치도
 * `web/src/shell/{workspaces.js, WorkspaceSwitcher.vue, ConfirmDialog.vue}`에
 * 보존돼 있다. 여기서 import하지 않으므로 번들에는 포함되지 않는다(지연
 * import였고 이제 참조가 없다).
 *
 * 되살리는 방법: 이 파일을 git 이력에서 되돌리면 된다 — 선택 바·전환 확인
 * 대화상자·워크스페이스 계약(hasWorkToDiscard/discardPoints/teardown)이 한
 * 커밋에 함께 들어 있다. ProductApp의 `defineExpose`는 그 계약용인데, 복원을
 * 쉽게 하려고 남겨 두었다(지금은 호출되는 곳이 없다).
 */
import ProductApp from './product/ProductApp.vue';
</script>

<template>
  <div class="shell">
    <ProductApp />
  </div>
</template>

<style scoped>
/*
 * 하단 여백은 고정 선택 바를 피하려고 76px을 두고 있었다. 바가 사라졌으니
 * 마지막 행이 화면 끝에 붙지 않을 만큼만 남긴다.
 */
.shell {
  min-height: 100vh;
  padding-bottom: var(--s-7);
}
</style>
