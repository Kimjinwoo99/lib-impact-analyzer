<template>
  <section class="overlay-lab">
    <v-btn ref="anchor" color="primary" @click="showOverlay = !showOverlay">Toggle overlay</v-btn>

    <v-overlay
      v-model="showOverlay"
      :activator="anchor"
      :attach="overlayAttachTarget"
      contained
      @update:location="updateLocation"
    >
      <v-card min-width="280">
        <v-card-title>Attach target</v-card-title>
        <v-card-text>
          <v-text-field v-model="location" label="updateLocation payload" />
          <v-chip>{{ shadowRootName }}</v-chip>
        </v-card-text>
      </v-card>
    </v-overlay>

    <v-menu :attach="menuAttachTarget" location="bottom" :close-on-content-click="false">
      <template #activator="{ props }">
        <v-btn v-bind="props" variant="tonal">Menu teleport</v-btn>
      </template>
      <v-list>
        <v-list-item title="ShadowRoot aware attach" />
        <v-list-item title="Teleport fallback path" />
      </v-list>
    </v-menu>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

const anchor = ref<HTMLElement | null>(null);
const showOverlay = ref(false);
const location = ref('bottom');
const overlayAttachTarget = '#mock-overlay-root';
const menuAttachTarget = '.app-shell';
const teleport = ref(true);
const shadowRootName = computed(() => {
  const root = anchor.value?.getRootNode();
  return root instanceof ShadowRoot ? 'ShadowRoot' : teleport.value ? 'document-root' : 'inline-root';
});

function updateLocation(nextLocation?: string) {
  location.value = nextLocation ?? 'bottom';
}
</script>