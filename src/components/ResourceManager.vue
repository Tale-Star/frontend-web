<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { resourcesApi } from '@/api/resourcesApi'
import BaseButton from '@/components/BaseButton.vue'
import BaseInput from '@/components/BaseInput.vue'
import BaseModal from '@/components/BaseModal.vue'
import ResourceCard from '@/components/ResourceCard.vue'
import UiIcon, { type IconName } from '@/components/UiIcon.vue'
import { useNoticesStore } from '@/stores/notices'
import type {
  Character,
  Scenario,
  StyleProfile,
} from '@/types/api'

type ResourceKind = 'characters' | 'scenarios' | 'styles'
type ResourceRecord = Character | Scenario | StyleProfile

const props = defineProps<{ kind: ResourceKind }>()
const notices = useNoticesStore()
const records = ref<ResourceRecord[]>([])
const loading = ref(true)
const loadFailed = ref(false)
const modalOpen = ref(false)
const saving = ref(false)
const deletingId = ref('')
const editingId = ref<string | null>(null)
const search = ref('')
const formError = ref('')
const form = reactive({
  name: '',
  description: '',
  visualDescription: '',
  attributes: '{}',
  seed: '',
  promptModifier: '',
  visualSettings: '{}',
})

const labels: Record<ResourceKind, string> = {
  characters: 'personaje',
  scenarios: 'escenario',
  styles: 'perfil de estilo',
}

const icons: Record<ResourceKind, IconName> = {
  characters: 'characters',
  scenarios: 'scenarios',
  styles: 'styles',
}

async function load(): Promise<void> {
  loading.value = true
  loadFailed.value = false
  try {
    if (props.kind === 'characters') records.value = await resourcesApi.listCharacters(search.value)
    else if (props.kind === 'scenarios') records.value = await resourcesApi.listScenarios(search.value)
    else records.value = await resourcesApi.listStyleProfiles(search.value)
  } catch {
    loadFailed.value = true
  } finally {
    loading.value = false
  }
}

function clearForm(): void {
  editingId.value = null
  formError.value = ''
  Object.assign(form, {
    name: '',
    description: '',
    visualDescription: '',
    attributes: '{}',
    seed: '',
    promptModifier: '',
    visualSettings: '{}',
  })
}

function openCreate(): void {
  clearForm()
  modalOpen.value = true
}

function openEdit(record: ResourceRecord): void {
  clearForm()
  editingId.value = record.id
  form.name = 'name' in record ? record.name : ''
  form.description = record.description
  if ('visual_description' in record) form.visualDescription = record.visual_description
  if ('attributes' in record) form.attributes = JSON.stringify(record.attributes, null, 2)
  if ('seed' in record && record.seed !== null) form.seed = String(record.seed)
  if ('prompt_modifier' in record) form.promptModifier = record.prompt_modifier
  if ('visual_settings' in record) form.visualSettings = JSON.stringify(record.visual_settings, null, 2)
  modalOpen.value = true
}

function parseObject(value: string, label: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(value || '{}')
    if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
      formError.value = label + ' debe ser un objeto JSON.'
      return null
    }
    return parsed as Record<string, unknown>
  } catch {
    formError.value = label + ' debe contener JSON válido.'
    return null
  }
}

function parseSeed(): number | null | undefined {
  if (!form.seed.trim()) return null
  const value = Number(form.seed)
  if (!Number.isInteger(value) || value < 0 || value > 4_294_967_295) {
    formError.value = 'La seed debe ser un entero entre 0 y 4294967295.'
    return undefined
  }
  return value
}

async function submit(): Promise<void> {
  formError.value = ''
  if (!form.name.trim()) {
    formError.value = 'Escribe un nombre para continuar.'
    return
  }
  saving.value = true
  try {
    if (props.kind === 'characters') {
      const attributes = parseObject(form.attributes, 'Los atributos')
      if (!attributes) return
      const payload = {
        name: form.name.trim(),
        description: form.description,
        visual_description: form.visualDescription,
        attributes,
      }
      if (editingId.value) await resourcesApi.patchCharacter(editingId.value, payload)
      else await resourcesApi.createCharacter(payload)
    } else if (props.kind === 'scenarios') {
      const seed = parseSeed()
      if (seed === undefined) return
      const payload = {
        name: form.name.trim(),
        description: form.description,
        visual_description: form.visualDescription,
        seed,
      }
      if (editingId.value) await resourcesApi.patchScenario(editingId.value, payload)
      else await resourcesApi.createScenario(payload)
    } else {
      const visualSettings = parseObject(form.visualSettings, 'Los ajustes visuales')
      if (!visualSettings) return
      const payload = {
        name: form.name.trim(),
        description: form.description,
        prompt_modifier: form.promptModifier,
        visual_settings: visualSettings,
      }
      if (editingId.value) await resourcesApi.patchStyleProfile(editingId.value, payload)
      else await resourcesApi.createStyleProfile(payload)
    }
    modalOpen.value = false
    notices.push(editingId.value ? 'Cambios guardados.' : 'Recurso creado.')
    await load()
  } finally {
    saving.value = false
  }
}

async function remove(record: ResourceRecord): Promise<void> {
  if (!window.confirm('¿Eliminar ' + record.name + '? Esta acción no se puede deshacer.')) return
  deletingId.value = record.id
  try {
    if (props.kind === 'characters') await resourcesApi.deleteCharacter(record.id)
    else if (props.kind === 'scenarios') await resourcesApi.deleteScenario(record.id)
    else await resourcesApi.deleteStyleProfile(record.id)
    notices.push('Recurso eliminado.')
    await load()
  } finally {
    deletingId.value = ''
  }
}

function detail(record: ResourceRecord): string {
  if ('visual_description' in record) return record.visual_description
  if ('prompt_modifier' in record) return record.prompt_modifier
  return ''
}

function detailLabel(): string {
  return props.kind === 'styles' ? 'Modificador para el prompt' : 'Descripción visual'
}

onMounted(load)
</script>

<template>
  <section class="glass-panel">
    <div class="section-heading resource-manager-heading">
      <div>
        <h2>{{ kind === 'characters' ? 'Personajes' : kind === 'scenarios' ? 'Escenarios' : 'Perfiles de estilo' }}</h2>
        <p>
          {{
            kind === 'characters'
              ? 'Guarda personajes para reutilizarlos en tus escenas.'
              : kind === 'scenarios'
                ? 'Define lugares y escenarios que mantienen continuidad.'
                : 'Organiza modificadores visuales reutilizables.'
          }}
        </p>
      </div>
      <BaseButton
        variant="primary"
        @click="openCreate"
      >
        <UiIcon
          name="plus"
          :size="16"
        />
        Agregar
      </BaseButton>
    </div>

    <form
      class="resource-search"
      @submit.prevent="load"
    >
      <label class="search-field form-field">
        <span class="form-label">Buscar</span>
        <input
          v-model="search"
          class="form-control"
          type="search"
          :placeholder="'Buscar ' + labels[kind] + 's'"
        >
      </label>
      <BaseButton type="submit">
        Buscar
      </BaseButton>
    </form>

    <div
      v-if="loading"
      class="page-loader"
    >
      Cargando desde tu biblioteca…
    </div>
    <div
      v-else-if="loadFailed"
      class="empty-state"
    >
      <div class="empty-state-icon">
        <UiIcon :name="icons[kind]" />
      </div>
      <strong>No se pudo cargar esta lista</strong>
      <p>Comprueba la conexión con Tale Star API e inténtalo de nuevo.</p>
      <BaseButton
        class="retry-button"
        @click="load"
      >
        Volver a intentar
      </BaseButton>
    </div>
    <div
      v-else-if="records.length"
      class="resource-grid"
    >
      <ResourceCard
        v-for="record in records"
        :key="record.id"
        :name="record.name"
        :description="record.description"
        :detail="detail(record)"
        :icon="icons[kind]"
        :busy="deletingId === record.id"
        @edit="openEdit(record)"
        @delete="remove(record)"
      />
    </div>
    <div
      v-else
      class="empty-state"
    >
      <div class="empty-state-icon">
        <UiIcon :name="icons[kind]" />
      </div>
      <strong>{{ search ? 'No hay coincidencias' : 'Todavía no hay ' + labels[kind] + 's' }}</strong>
      <p>
        {{
          search
            ? 'Prueba con otra búsqueda.'
            : 'Los registros se guardarán en tu cuenta y estarán disponibles en tus creaciones.'
        }}
      </p>
      <BaseButton
        v-if="!search"
        variant="primary"
        @click="openCreate"
      >
        Crear {{ labels[kind] }}
      </BaseButton>
    </div>
  </section>

  <BaseModal
    v-model="modalOpen"
    :title="(editingId ? 'Editar ' : 'Crear ') + labels[kind]"
  >
    <form @submit.prevent="submit">
      <div class="modal-body">
        <BaseInput
          v-model="form.name"
          label="Nombre"
          :maxlength="120"
          required
        />
        <label class="form-field">
          <span class="form-label">Descripción</span>
          <textarea
            v-model="form.description"
            class="form-control"
            rows="3"
            :maxlength="kind === 'styles' ? 3000 : 5000"
          />
        </label>
        <template v-if="kind !== 'styles'">
          <label class="form-field">
            <span class="form-label">{{ detailLabel() }}</span>
            <textarea
              v-model="form.visualDescription"
              class="form-control"
              rows="3"
              maxlength="4000"
            />
          </label>
        </template>
        <template v-if="kind === 'characters'">
          <label class="form-field">
            <span class="form-label">Atributos (JSON)</span>
            <textarea
              v-model="form.attributes"
              class="form-control code-field"
              rows="4"
            />
            <small class="form-hint">Objeto JSON para los atributos del personaje.</small>
          </label>
        </template>
        <template v-else-if="kind === 'scenarios'">
          <BaseInput
            v-model="form.seed"
            label="Seed"
            type="number"
            :min="0"
            :max="4294967295"
            hint="Opcional. Usa un entero entre 0 y 4294967295."
          />
        </template>
        <template v-else>
          <label class="form-field">
            <span class="form-label">Modificador para el prompt</span>
            <textarea
              v-model="form.promptModifier"
              class="form-control"
              rows="3"
              maxlength="4000"
            />
          </label>
          <label class="form-field">
            <span class="form-label">Ajustes visuales (JSON)</span>
            <textarea
              v-model="form.visualSettings"
              class="form-control code-field"
              rows="4"
            />
            <small class="form-hint">Para imagen: zimage_lora_asset admite flat_anime_style_zit, amelicart_illustration o flat_color_zimage_base; zimage_lora_scale va de 0 a 2.</small>
          </label>
        </template>
        <div
          v-if="formError"
          class="auth-error"
          role="alert"
        >
          {{ formError }}
        </div>
      </div>
      <footer class="modal-footer">
        <BaseButton @click="modalOpen = false">
          Cancelar
        </BaseButton>
        <BaseButton
          variant="primary"
          type="submit"
          :disabled="saving"
        >
          {{ saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear recurso' }}
        </BaseButton>
      </footer>
    </form>
  </BaseModal>
</template>

<style scoped>
.resource-manager-heading {
  align-items: flex-start;
}

.resource-search {
  display: flex;
  align-items: flex-end;
  gap: 9px;
  margin: 14px 0 18px;
}

.retry-button {
  margin-top: 12px;
}

.code-field {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 11px;
}

@media (max-width: 700px) {
  .resource-manager-heading {
    flex-direction: column;
  }
}
</style>
