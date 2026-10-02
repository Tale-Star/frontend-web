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
const email = ref('')
const password = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')

async function submit(): Promise<void> {
  errorMessage.value = ''
  isSubmitting.value = true
  try {
    await auth.login({ email: email.value.trim(), password: password.value })
    const redirect = route.query.redirect
    await router.replace(typeof redirect === 'string' && redirect.startsWith('/') ? redirect : '/images')
  } catch (error) {
    errorMessage.value =
      error instanceof ApiError ? error.message : 'No se pudo iniciar sesión. Inténtalo de nuevo.'
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
        to="/login"
      >
        <img
          src="/assets/tale-star-mark.png"
          alt=""
        >
        <span><strong>Tale Star</strong><small>Creative Studio</small></span>
      </RouterLink>
      <span class="eyebrow">Bienvenido de vuelta</span>
      <h1>Inicia sesión</h1>
      <p>Entra a tu espacio creativo para continuar con tus historias.</p>
      <form
        class="auth-form"
        @submit.prevent="submit"
      >
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
          autocomplete="current-password"
          placeholder="Tu contraseña"
          :minlength="1"
          :maxlength="128"
          required
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
          {{ isSubmitting ? 'Entrando…' : 'Entrar a Tale Star' }}
        </BaseButton>
      </form>
      <p class="auth-footer">
        ¿Aún no tienes cuenta?
        <RouterLink to="/register">
          Crear una cuenta
        </RouterLink>
      </p>
    </section>
  </main>
</template>
