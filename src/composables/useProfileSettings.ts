import { onScopeDispose, reactive, ref } from 'vue'
import { ApiError } from '@/api/HttpClient'
import { authApi } from '@/api/authApi'
import { useAuthStore } from '@/stores/auth'
import { useNoticesStore } from '@/stores/notices'
import { usePreferencesStore } from '@/stores/preferences'

function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'La sesión o la contraseña actual no son válidas. Inicia sesión de nuevo si la sesión expiró.'
    if (error.status === 403) return 'Tu cuenta no tiene permiso para este cambio.'
    if (error.status === 404) return 'No se encontró el perfil de la cuenta.'
    if (error.status === 422) return `El backend rechazó los campos: ${error.message}`
    if (error.status >= 500) return 'Tale Star API tuvo un error. Inténtalo de nuevo.'
    return error.message
  }
  return error instanceof Error ? error.message : 'No se pudo completar esta acción.'
}

export function useProfileSettings() {
  const auth = useAuthStore()
  const preferences = usePreferencesStore()
  const notices = useNoticesStore()
  const loading = ref(true)
  const loadError = ref('')
  const savingPin = ref(false)
  const pinError = ref('')
  const pinSuccess = ref('')
  const pinForm = reactive({ currentPassword: '', pin: '', confirmPin: '' })
  const profileController = new AbortController()

  async function loadProfile(): Promise<void> {
    loading.value = true
    loadError.value = ''
    try {
      await auth.refreshUser(profileController.signal)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      loadError.value = messageFor(error)
    } finally {
      if (!profileController.signal.aborted) loading.value = false
    }
  }

  async function setParentalPin(): Promise<void> {
    pinError.value = ''
    pinSuccess.value = ''
    if (!pinForm.currentPassword || pinForm.currentPassword.length > 128) {
      pinError.value = 'Escribe tu contraseña actual.'
      return
    }
    if (!/^\d{4,8}$/.test(pinForm.pin)) {
      pinError.value = 'El PIN debe tener entre 4 y 8 dígitos.'
      return
    }
    if (pinForm.confirmPin !== pinForm.pin) {
      pinError.value = 'Los PIN no coinciden.'
      return
    }

    savingPin.value = true
    try {
      const user = await authApi.setParentalPin({
        current_password: pinForm.currentPassword,
        pin: pinForm.pin,
      })
      auth.updateUser(user)
      pinSuccess.value = 'PIN parental actualizado.'
      notices.push('PIN parental actualizado.')
    } catch (error) {
      pinError.value = messageFor(error)
    } finally {
      pinForm.currentPassword = ''
      pinForm.pin = ''
      pinForm.confirmPin = ''
      savingPin.value = false
    }
  }

  function enterChildMode(): void {
    if (!auth.user?.pin_configured) {
      pinError.value = 'Configura un PIN parental antes de activar el modo infantil.'
      return
    }
    preferences.enterChildMode()
  }

  onScopeDispose(() => profileController.abort())

  return {
    loading,
    loadError,
    savingPin,
    pinError,
    pinSuccess,
    pinForm,
    loadProfile,
    setParentalPin,
    enterChildMode,
  }
}
