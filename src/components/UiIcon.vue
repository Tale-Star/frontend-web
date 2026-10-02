<script setup lang="ts">
import { computed } from 'vue'

export type IconName =
  | 'images'
  | 'stories'
  | 'music'
  | 'library'
  | 'profile'
  | 'characters'
  | 'scenarios'
  | 'styles'
  | 'plus'
  | 'edit'
  | 'trash'
  | 'logout'
  | 'search'
  | 'heart'
  | 'sparkle'
  | 'close'
  | 'arrow'
  | 'check'
  | 'moon'
  | 'sun'
  | 'clock'
  | 'download'
  | 'refresh'
  | 'settings'

const props = defineProps<{ name: IconName; size?: number }>()

const drawings: Record<IconName, string[]> = {
  images: ['M3 4h18v16H3z', 'M7 8h4', 'M7 12h10', 'M7 16h7'],
  stories: ['M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5z', 'M8 3v17', 'M12 8h5', 'M12 12h5'],
  music: ['M9 18V5l12-2v13', 'M9 18a3 2 0 1 1-6 0 3 2 0 0 1 6 0', 'M21 16a3 2 0 1 1-6 0 3 2 0 0 1 6 0'],
  library: ['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z'],
  profile: ['M20 21a8 8 0 0 0-16 0', 'M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10'],
  characters: ['M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8', 'M20 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
  scenarios: ['M3 19h18', 'm4 18 5-7 4 5 3-4 4 6', 'M7 6h.01', 'M17 8h.01'],
  styles: ['m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2z', 'm19 14 1.1 2.9L23 18l-2.9 1.1L19 22l-1.1-2.9L15 18l2.9-1.1z'],
  plus: ['M12 5v14', 'M5 12h14'],
  edit: ['M12 20h9', 'M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z'],
  trash: ['M3 6h18', 'M8 6V4h8v2', 'm19 6-1 14H6L5 6', 'M10 11v5', 'M14 11v5'],
  logout: ['M10 17l5-5-5-5', 'M15 12H3', 'M12 3h6a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-6'],
  search: ['m20 20-4.4-4.4', 'M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0'],
  heart: ['M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z'],
  sparkle: ['m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2z'],
  close: ['M18 6 6 18', 'M6 6l12 12'],
  arrow: ['M5 12h14', 'm12 5 7 7-7 7'],
  check: ['m5 12 4 4L19 6'],
  moon: ['M20.8 13A8.5 8.5 0 0 1 11 3.2 8.5 8.5 0 1 0 20.8 13Z'],
  sun: ['M12 3v2', 'M12 19v2', 'm4.9 4.9 1.4 1.4', 'm17.7 17.7 1.4 1.4', 'M3 12h2', 'M19 12h2', 'm4.9 19.1 1.4-1.4', 'm17.7 6.3 1.4-1.4', 'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z'],
  clock: ['M12 8v4l3 2', 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z'],
  download: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm7 10 5 5 5-5', 'M12 15V3'],
  refresh: ['M20 7v5h-5', 'M4 17v-5h5', 'M5.6 9a7 7 0 0 1 11.5-2L20 12', 'M4 12l2.9 5a7 7 0 0 0 11.5-2'],
  settings: ['M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z', 'm19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.5.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.6-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.8l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.5-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.5.9l1.7-.6 1.4 2.4-1.4 1.1a7 7 0 0 1 0 1.8Z'],
}

const paths = computed(() => drawings[props.name])
</script>

<template>
  <svg
    class="ui-icon"
    :width="size || 18"
    :height="size || 18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path
      v-for="(path, index) in paths"
      :key="index"
      :d="path"
    />
  </svg>
</template>
