import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { httpClient } from '@/api/HttpClient'
import App from '@/App.vue'
import { router } from '@/router'
import { useAuthStore } from '@/stores/auth'
import '@/styles/tokens.css'
import '@/styles/global.css'

const pinia = createPinia()
httpClient.setTokenProvider(() => useAuthStore(pinia).accessToken)

createApp(App).use(pinia).use(router).mount('#app')
