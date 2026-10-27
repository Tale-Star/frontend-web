<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError } from '@/api/HttpClient'
import BaseButton from '@/components/BaseButton.vue'
import BaseInput from '@/components/BaseInput.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const displayName = ref('')
const email = ref('')
const password = ref('')
const parentalPin = ref('')
const acceptedTerms = ref(false)
const termsCheckbox = ref<HTMLInputElement | null>(null)
const termsError = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')

async function submit(): Promise<void> {
  errorMessage.value = ''
  termsError.value = ''
  if (!acceptedTerms.value) {
    termsError.value = 'Debes aceptar los términos y condiciones para crear tu cuenta.'
    termsCheckbox.value?.focus()
    return
  }
  isSubmitting.value = true
  try {
    await auth.register({
      display_name: displayName.value.trim(),
      email: email.value.trim(),
      password: password.value,
      ...(parentalPin.value ? { parental_pin: parentalPin.value } : {}),
    })
    const redirect = route.query.redirect
    await router.replace(typeof redirect === 'string' && redirect.startsWith('/') ? redirect : '/images')
  } catch (error) {
    errorMessage.value =
      error instanceof ApiError ? error.message : 'No se pudo crear la cuenta. Inténtalo de nuevo.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-card">
      <RouterLink
        class="auth-brand"
        to="/images"
      >
        <img
          src="/assets/tale-star-mark.png"
          alt=""
        >
        <span><strong>Tale Star</strong><small>Creative Studio</small></span>
      </RouterLink>
      <span class="eyebrow">Tu estudio creativo</span>
      <h1>Crea tu cuenta</h1>
      <p>Regístrate para guardar personajes, escenarios y tus creaciones.</p>
      <form
        class="auth-form"
        @submit.prevent="submit"
      >
        <BaseInput
          v-model="displayName"
          label="Nombre"
          autocomplete="name"
          placeholder="Cómo te llamas"
          :minlength="1"
          :maxlength="100"
          required
        />
        <BaseInput
          v-model="email"
          label="Correo electrónico"
          type="email"
          autocomplete="email"
          placeholder="tu@correo.com"
          required
        />
        <BaseInput
          v-model="password"
          label="Contraseña"
          type="password"
          autocomplete="new-password"
          hint="Usa entre 12 y 128 caracteres."
          :minlength="12"
          :maxlength="128"
          required
        />
        <BaseInput
          v-model="parentalPin"
          label="PIN parental (opcional)"
          type="password"
          inputmode="numeric"
          autocomplete="off"
          hint="Si lo configuras, debe contener entre 4 y 8 dígitos."
          :minlength="4"
          :maxlength="8"
          :pattern="parentalPin ? '[0-9]{4,8}' : undefined"
        />
        <div class="terms-consent">
          <input
            id="terms-accepted"
            ref="termsCheckbox"
            v-model="acceptedTerms"
            type="checkbox"
            :aria-invalid="termsError ? 'true' : undefined"
            :aria-describedby="termsError ? 'terms-error' : undefined"
            @change="termsError = ''"
          >
          <div>
            <label for="terms-accepted">He leído y acepto los términos y condiciones de Tale Star.</label>
            <RouterLink
              to="/terms"
              target="_blank"
              rel="noopener noreferrer"
            >
              Leer términos y condiciones (se abre en otra pestaña)
            </RouterLink>
          </div>
        </div>
        <p
          v-if="termsError"
          id="terms-error"
          class="terms-error"
          role="alert"
        >
          {{ termsError }}
        </p>
        <div
          v-if="errorMessage"
          class="auth-error"
          role="alert"
        >
          {{ errorMessage }}
        </div>
        <BaseButton
          variant="primary"
          size="large"
          type="submit"
          :disabled="isSubmitting"
        >
          {{ isSubmitting ? 'Creando cuenta…' : 'Crear cuenta' }}
        </BaseButton>
      </form>
      <p class="auth-footer">
        ¿Ya tienes una cuenta?
        <RouterLink to="/login">
          Inicia sesión
        </RouterLink>
      </p>
    </section>
  </main>
</template>

<style scoped>
.terms-consent {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: var(--text-2);
  font-size: 12px;
  line-height: 1.5;
}

.terms-consent input {
  flex: none;
  width: 17px;
  height: 17px;
  margin: 1px 0 0;
  accent-color: var(--accent);
  cursor: pointer;
}

.terms-consent label {
  cursor: pointer;
}

.terms-consent a {
  display: block;
  margin-top: 4px;
  color: #5b3dfa;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.terms-error {
  margin: -7px 0 0 27px;
  color: #9d2035;
  font-size: 11px;
}
</style>
