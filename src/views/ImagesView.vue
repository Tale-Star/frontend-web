<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { generationApi } from '@/api/generationApi'
import { libraryApi } from '@/api/libraryApi'
import { mediaApi } from '@/api/mediaApi'
import { resourcesApi } from '@/api/resourcesApi'
import BaseButton from '@/components/BaseButton.vue'
import BaseInput from '@/components/BaseInput.vue'
import BasePanel from '@/components/BasePanel.vue'
import BaseSelect from '@/components/BaseSelect.vue'
import UiIcon from '@/components/UiIcon.vue'
import { useNoticesStore } from '@/stores/notices'
import type { Character, GenerationJob, Scenario, StyleProfile } from '@/types/api'

const notices = useNoticesStore()
const characters = ref<Character[]>([])
const scenarios = ref<Scenario[]>([])
const styles = ref<StyleProfile[]>([])
const selectedCharacters = ref<string[]>([])
const scenarioId = ref('')
const styleId = ref('')
const action = ref('')
const emotion = ref('')
const moment = ref('')
const freePrompt = ref('')
const extra = ref('')
const objectsText = ref('')
const seed = ref('')
const loadingResources = ref(true)
const resourceLoadFailed = ref(false)
const submitting = ref(false)
const currentJob = ref<GenerationJob | null>(null)
const imageUrl = ref('')
const resultError = ref('')
let pollHandle: number | undefined
let isChecking = false

const selectedScenario = computed(() => scenarios.value.find((item) => item.id === scenarioId.value))
const selectedStyle = computed(() => styles.value.find((item) => item.id === styleId.value))
const selectedCharacterNames = computed(() =>
  characters.value.filter((item) => selectedCharacters.value.includes(item.id)).map((item) => item.name),
)
const builtPrompt = computed(() => {
  const parts = [
    selectedCharacterNames.value.join(', '),
    action.value.trim(),
    selectedScenario.value?.name || '',
    moment.value.trim(),
    emotion.value.trim(),
    objectsText.value.trim(),
    selectedStyle.value?.name || '',
    freePrompt.value.trim(),
    extra.value.trim(),
  ]
  return parts.filter(Boolean).join(' · ')
})

const scenarioOptions = computed(() =>
  scenarios.value.map((item) => ({ label: item.name, value: item.id })),
)
const styleOptions = computed(() =>
  styles.value.map((item) => ({ label: item.name, value: item.id })),
)

async function loadResources(): Promise<void> {
  loadingResources.value = true
  resourceLoadFailed.value = false
  try {
    const [characterRows, scenarioRows, styleRows] = await Promise.all([
      resourcesApi.listCharacters(),
      resourcesApi.listScenarios(),
      resourcesApi.listStyleProfiles(),
    ])
    characters.value = characterRows
    scenarios.value = scenarioRows
    styles.value = styleRows
  } catch {
    resourceLoadFailed.value = true
  } finally {
    loadingResources.value = false
  }
}

function toggleCharacter(id: string): void {
  selectedCharacters.value = selectedCharacters.value.includes(id)
    ? selectedCharacters.value.filter((value) => value !== id)
    : [...selectedCharacters.value, id]
}

function stopPolling(): void {
  if (pollHandle !== undefined) window.clearInterval(pollHandle)
  pollHandle = undefined
  isChecking = false
}

async function refreshJob(id: string): Promise<void> {
  if (isChecking) return
  isChecking = true
  try {
    const job = await generationApi.getJob(id)
    currentJob.value = job
    if (job.status === 'Succeeded') {
      stopPolling()
      resultError.value = ''
      const assetId = job.result?.asset_id
      if (typeof assetId === 'string') {
        if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
        imageUrl.value = await mediaApi.loadAssetById(assetId)
        notices.push('La imagen está lista.')
      }
    } else if (job.status === 'Failed') {
      stopPolling()
      resultError.value = job.error_message || 'El trabajo de imagen no pudo completarse.'
    }
  } catch {
    // The global API notice reports the failure; polling continues for temporary outages.
  } finally {
    isChecking = false
  }
}

function startPolling(id: string): void {
  stopPolling()
  void refreshJob(id)
  pollHandle = window.setInterval(() => void refreshJob(id), 3000)
}

async function generate(): Promise<void> {
  submitting.value = true
  resultError.value = ''
  stopPolling()
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
  imageUrl.value = ''
  try {
    const seedValue = seed.value.trim() ? Number(seed.value) : null
    if (seedValue !== null && (!Number.isInteger(seedValue) || seedValue < 0 || seedValue > 4_294_967_295)) {
      resultError.value = 'La seed debe ser un entero entre 0 y 4294967295.'
      return
    }
    const job = await generationApi.createImage({
      Action: action.value,
      Emotion: emotion.value,
      Scene: selectedScenario.value?.name || '',
      Moment: moment.value,
      Extra: extra.value,
      FreePrompt: freePrompt.value,
      Style: selectedStyle.value?.name || '',
      Characters: selectedCharacterNames.value,
      Objects: objectsText.value.split(',').map((value) => value.trim()).filter(Boolean),
      Seed: seedValue,
    })
    currentJob.value = job
    notices.push('La solicitud quedó en la cola de generación.')
    if (job.status === 'Pending' || job.status === 'Processing') startPolling(job.id)
    else if (job.status === 'Succeeded') await refreshJob(job.id)
    else resultError.value = job.error_message || 'El trabajo de imagen no pudo completarse.'
  } catch (error) {
    resultError.value = error instanceof Error ? error.message : 'No se pudo solicitar la imagen.'
  } finally {
    submitting.value = false
  }
}

async function saveToLibrary(): Promise<void> {
  const assetId = currentJob.value?.result?.asset_id
  if (typeof assetId !== 'string') return
  await libraryApi.save({
    type: 'image',
    resource_id: assetId,
    name: action.value.trim() || 'Imagen generada',
    description: builtPrompt.value,
  })
  notices.push('Imagen guardada en tu biblioteca.')
}

function downloadImage(): void {
  if (!imageUrl.value) return
  const link = document.createElement('a')
  link.href = imageUrl.value
  link.download = 'tale-star-image'
  link.click()
}

onMounted(loadResources)
onUnmounted(() => {
  stopPolling()
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
})
</script>

<template>
  <div class="page">
    <div class="image-workspace">
      <BasePanel>
        <div class="prompt-mode-switch">
          <span class="mode-label">Constructor guiado</span>
          <RouterLink
            class="mode-link"
            to="/library"
          >
            Administrar recursos
          </RouterLink>
        </div>

        <div class="section-heading">
          <div>
            <h2>Personajes</h2>
            <p>Elige personajes guardados para incluirlos en la escena.</p>
          </div>
        </div>
        <div
          v-if="loadingResources"
          class="inline-loader"
        >
          Cargando personajes…
        </div>
        <div
          v-else-if="characters.length"
          class="character-row"
        >
          <button
            v-for="character in characters"
            :key="character.id"
            class="character-choice"
            :class="{ selected: selectedCharacters.includes(character.id) }"
            type="button"
            :aria-pressed="selectedCharacters.includes(character.id)"
            @click="toggleCharacter(character.id)"
          >
            <span class="choice-avatar"><UiIcon
              name="characters"
              :size="17"
            /></span>
            <span class="choice-copy"><strong>{{ character.name }}</strong><small>{{ character.description || 'Personaje' }}</small></span>
            <UiIcon
              v-if="selectedCharacters.includes(character.id)"
              name="check"
              :size="16"
            />
          </button>
        </div>
        <div
          v-else
          class="resource-empty"
        >
          <span>{{ resourceLoadFailed ? 'No se pudieron cargar los personajes.' : 'Aún no tienes personajes guardados.' }}</span>
          <RouterLink to="/library">
            Abrir biblioteca
          </RouterLink>
        </div>

        <div class="form-grid two prompt-fields">
          <BaseInput
            v-model="action"
            label="Acción principal"
            placeholder="Describe qué sucede en la escena"
            :maxlength="200"
          />
          <BaseInput
            v-model="emotion"
            label="Emoción"
            placeholder="Describe el tono emocional"
            :maxlength="200"
          />
          <BaseSelect
            v-model="scenarioId"
            label="Escenario"
            :options="scenarioOptions"
            placeholder="Sin escenario guardado"
          />
          <BaseInput
            v-model="moment"
            label="Momento"
            placeholder="Ej.: atardecer"
            :maxlength="500"
          />
          <label class="form-field field-wide">
            <span class="form-label">Objetos visibles</span>
            <input
              v-model="objectsText"
              class="form-control"
              type="text"
              placeholder="Escribe objetos separados por comas"
            >
          </label>
          <BaseSelect
            v-model="styleId"
            label="Perfil de estilo"
            :options="styleOptions"
            placeholder="Sin perfil de estilo"
          />
          <BaseInput
            v-model="seed"
            label="Seed (opcional)"
            type="number"
            :min="0"
            :max="4294967295"
          />
          <BaseInput
            v-model="freePrompt"
            label="Prompt libre"
            placeholder="Añade indicaciones libres"
            :maxlength="4000"
          />
          <label class="form-field field-wide">
            <span class="form-label">Indicaciones adicionales</span>
            <textarea
              v-model="extra"
              class="form-control"
              rows="3"
              maxlength="2000"
              placeholder="Detalles adicionales para el generador"
            />
          </label>
        </div>

        <footer class="builder-footer">
          <span class="form-hint">La solicitud se enviará a la cola real del backend.</span>
          <BaseButton
            variant="primary"
            size="large"
            :disabled="submitting"
            @click="generate"
          >
            <UiIcon
              name="sparkle"
              :size="16"
            />
            {{ submitting ? 'Enviando…' : 'Generar imagen' }}
          </BaseButton>
        </footer>
      </BasePanel>

      <BasePanel class="image-preview">
        <div class="preview-heading">
          <div>
            <strong>Vista previa</strong>
            <small v-if="!currentJob">Tu resultado aparecerá aquí</small>
            <small v-else>{{ currentJob.status }}</small>
          </div>
          <UiIcon name="sparkle" />
        </div>
        <div class="image-stage">
          <img
            v-if="imageUrl"
            :src="imageUrl"
            alt="Resultado generado"
          >
          <div
            v-else
            class="preview-empty"
          >
            <UiIcon
              name="images"
              :size="40"
            />
            <span v-if="currentJob?.status === 'Pending'">En espera de un worker de generación…</span>
            <span v-else-if="currentJob?.status === 'Processing'">Tu imagen se está creando…</span>
            <span v-else>Tu próxima escena empieza aquí.</span>
          </div>
        </div>
        <div class="preview-actions">
          <BaseButton
            :disabled="!imageUrl"
            @click="downloadImage"
          >
            <UiIcon
              name="download"
              :size="15"
            /> Descargar
          </BaseButton>
          <BaseButton
            variant="primary"
            :disabled="!imageUrl || submitting"
            @click="saveToLibrary"
          >
            Guardar
          </BaseButton>
        </div>
        <div
          v-if="resultError"
          class="auth-error"
          role="alert"
        >
          {{ resultError }}
        </div>
        <div class="built-prompt">
          <strong>Prompt construido</strong>
          <p>{{ builtPrompt || 'Completa los campos para describir la imagen.' }}</p>
        </div>
        <div
          v-if="currentJob?.status === 'Pending' || currentJob?.status === 'Processing'"
          class="job-note"
        >
          <UiIcon
            name="clock"
            :size="14"
          />
          El worker procesa trabajos de forma asíncrona; el estado se actualiza automáticamente.
        </div>
      </BasePanel>
    </div>
  </div>
</template>

<style scoped>
.image-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(330px, 1fr);
  align-items: stretch;
  gap: 16px;
}

.image-workspace > :deep(.glass-panel) {
  min-height: calc(100vh - 68px);
}

.prompt-mode-switch {
  display: flex;
  width: fit-content;
  align-items: center;
  gap: 15px;
  margin-bottom: 22px;
  padding: 5px 7px;
  border-radius: 12px;
  background: rgba(240, 241, 244, 0.84);
}

.mode-label,
.mode-link {
  padding: 7px 12px;
  border-radius: 9px;
  font-size: 10px;
  font-weight: 750;
}

.mode-label {
  background: rgba(230, 219, 254, 0.7);
  color: var(--accent);
}

.mode-link {
  color: var(--text-2);
}

.mode-link:hover {
  color: var(--accent);
}

.section-heading {
  margin-bottom: 12px;
}

.section-heading p {
  margin-top: 4px;
}

.character-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 18px;
}

.character-choice {
  display: flex;
  min-width: 0;
  min-height: 52px;
  align-items: center;
  gap: 9px;
  padding: 7px 9px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: rgba(240, 241, 244, 0.85);
  text-align: left;
}

.character-choice.selected {
  border-color: var(--accent-border);
  background: rgba(230, 219, 254, 0.62);
  color: var(--accent);
}

.choice-avatar {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 10px;
  background: linear-gradient(140deg, #b194fe, #7454fd);
  color: #fff;
}

.choice-copy {
  min-width: 0;
  flex: 1;
}

.choice-copy strong,
.choice-copy small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.choice-copy strong {
  color: var(--text);
  font-size: 10px;
}

.choice-copy small {
  margin-top: 3px;
  color: var(--text-3);
  font-size: 9px;
}

.resource-empty {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 18px;
  padding: 12px;
  border: 1px dashed var(--accent-border);
  border-radius: 12px;
  color: var(--text-2);
  font-size: 10px;
}

.resource-empty a {
  color: var(--accent);
  font-weight: 750;
}

.inline-loader {
  margin-bottom: 18px;
  color: var(--text-3);
  font-size: 10px;
}

.prompt-fields {
  margin-top: 6px;
}

.field-wide {
  grid-column: 1 / -1;
}

.builder-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 22px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.preview-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 13px;
}

.preview-heading strong,
.preview-heading small {
  display: block;
}

.preview-heading strong {
  font-size: 14px;
}

.preview-heading small {
  margin-top: 4px;
  color: var(--text-3);
  font-size: 10px;
}

.image-stage {
  display: grid;
  min-height: 430px;
  place-items: center;
  overflow: hidden;
  border-radius: 16px;
  background: #e6dbfe;
}

.image-stage img {
  display: block;
  width: 100%;
  height: 100%;
  max-height: 560px;
  object-fit: contain;
}

.preview-empty {
  display: grid;
  max-width: 230px;
  justify-items: center;
  gap: 12px;
  color: rgba(255, 255, 255, 0.92);
  text-align: center;
}

.preview-empty span {
  font-size: 11px;
  line-height: 1.5;
}

.preview-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 10px;
}

.built-prompt {
  margin-top: 14px;
  padding-top: 13px;
  border-top: 1px solid var(--border);
}

.built-prompt strong {
  font-size: 10px;
}

.built-prompt p {
  margin: 7px 0 0;
  color: var(--text-3);
  font-size: 10px;
  line-height: 1.6;
}

.job-note {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 13px;
  color: var(--text-2);
  font-size: 10px;
}

@media (max-width: 900px) {
  .image-workspace {
    grid-template-columns: 1fr;
  }

  .image-workspace > :deep(.glass-panel) {
    min-height: 0;
  }

  .image-stage {
    min-height: 380px;
  }
}

@media (max-width: 520px) {
  .character-row {
    grid-template-columns: 1fr;
  }

  .image-stage {
    min-height: 280px;
  }

  .builder-footer {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
