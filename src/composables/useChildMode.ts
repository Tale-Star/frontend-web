import { reactive, ref } from 'vue'
import { ApiError } from '@/api/HttpClient'
import { authApi } from '@/api/authApi'
import { usePreferencesStore } from '@/stores/preferences'

export function useChildMode() {
  const preferences = usePreferencesStore()
  const form = reactive({ pin: '' })
  const validating = ref(false)
  const error = ref('')

  async function requestExit(): Promise<void> {
    if (validating.value) return
    const pin = form.pin
    if (!/^\d{4,8}$/.test(pin)) {
      error.value = 'Escribe el PIN de 4 a 8 dígitos.'
      return
    }
    validating.value = true
    error.value = ''
    try {
      const result = await authApi.validateParentalPin({ pin })
      if (result.valid) {
        preferences.leaveChildMode()
      } else {
        error.value = 'El PIN no es válido.'
      }
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        error.value = 'La sesión terminó. Vuelve a iniciar sesión para continuar.'
      } else if (cause instanceof ApiError && cause.status === 422) {
        error.value = `El backend rechazó el PIN: ${cause.message}`
      } else {
        error.value = cause instanceof Error ? cause.message : 'No se pudo validar el PIN.'
      }
    } finally {
      form.pin = ''
      validating.value = false
    }
  }

  return { form, validating, error, requestExit }
}
