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
const isSubmitting = ref(false)
const errorMessage = ref('')

async function submit(): Promise<void> {
  errorMessage.value = ''
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
