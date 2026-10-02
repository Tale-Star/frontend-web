<script setup lang="ts">
import { useNoticesStore } from '@/stores/notices'

const notices = useNoticesStore()
</script>

<template>
  <div
    class="notice-stack"
    aria-live="polite"
    aria-atomic="false"
  >
    <div
      v-for="notice in notices.notices"
      :key="notice.id"
      class="notice"
      :class="'notice-' + notice.kind"
      role="status"
    >
      <span>{{ notice.message }}</span>
      <button
        class="notice-close"
        type="button"
        aria-label="Cerrar aviso"
        @click="notices.dismiss(notice.id)"
      >
        ×
      </button>
    </div>
  </div>
</template>
