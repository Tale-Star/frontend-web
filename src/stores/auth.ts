import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { authApi } from '@/api/authApi'
import type { AuthResponse, LoginRequest, RegisterRequest, UserResponse } from '@/types/api'

const SESSION_TOKEN_KEY = 'tale-star-access-token'
let restoreTask: Promise<void> | undefined

function readStoredToken(): string | null {
  try {
    return window.sessionStorage.getItem(SESSION_TOKEN_KEY)
  } catch {
    return null
  }
}

function writeStoredToken(token: string | null): void {
  try {
    if (token) window.sessionStorage.setItem(SESSION_TOKEN_KEY, token)
    else window.sessionStorage.removeItem(SESSION_TOKEN_KEY)
  } catch {
    // Private browsing modes may disable storage; the in-memory session still works.
  }
}

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(null)
  const user = ref<UserResponse | null>(null)
  const initialized = ref(false)
  const isAuthenticated = computed(() => accessToken.value !== null)

  function applySession(session: AuthResponse): void {
    accessToken.value = session.access_token
    user.value = session.user
    writeStoredToken(session.access_token)
    initialized.value = true
  }

  function clearSession(): void {
    accessToken.value = null
    user.value = null
    writeStoredToken(null)
    initialized.value = true
  }

  async function restoreSession(): Promise<void> {
    if (initialized.value) return
    if (restoreTask) return restoreTask
    restoreTask = (async () => {
      accessToken.value = readStoredToken()
      if (!accessToken.value) {
        user.value = null
        return
      }
      try {
        user.value = await authApi.currentUser()
      } catch (error) {
        if (error instanceof Error && 'status' in error && error.status === 401) {
          clearSession()
        }
      }
    })().finally(() => {
      initialized.value = true
      restoreTask = undefined
    })
    return restoreTask
  }

  async function login(payload: LoginRequest): Promise<void> {
    applySession(await authApi.login(payload))
  }

  async function register(payload: RegisterRequest): Promise<void> {
    applySession(await authApi.register(payload))
  }

  return {
    accessToken,
    user,
    initialized,
    isAuthenticated,
    restoreSession,
    login,
    register,
    clearSession,
  }
})
