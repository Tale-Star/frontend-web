<script setup lang="ts">
import { onMounted, ref } from 'vue'
import BaseButton from '@/components/BaseButton.vue'
import BaseModal from '@/components/BaseModal.vue'
import ChildModeCard from '@/components/ChildModeCard.vue'
import LibraryItemViewer from '@/components/LibraryItemViewer.vue'
import UiIcon from '@/components/UiIcon.vue'
import { useChildMode } from '@/composables/useChildMode'
import { useLibraryCollection } from '@/composables/useLibraryCollection'
import type { LibraryItem } from '@/types/api'

const library = useLibraryCollection()
const { visibleItems, loading, loadError, load } = library
const { form, validating, error, requestExit } = useChildMode()
const exitModalOpen = ref(false)
const viewerOpen = ref(false)
const viewerItem = ref<LibraryItem | null>(null)

function openItem(item: LibraryItem): void {
  viewerItem.value = item
  viewerOpen.value = true
}

function openExit(): void {
  form.pin = ''
  error.value = ''
  exitModalOpen.value = true
}

async function submitExit(): Promise<void> {
  await requestExit()
  if (!error.value) exitModalOpen.value = false
}

onMounted(() => void load())
</script>

<template>
  <main class="child-mode-screen">
    <header class="child-mode-header">
      <div
        class="child-brand"
        aria-label="Tale Star"
      >
        <img
          src="/assets/tale-star-mark.png"
          alt=""
        >
        <span>Tale Star</span>
      </div>
      <div class="child-heading">
        <span class="eyebrow">Un lugar para imaginar</span>
        <h1>¿Qué quieres descubrir?</h1>
        <p>Elige una creación de tu biblioteca.</p>
      </div>
      <BaseButton
        class="exit-child-mode"
        @click="openExit"
      >
        <UiIcon
          name="close"
          :size="15"
        /> Salir del modo infantil
      </BaseButton>
    </header>

    <section
      class="child-library"
      aria-label="Biblioteca infantil"
    >
      <div
        v-if="loading"
        class="child-state"
        role="status"
      >
        <span
          class="child-spinner"
          aria-hidden="true"
        />
        <strong>Cargando tus creaciones…</strong>
      </div>
      <div
        v-else-if="loadError"
        class="child-state child-error"
        role="alert"
      >
        <strong>No se pudo abrir la biblioteca</strong>
        <p>{{ loadError }}</p>
        <BaseButton @click="load">
          Intentar otra vez
        </BaseButton>
      </div>
      <div
        v-else-if="visibleItems.length"
        class="child-library-grid"
      >
        <ChildModeCard
          v-for="item in visibleItems"
          :key="item.id"
          :item="item"
          @open="openItem(item)"
        />
      </div>
      <div
        v-else
        class="child-state"
      >
        <UiIcon
          name="sparkle"
          :size="27"
        />
        <strong>Tu biblioteca aún está vacía</strong>
        <p>Cuando guardes una creación, podrás verla aquí.</p>
      </div>
    </section>

    <LibraryItemViewer
      v-model="viewerOpen"
      :item="viewerItem"
    />

    <BaseModal
      v-model="exitModalOpen"
      title="Validación para salir"
    >
      <form
        class="exit-form"
        @submit.prevent="submitExit"
      >
        <p>Un adulto debe ingresar el PIN parental para continuar.</p>
        <label class="form-field">
          <span class="form-label">PIN parental</span>
          <input
            v-model="form.pin"
            class="form-control pin-input"
            type="password"
            inputmode="numeric"
            autocomplete="off"
            minlength="4"
            maxlength="8"
            pattern="[0-9]{4,8}"
            required
            aria-describedby="child-pin-hint"
            @input="form.pin = form.pin.replace(/\D/g, '').slice(0, 8)"
          >
          <small
            id="child-pin-hint"
            class="form-hint"
          >De 4 a 8 dígitos. Se valida con Tale Star API y no se guarda.</small>
        </label>
        <p
          v-if="error"
          class="pin-error"
          role="alert"
        >
          {{ error }}
        </p>
        <footer class="modal-footer">
          <BaseButton
            type="button"
            :disabled="validating"
            @click="exitModalOpen = false; form.pin = ''"
          >
            Cancelar
          </BaseButton>
          <BaseButton
            type="submit"
            variant="primary"
            :disabled="validating"
          >
            {{ validating ? 'Validando…' : 'Validar PIN' }}
          </BaseButton>
        </footer>
      </form>
    </BaseModal>
  </main>
</template>

<style scoped>
.child-mode-screen { position: fixed; z-index: 80; inset: 0; min-width: 320px; overflow: auto; padding: max(18px,env(safe-area-inset-top)) clamp(16px,4vw,58px) max(24px,env(safe-area-inset-bottom)); background: radial-gradient(circle at 12% 5%,rgba(230,219,254,.96) 0 10%,transparent 32%),radial-gradient(circle at 82% 16%,rgba(177,148,254,.78) 0 13%,transparent 38%),linear-gradient(150deg,#f8f6ff 0%,#e8e0ff 24%,#c7b4ff 55%,#8d69fe 82%,#7454fd 100%); }
.child-mode-header { display: grid; grid-template-columns: 1fr minmax(250px,2fr) 1fr; align-items: start; gap: 18px; max-width: 1500px; margin: 0 auto 24px; }
.child-brand { display: inline-flex; align-items: center; gap: 9px; color: var(--text); font-family: var(--font-display); font-size: 15px; font-weight: 800; }
.child-brand img { width: 36px; height: 36px; border-radius: 11px; box-shadow: var(--shadow-sm); }
.child-heading { text-align: center; }
.child-heading .eyebrow { margin: 0 0 5px; }
.child-heading h1 { margin: 0; font-family: var(--font-display); font-size: clamp(24px,3vw,36px); letter-spacing: -.03em; }
.child-heading p { margin: 6px 0 0; color: var(--text-2); font-size: 11px; }
.exit-child-mode { justify-self: end; }
.child-library { max-width: 1500px; min-height: 55vh; margin: 0 auto; padding: clamp(14px,2vw,24px); border: 1px solid rgba(255,255,255,.62); border-radius: 22px; background: rgba(255,255,255,.47); box-shadow: 0 15px 48px rgba(55,38,119,.1); backdrop-filter: blur(15px); }
.child-library-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(170px,1fr)); gap: 16px; }
.child-state { display: flex; min-height: 48vh; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: var(--text-2); text-align: center; }
.child-state strong { font-size: 13px; }
.child-state p { max-width: 380px; margin: 0; color: var(--text-3); font-size: 10px; line-height: 1.5; }
.child-error { color: #a02d40; }
.child-spinner { width: 25px; height: 25px; border: 3px solid rgba(116,84,253,.2); border-top-color: var(--accent); border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.exit-form { display: grid; gap: 14px; padding: 18px 20px 0; }
.exit-form > p:first-child { margin: 0; color: var(--text-2); font-size: 11px; }
.pin-input { letter-spacing: .2em; }
.pin-error { margin: 0; color: #a02d40; font-size: 10px; }
.exit-form .modal-footer { margin: 0 -20px; }
@media (max-width: 720px) {
  .child-mode-header { grid-template-columns: 1fr auto; align-items: center; }
  .child-brand { grid-column: 1; }
  .exit-child-mode { grid-column: 2; grid-row: 1; }
  .child-heading { grid-column: 1 / -1; grid-row: 2; }
  .child-library-grid { grid-template-columns: repeat(auto-fill,minmax(135px,1fr)); gap: 11px; }
}
@media (max-width: 420px) {
  .exit-child-mode :deep(.button) { min-height: 34px; padding-inline: 9px; font-size: 9px; }
  .child-library-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }
}
</style>
