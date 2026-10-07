import { defineStore } from 'pinia';

export const useGridPrefsStore = defineStore('gridPrefs', {
  state: () => ({
    density: 'compact',
    hiddenColumns: ['internalMemo'] as string[],
    lastExportAt: null as string | null,
  }),
  actions: {
    setDensity(density: string) {
      this.density = density;
    },
    markExported() {
      this.lastExportAt = new Date().toISOString();
    },
  },
});