<script setup lang="ts">
import AppSidebar from '@/components/AppSidebar.vue'
</script>

<template>
  <div class="app-shell">
    <AppSidebar />
    <div class="workspace">
      <main class="content">
        <RouterView />
      </main>
    </div>
  </div>
</template>
