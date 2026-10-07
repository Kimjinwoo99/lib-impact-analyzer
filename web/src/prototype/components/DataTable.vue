<script setup>
import { computed, ref } from 'vue';
import EmptyState from './EmptyState.vue';
import InfoTooltip from './InfoTooltip.vue';

/**
 * The table shape shared by screens 02, 06, 07, 08 and 10.
 *
 * Column defs: { key, label, width?, sortable?, align?, mono?, hint? }
 * Cells render through a `#cell-<key>` slot; the raw value is the fallback.
 *
 * `hint` is { heading?, body, caution? } and puts one InfoTooltip next to the
 * column title — where an explanation of the whole column belongs. Per-cell
 * tooltips would repeat it on every row.
 */
const props = defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, required: true },
  rowKey: { type: Function, required: true },
  selectedKey: { type: [String, Number], default: null },
  clickable: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  size: { type: String, default: 'sm' }, // sm = dense comps, md = roomier
  // Reading mode for handoff lists (screen 10): cells wrap instead of
  // ellipsizing, and the table never grows wider than its container. The
  // default stays grid behavior — scanning columns beats reading there.
  wrap: { type: Boolean, default: false },
  maxHeight: { type: Number, default: 340 },
  emptyTitle: { type: String, default: '표시할 항목이 없습니다.' },
  emptyBody: { type: String, default: '' },
  emptyTone: { type: String, default: 'muted' },
});

const emit = defineEmits(['row-click']);

const sortKey = ref(null);
const sortDir = ref('asc');

function toggleSort(column) {
  if (!column.sortable) return;
  if (sortKey.value === column.key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = column.key;
    sortDir.value = 'asc';
  }
}

const sortedRows = computed(() => {
  if (!sortKey.value) return props.rows;
  const key = sortKey.value;
  const dir = sortDir.value === 'asc' ? 1 : -1;
  return [...props.rows].sort((a, b) => {
    const left = a[key];
    const right = b[key];
    if (left == null && right == null) return 0;
    if (left == null) return 1;
    if (right == null) return -1;
    if (typeof left === 'number' && typeof right === 'number') return (left - right) * dir;
    return String(left).localeCompare(String(right), 'ko') * dir;
  });
});

function ariaSort(column) {
  if (!column.sortable) return undefined;
  if (sortKey.value !== column.key) return 'none';
  return sortDir.value === 'asc' ? 'ascending' : 'descending';
}

function onRowKeydown(event, row) {
  if (!props.clickable) return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    emit('row-click', row);
  }
}

const skeletonRows = computed(() => Array.from({ length: 6 }, (_, i) => i));
</script>

<template>
  <div class="dt" :class="[`dt--${size}`, { 'dt--wrap': wrap }]">
    <div class="dt__scroll" :style="{ maxHeight: `${maxHeight}px` }">
      <!--
        The header cell is a container, not the sort button itself: a column
        hint is an InfoTooltip (role=button, tabindex=0) and nesting that
        inside the sort button would nest interactive elements and fire a sort
        whenever the tooltip is hovered or focused.
      -->
      <div class="dt__header" role="row">
        <div
          v-for="column in columns"
          :key="column.key"
          class="dt__th"
          :class="{ 'dt__th--num': column.align === 'right', 'dt__th--hinted': column.hint }"
          :style="{ flex: column.width ? `0 0 ${column.width}px` : '1 1 0' }"
          role="columnheader"
          :aria-sort="ariaSort(column)"
        >
          <button
            type="button"
            class="dt__thbtn"
            :class="{
              'dt__thbtn--sortable': column.sortable,
              'dt__thbtn--active': sortKey === column.key,
            }"
            :disabled="!column.sortable"
            @click="toggleSort(column)"
          >
            <span class="truncate">{{ column.label }}</span>
            <span v-if="column.sortable" class="dt__sort" aria-hidden="true">
              {{ sortKey === column.key ? (sortDir === 'asc' ? '▲' : '▼') : '↕' }}
            </span>
          </button>
          <InfoTooltip v-if="column.hint" class="dt__hint" v-bind="column.hint" />
        </div>
      </div>

      <div v-if="loading" class="dt__body">
        <div v-for="i in skeletonRows" :key="i" class="dt__row dt__row--skeleton">
          <div
            v-for="column in columns"
            :key="column.key"
            class="dt__td"
            :style="{ flex: column.width ? `0 0 ${column.width}px` : '1 1 0' }"
          >
            <span class="dt__shimmer" :style="{ width: `${45 + ((i * 13) % 45)}%` }" />
          </div>
        </div>
      </div>

      <div v-else-if="!sortedRows.length" class="dt__body dt__body--empty">
        <EmptyState :title="emptyTitle" :body="emptyBody" :tone="emptyTone" />
      </div>

      <div v-else class="dt__body">
        <div
          v-for="row in sortedRows"
          :key="rowKey(row)"
          class="dt__row"
          :class="{
            'dt__row--clickable': clickable,
            'dt__row--selected': selectedKey != null && rowKey(row) === selectedKey,
          }"
          :tabindex="clickable ? 0 : undefined"
          :role="clickable ? 'button' : undefined"
          @click="clickable && emit('row-click', row)"
          @keydown="onRowKeydown($event, row)"
        >
          <div
            v-for="column in columns"
            :key="column.key"
            class="dt__td"
            :class="{ 'dt__td--num': column.align === 'right', mono: column.mono }"
            :style="{ flex: column.width ? `0 0 ${column.width}px` : '1 1 0' }"
          >
            <slot :name="`cell-${column.key}`" :row="row">{{ row[column.key] }}</slot>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dt {
  border: 1px solid var(--line);
  border-radius: var(--radius-table);
  background: var(--panel);
  overflow: hidden;
}

.dt__scroll {
  overflow: auto;
}

.dt__header {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: stretch;
  min-width: max-content;
  background: var(--soft);
  border-bottom: 1px solid var(--line);
}

.dt__th {
  display: flex;
  align-items: center;
  min-width: 0;
  height: 40px;
  border-left: 1px solid var(--line-soft);
}

.dt__th:first-child {
  border-left: 0;
}

/* The button fills the cell so its hover tint still covers the full header. */
.dt__thbtn {
  display: flex;
  align-items: center;
  gap: 5px;
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0 var(--s-3);
  border: 0;
  background: transparent;
  color: var(--muted);
  font-size: var(--t-small);
  font-weight: 700;
  text-align: left;
  cursor: default;
}

.dt__th--num .dt__thbtn {
  justify-content: flex-end;
}

.dt__thbtn--sortable {
  cursor: pointer;
}

.dt__thbtn--sortable:hover {
  background: var(--line-soft);
  color: var(--text-2);
}

.dt__thbtn--active {
  color: var(--accent);
}

/* Sits outside the button, so the label keeps the cell's left padding. */
.dt__hint {
  flex: none;
  margin-right: var(--s-3);
  color: var(--muted);
}

/* Keep the mark next to its title instead of a full padding-width away. */
.dt__th--hinted .dt__thbtn {
  padding-right: 4px;
}

.dt__sort {
  font-size: 9px;
  opacity: 0.6;
}

.dt__thbtn--active .dt__sort {
  opacity: 1;
}

.dt__body {
  min-width: max-content;
}

.dt__body--empty {
  min-width: 100%;
}

.dt__row {
  display: flex;
  align-items: center;
  min-height: 44px;
  border-bottom: 1px solid var(--line-soft);
  background: var(--panel);
  transition: background var(--fast);
}

.dt__row:last-child {
  border-bottom: 0;
}

.dt__row--clickable {
  cursor: pointer;
}

.dt__row--clickable:hover {
  background: var(--soft-alt);
}

.dt__row--clickable:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

/* The lime edge marks the row; a tinted fill across the whole width did not. */
.dt__row--selected {
  background: var(--soft-alt);
  box-shadow: inset 3px 0 0 var(--brand);
}

.dt__row--selected:hover {
  background: var(--soft-alt);
}

.dt__td {
  min-width: 0;
  padding: var(--s-2) var(--s-3);
  color: var(--text-2);
  overflow: hidden;
  text-overflow: ellipsis;
}

.dt__td--num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.dt--sm .dt__td {
  font-size: var(--t-small);
}

.dt--md .dt__td {
  font-size: var(--t-body);
}

/* ---- wrap (reading) mode ---- */

/* A handoff list is read, not scanned: nothing may be cut off or pushed out. */
.dt--wrap .dt__header,
.dt--wrap .dt__body {
  min-width: 100%;
}

.dt--wrap .dt__row {
  align-items: flex-start;
}

.dt--wrap .dt__td {
  overflow: visible;
  text-overflow: clip;
  white-space: normal;
  overflow-wrap: anywhere;
}

/* ---- loading skeleton ---- */

.dt__row--skeleton {
  pointer-events: none;
}

.dt__shimmer {
  display: block;
  height: 10px;
  border-radius: 5px;
  background: linear-gradient(90deg, var(--line-soft) 25%, var(--line) 50%, var(--line-soft) 75%);
  background-size: 280px 100%;
  animation: dt-shimmer 1.2s linear infinite;
}

@keyframes dt-shimmer {
  to {
    background-position: 280px 0;
  }
}
</style>
