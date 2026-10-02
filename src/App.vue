<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError } from '@/api/HttpClient'
import { useAuthStore } from '@/stores/auth'
import { useNoticesStore } from '@/stores/notices'
import AppNoticeStack from '@/components/AppNoticeStack.vue'

const auth = useAuthStore()
const notices = useNoticesStore()
const router = useRouter()

function onApiError(event: Event): void {
  const detail = (event as CustomEvent<ApiError>).detail
  if (detail) notices.push(detail.message, 'error')
}

function onUnauthorized(): void {
  auth.clearSession()
  if (router.currentRoute.value.meta.requiresAuth) {
    const redirect = router.currentRoute.value.fullPath
    void router.replace({ name: 'login', query: { redirect } })
  }
}

onMounted(() => {
  window.addEventListener('talestar:api-error', onApiError)
  window.addEventListener('talestar:unauthorized', onUnauthorized)
})

onUnmounted(() => {
  window.removeEventListener('talestar:api-error', onApiError)
  window.removeEventListener('talestar:unauthorized', onUnauthorized)
})
</script>

<template>
  <RouterView />
  <AppNoticeStack />
</template>
