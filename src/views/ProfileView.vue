<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '@/components/BaseButton.vue'
import BasePanel from '@/components/BasePanel.vue'
import UiIcon from '@/components/UiIcon.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const initials = computed(() =>
  auth.user?.display_name
    .split(/\s+/)
    .map((part) => part.slice(0, 1))
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'TS',
)

function signOut(): void {
  auth.clearSession()
  void router.replace({ name: 'login' })
}
</script>

<template>
  <div class="page">
    <header class="page-heading">
      <div class="page-heading-copy">
        <span class="eyebrow">Perfil</span>
        <h1>Tu cuenta</h1>
        <p>Datos de la cuenta autenticada con Tale Star API.</p>
      </div>
    </header>

    <div class="profile-layout">
      <BasePanel>
        <div class="profile-hero">
          <div class="profile-avatar-large">
            {{ initials }}
          </div>
          <div>
            <strong>{{ auth.user?.display_name || 'Sesión activa' }}</strong>
            <span>{{ auth.user?.email || 'Datos de cuenta no disponibles' }}</span>
          </div>
        </div>
        <div
          v-if="auth.user"
          class="profile-settings-list"
        >
          <div class="profile-setting-row">
            <div><strong>Correo electrónico</strong><small>Correo verificado por la sesión de API</small></div>
            <span class="profile-value">{{ auth.user.email }}</span>
          </div>
          <div class="profile-setting-row">
            <div><strong>PIN parental</strong><small>Estado devuelto por /api/v1/auth/me</small></div>
            <span class="profile-value">{{ auth.user.pin_configured ? 'Configurado' : 'Sin configurar' }}</span>
          </div>
          <div class="profile-setting-row">
            <div><strong>Cuenta creada</strong><small>Fecha devuelta por el backend</small></div>
            <span class="profile-value">{{ new Date(auth.user.created_at).toLocaleDateString() }}</span>
          </div>
          <div class="profile-setting-row">
            <div><strong>Identificador de cuenta</strong><small>UUID de usuario</small></div>
            <span class="profile-value account-id">{{ auth.user.id }}</span>
          </div>
        </div>
        <div
          v-else
          class="profile-unavailable"
        >
          <UiIcon
            name="clock"
            :size="17"
          />
          <span>No se pudo cargar la sesión actual. Comprueba la conexión con el backend.</span>
        </div>
        <div class="profile-actions">
          <BaseButton
            variant="danger"
            @click="signOut"
          >
            <UiIcon
              name="logout"
              :size="15"
            /> Cerrar sesión
          </BaseButton>
        </div>
      </BasePanel>

      <BasePanel class="session-panel">
        <span class="eyebrow">Sesión</span>
        <h2>Acceso seguro</h2>
        <p>La API autentica las solicitudes con un token bearer de duración limitada.</p>
        <div class="session-status">
          <span class="status-dot" />
          <div><strong>Token de acceso</strong><small>Guardado en esta pestaña y validado con la API.</small></div>
        </div>
        <div class="session-status">
          <span class="status-dot status-muted" />
          <div><strong>Renovación automática</strong><small>El backend no publica un endpoint de refresh.</small></div>
        </div>
      </BasePanel>
    </div>
  </div>
</template>

<style scoped>
.profile-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(290px, 0.85fr);
  align-items: start;
  gap: 14px;
}

.profile-hero {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--border);
}

.profile-avatar-large {
  display: grid;
  width: 52px;
  height: 52px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 15px;
  background: linear-gradient(145deg, #9974fe, #5b3dfa);
  color: #fff;
  font-size: 13px;
  font-weight: 800;
}

.profile-hero strong,
.profile-hero span {
  display: block;
}

.profile-hero strong {
  font-size: 14px;
}

.profile-hero span {
  margin-top: 4px;
  color: var(--text-3);
  font-size: 10px;
}

.profile-settings-list {
  display: grid;
}

.profile-setting-row {
  display: flex;
  min-height: 68px;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  border-bottom: 1px solid var(--border);
}

.profile-setting-row strong,
.profile-setting-row small {
  display: block;
}

.profile-setting-row strong {
  font-size: 11px;
}

.profile-setting-row small {
  margin-top: 3px;
  color: var(--text-3);
  font-size: 9px;
}

.profile-value {
  color: var(--text-2);
  font-size: 10px;
  text-align: right;
}

.account-id {
  max-width: 200px;
  overflow-wrap: anywhere;
}

.profile-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 15px;
}

.session-panel h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 21px;
}

.session-panel > p {
  color: var(--text-2);
  font-size: 11px;
  line-height: 1.55;
}

.session-status {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 14px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.4);
}

.session-status strong,
.session-status small {
  display: block;
}

.session-status strong {
  font-size: 10px;
}

.session-status small {
  margin-top: 3px;
  color: var(--text-3);
  font-size: 9px;
  line-height: 1.45;
}

.status-dot {
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  margin-top: 3px;
  border-radius: 50%;
  background: var(--success);
  box-shadow: 0 0 0 4px rgba(34, 160, 107, 0.1);
}

.status-muted {
  background: #a9a9b2;
  box-shadow: 0 0 0 4px rgba(93, 96, 109, 0.1);
}

.profile-unavailable {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 20px 0;
  color: var(--text-2);
  font-size: 11px;
}

@media (max-width: 900px) {
  .profile-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 520px) {
  .profile-setting-row {
    align-items: flex-start;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    padding-block: 11px;
  }

  .profile-value {
    text-align: left;
  }
}
</style>
