<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import { generationApi } from '@/api/generationApi'
import { libraryApi } from '@/api/libraryApi'
import { mediaApi } from '@/api/mediaApi'
import BaseButton from '@/components/BaseButton.vue'
import BaseInput from '@/components/BaseInput.vue'
import BasePanel from '@/components/BasePanel.vue'
import UiIcon from '@/components/UiIcon.vue'
import { useNoticesStore } from '@/stores/notices'
import type { GenerationJob, MusicSectionRequest } from '@/types/api'

const notices = useNoticesStore()
const caption = ref('')
const duration = ref('120')
const bpm = ref('120')
const voice = ref('')
const language = ref<'Español' | 'English'>('Español')
const output = ref<'song' | 'instrumental'>('song')
const genreText = ref('')
const moodText = ref('')
const instrumentsText = ref('')
const productionText = ref('')
const seed = ref('')
const sections = ref<MusicSectionRequest[]>([])
const submitting = ref(false)
const currentJob = ref<GenerationJob | null>(null)
const mediaUrl = ref('')
const jobError = ref('')
let pollHandle: number | undefined
let isChecking = false

function splitValues(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean)
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
      jobError.value = ''
      const assetId = job.result?.asset_id
      if (typeof assetId === 'string') {
        if (mediaUrl.value) URL.revokeObjectURL(mediaUrl.value)
        mediaUrl.value = await mediaApi.loadAssetById(assetId)
        notices.push('La música está lista.')
      }
    } else if (job.status === 'Failed') {
      stopPolling()
      jobError.value = job.error_message || 'El trabajo de música no pudo completarse.'
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
  pollHandle = window.setInterval(() => void refreshJob(id), 4000)
}

function addSection(): void {
  sections.value.push({ Type: '', Modifier: '', Text: '' })
}

function removeSection(index: number): void {
  sections.value.splice(index, 1)
}

async function generate(): Promise<void> {
  jobError.value = ''
  submitting.value = true
  stopPolling()
  if (mediaUrl.value) URL.revokeObjectURL(mediaUrl.value)
  mediaUrl.value = ''
  try {
    const seedValue = seed.value.trim() ? Number(seed.value) : null
    if (seedValue !== null && (!Number.isInteger(seedValue) || seedValue < 0 || seedValue > 4_294_967_295)) {
      jobError.value = 'La seed debe ser un entero entre 0 y 4294967295.'
      return
    }
    const job = await generationApi.createMusic({
      Caption: caption.value,
      Duration: Number(duration.value),
      Bpm: Number(bpm.value),
      Voice: voice.value,
      Language: language.value,
      Output: output.value,
      Genre: splitValues(genreText.value),
      Mood: splitValues(moodText.value),
      Instruments: splitValues(instrumentsText.value),
      Production: splitValues(productionText.value),
      Sections: sections.value,
      Seed: seedValue,
    })
    currentJob.value = job
    notices.push('La solicitud musical quedó en la cola de generación.')
    if (job.status === 'Pending' || job.status === 'Processing') startPolling(job.id)
    else if (job.status === 'Succeeded') await refreshJob(job.id)
    else jobError.value = job.error_message || 'El trabajo de música no pudo completarse.'
  } catch (error) {
    jobError.value = error instanceof Error ? error.message : 'No se pudo solicitar la música.'
  } finally {
    submitting.value = false
  }
}

async function saveToLibrary(): Promise<void> {
  const assetId = currentJob.value?.result?.asset_id
  if (typeof assetId !== 'string') return
  await libraryApi.save({
    type: 'music',
    resource_id: assetId,
    name: caption.value.trim().slice(0, 200) || 'Música generada',
    description: caption.value,
  })
  notices.push('Música guardada en tu biblioteca.')
}

function downloadAudio(): void {
  if (!mediaUrl.value) return
  const link = document.createElement('a')
  link.href = mediaUrl.value
  link.download = 'tale-star-music'
  link.click()
}

onUnmounted(() => {
  stopPolling()
  if (mediaUrl.value) URL.revokeObjectURL(mediaUrl.value)
})
</script>

<template>
  <div class="page">
    <header class="page-heading">
      <div class="page-heading-copy">
        <span class="eyebrow">Música</span>
        <h1>Crea una canción</h1>
        <p>Define el estilo y envía una solicitud al worker de generación musical del backend.</p>
      </div>
    </header>

    <div class="music-layout">
      <BasePanel>
        <div class="section-heading">
          <div><h2>Dirección musical</h2><p>El backend combina estos campos en la generación.</p></div>
          <span class="form-hint">Los campos siguen el contrato de música.</span>
        </div>
        <div class="form-grid two">
          <BaseInput
            v-model="genreText"
            label="Género"
            placeholder="Pop, orquestal"
          />
          <BaseInput
            v-model="moodText"
            label="Mood"
            placeholder="Emocional, nostálgico"
          />
          <BaseInput
            v-model="instrumentsText"
            label="Instrumentos"
            placeholder="Cuerdas, piano"
          />
          <BaseInput
            v-model="productionText"
            label="Producción"
            placeholder="Cálida, pulida"
          />
          <div class="form-field field-wide">
            <span class="form-label">Tipo de salida</span>
            <div class="segmented-control">
              <button
                :class="{ active: output === 'song' }"
                type="button"
                @click="output = 'song'"
              >
                Canción
              </button>
              <button
                :class="{ active: output === 'instrumental' }"
                type="button"
                @click="output = 'instrumental'"
              >
                Instrumental
              </button>
            </div>
          </div>
          <BaseInput
            v-model="voice"
            label="Tipo de voz"
            placeholder="Ej.: Female · Powerful"
            :maxlength="100"
          />
          <label class="form-field">
            <span class="form-label">Idioma</span>
            <select
              v-model="language"
              class="form-control"
            >
              <option value="Español">Español</option>
              <option value="English">English</option>
            </select>
          </label>
          <label class="form-field field-wide">
            <span class="form-label">Caption</span>
            <textarea
              v-model="caption"
              class="form-control"
              rows="5"
              maxlength="4000"
              placeholder="Describe la música que quieres generar"
            />
          </label>
          <BaseInput
            v-model="duration"
            label="Duración (segundos)"
            type="number"
            :min="10"
            :max="600"
            required
          />
          <BaseInput
            v-model="bpm"
            label="BPM"
            type="number"
            :min="30"
            :max="300"
            required
          />
          <BaseInput
            v-model="seed"
            label="Seed (opcional)"
            type="number"
            :min="0"
            :max="4294967295"
          />
        </div>
        <div class="section-heading sections-heading">
          <div><h3>Estructura y letra</h3><p>Las secciones se enviarán con Type, Modifier y Text.</p></div>
          <BaseButton @click="addSection">
            <UiIcon
              name="plus"
              :size="15"
            /> Sección
          </BaseButton>
        </div>
        <div
          v-if="sections.length"
          class="music-sections"
        >
          <article
            v-for="(section, index) in sections"
            :key="index"
            class="music-section"
          >
            <div class="section-grid">
              <BaseInput
                v-model="section.Type"
                label="Tipo"
                placeholder="Verse, Chorus…"
                :maxlength="100"
              />
              <BaseInput
                v-model="section.Modifier"
                label="Modifier"
                placeholder="building energy"
                :maxlength="300"
              />
              <label class="form-field section-text">
                <span class="form-label">Texto</span>
                <textarea
                  v-model="section.Text"
                  class="form-control"
                  rows="3"
                  maxlength="2000"
                />
              </label>
            </div>
            <button
              class="button-icon remove-section"
              type="button"
              aria-label="Eliminar sección"
              @click="removeSection(index)"
            >
              <UiIcon
                name="trash"
                :size="15"
              />
            </button>
          </article>
        </div>
        <div
          v-else
          class="sections-empty"
        >
          Agrega una sección si quieres enviar letra o una indicación instrumental.
        </div>
        <BaseButton
          variant="primary"
          size="large"
          class="generate-music"
          :disabled="submitting"
          @click="generate"
        >
          <UiIcon
            name="music"
            :size="16"
          />
          {{ submitting ? 'Enviando…' : 'Generar música' }}
        </BaseButton>
      </BasePanel>

      <BasePanel class="music-result">
        <div class="section-heading">
          <div><h2>Generación</h2><p>El estado se consulta desde el trabajo guardado.</p></div>
          <span
            v-if="currentJob"
            class="status-pill"
            :class="'status-' + currentJob.status.toLowerCase()"
          >
            {{ currentJob.status }}
          </span>
        </div>
        <div class="music-cover">
          <UiIcon
            name="music"
            :size="48"
          />
        </div>
        <div
          v-if="currentJob?.status === 'Pending' || currentJob?.status === 'Processing'"
          class="job-progress"
        >
          <span
            class="spinner"
            aria-hidden="true"
          />
          <div><strong>{{ currentJob.status === 'Pending' ? 'En cola' : 'Generando audio' }}</strong><small>El worker actualizará este trabajo cuando termine.</small></div>
        </div>
        <div
          v-else-if="currentJob?.status === 'Succeeded' && mediaUrl"
          class="audio-result"
        >
          <audio
            :src="mediaUrl"
            controls
          />
          <div class="result-actions">
            <BaseButton @click="downloadAudio">
              <UiIcon
                name="download"
                :size="15"
              /> Descargar
            </BaseButton>
            <BaseButton
              variant="primary"
              @click="saveToLibrary"
            >
              Guardar
            </BaseButton>
          </div>
        </div>
        <div
          v-else-if="!currentJob"
          class="result-placeholder"
        >
          El resultado de audio aparecerá aquí cuando el worker termine.
        </div>
        <div
          v-if="jobError"
          class="auth-error"
          role="alert"
        >
          {{ jobError }}
        </div>
        <dl
          v-if="currentJob"
          class="job-meta"
        >
          <div><dt>Duración</dt><dd>{{ duration }} s</dd></div>
          <div><dt>BPM</dt><dd>{{ bpm }}</dd></div>
          <div><dt>Idioma</dt><dd>{{ language }}</dd></div>
          <div><dt>Formato</dt><dd>{{ output === 'song' ? 'Canción' : 'Instrumental' }}</dd></div>
        </dl>
      </BasePanel>
    </div>
  </div>
</template>

<style scoped>
.music-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(300px, 0.9fr);
  align-items: start;
  gap: 16px;
}

.section-heading p {
  margin-top: 4px;
}

.field-wide {
  grid-column: 1 / -1;
}

.segmented-control {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 3px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: rgba(240, 241, 244, 0.7);
}

.segmented-control button {
  min-height: 34px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--text-2);
  font-size: 10px;
  font-weight: 700;
}

.segmented-control button.active {
  background: rgba(230, 219, 254, 0.85);
  color: var(--accent);
  box-shadow: var(--shadow-sm);
}

.sections-heading {
  margin: 22px 0 12px;
}

.music-sections {
  display: grid;
  gap: 9px;
}

.music-section {
  position: relative;
  padding: 14px;
  border: 1px solid var(--accent-border);
  border-radius: 14px;
  background: rgba(230, 219, 254, 0.35);
}

.section-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding-right: 28px;
}

.section-text {
  grid-column: 1 / -1;
}

.remove-section {
  position: absolute;
  top: 10px;
  right: 8px;
}

.sections-empty {
  padding: 15px;
  border: 1px dashed var(--border-strong);
  border-radius: 13px;
  color: var(--text-3);
  font-size: 10px;
  text-align: center;
}

.generate-music {
  width: 100%;
  margin-top: 18px;
}

.music-cover {
  display: grid;
  min-height: 200px;
  place-items: center;
  border-radius: 16px;
  background: radial-gradient(circle at 40% 38%, rgba(177, 148, 254, 0.7), transparent 40%), linear-gradient(145deg, #332477, #16132c);
  color: #fff;
}

.result-placeholder {
  margin-top: 12px;
  color: var(--text-3);
  font-size: 11px;
  line-height: 1.5;
}

.job-progress {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-top: 14px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(230, 219, 254, 0.48);
}

.job-progress strong,
.job-progress small {
  display: block;
}

.job-progress strong {
  font-size: 11px;
}

.job-progress small {
  margin-top: 3px;
  color: var(--text-3);
  font-size: 9px;
}

.spinner {
  width: 23px;
  height: 23px;
  flex: 0 0 auto;
  border: 3px solid rgba(116, 84, 253, 0.2);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.audio-result {
  display: grid;
  gap: 11px;
  margin-top: 13px;
}

.audio-result audio {
  width: 100%;
}

.result-actions {
  display: flex;
  gap: 8px;
}

.job-meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;
  margin: 14px 0 0;
}

.job-meta div {
  padding: 9px;
  border-radius: 10px;
  background: rgba(240, 241, 244, 0.7);
}

.job-meta dt {
  color: var(--text-3);
  font-size: 8px;
  text-transform: uppercase;
}

.job-meta dd {
  margin: 4px 0 0;
  font-size: 11px;
  font-weight: 700;
}

.status-pill {
  padding: 5px 9px;
  border-radius: 999px;
  background: rgba(116, 84, 253, 0.1);
  color: var(--accent);
  font-size: 9px;
  font-weight: 750;
}

.status-succeeded { background: rgba(34, 160, 107, 0.12); color: #1a8153; }
.status-failed { background: rgba(224, 82, 101, 0.12); color: #b92e45; }

@media (max-width: 900px) {
  .music-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 520px) {
  .section-grid {
    grid-template-columns: 1fr;
  }

  .section-text {
    grid-column: auto;
  }
}
</style>
