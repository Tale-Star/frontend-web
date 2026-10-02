<script setup lang="ts">
import AppSidebar from '@/components/AppSidebar.vue'
import ChildModeScreen from '@/components/ChildModeScreen.vue'
import { usePreferencesStore } from '@/stores/preferences'

const preferences = usePreferencesStore()
</script>

<template>
  <ChildModeScreen v-if="preferences.childMode" />
  <div
    v-else
    class="app-shell"
  >
    <AppSidebar />
    <div class="workspace">
      <main class="content">
        <RouterView />
      </main>
    </div>
  </div>
</template>
