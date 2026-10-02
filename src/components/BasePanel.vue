<script setup lang="ts">
defineProps<{ padded?: boolean }>()
</script>

<template>
  <section
    class="glass-panel"
    :class="{ 'panel-no-padding': padded === false }"
  >
    <slot />
  </section>
</template>
