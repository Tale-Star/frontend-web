<script setup lang="ts">
defineProps<{ active?: boolean; disabled?: boolean }>()
</script>

<template>
  <button
    class="chip"
    :class="{ active }"
    type="button"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>
