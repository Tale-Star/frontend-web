<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import BaseButton from '@/components/BaseButton.vue'
import BaseInput from '@/components/BaseInput.vue'
import BaseModal from '@/components/BaseModal.vue'
import BasePanel from '@/components/BasePanel.vue'
import UiIcon from '@/components/UiIcon.vue'
import { useMusicCreator } from '@/composables/useMusicCreator'

type MusicTagKey = 'Genre' | 'Mood' | 'Instruments' | 'Production'

const {
  form,
  tags,
  tagDrafts,
  sections,
  job,
  assetUrl,
  assetId,
  error,
  saveError,
  submitting,
  loadingAsset,
  saving,
  active,
  builtCaption,
  builtLyrics,
  jobStatusLabel,
  resultDuration,
  resultBpm,
  resultLanguage,
  resultExtension,
  resultMediaType,
  resultOutput,
  resultSeed,
  generate,
  resumePolling,
  addTag,
  onTagKeydown,
  removeTag,
  addSection,
  removeSection,
  moveSection,
  saveToLibrary,
  downloadAudio,
} = useMusicCreator()

const tagEditors: Array<{ key: MusicTagKey; label: string; placeholder: string }> = [
  { key: 'Genre', label: 'Género', placeholder: 'Escribe un género y pulsa Enter' },
  { key: 'Mood', label: 'Mood', placeholder: 'Escribe un mood y pulsa Enter' },
  { key: 'Instruments', label: 'Instrumentos', placeholder: 'Agrega instrumentos' },
  { key: 'Production', label: 'Producción', placeholder: 'Agrega indicaciones de producción' },
]
const quickSections = ['Intro', 'Verse', 'Pre-Chorus', 'Chorus', 'Bridge', 'Outro']
const showTextModal = ref(false)
const audioElement = ref<HTMLAudioElement | null>(null)
const playing = ref(false)
const currentTime = ref(0)
const audioDuration = ref(0)
const playerError = ref('')

const sliderMax = computed(() => Math.max(1, audioDuration.value))
const safeCurrentTime = computed(() => Math.min(currentTime.value, sliderMax.value))

watch(assetUrl, () => {
  playing.value = false
  currentTime.value = 0
  audioDuration.value = 0
  playerError.value = ''
})

function onLoadedMetadata(): void {
  const duration = audioElement.value?.duration
  audioDuration.value = duration && Number.isFinite(duration) ? duration : 0
}

function onTimeUpdate(): void {
  if (audioElement.value) currentTime.value = audioElement.value.currentTime
}

function onAudioEnded(): void {
  playing.value = false
}

async function togglePlayback(): Promise<void> {
  const audio = audioElement.value
  if (!audio || !assetUrl.value) return
  playerError.value = ''
  if (!audio.paused) {
    audio.pause()
    playing.value = false
    return
  }
  try {
    await audio.play()
    playing.value = true
  } catch {
    playerError.value = 'El navegador no pudo reproducir el audio recibido.'
  }
}

function seek(event: Event): void {
  const target = event.target as HTMLInputElement
  const nextTime = Number(target.value)
  if (audioElement.value && Number.isFinite(nextTime)) {
    audioElement.value.currentTime = nextTime
    currentTime.value = nextTime
  }
}

function formatTime(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '0:00'
  const seconds = Math.floor(value)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function sectionKeydown(index: number, event: KeyboardEvent): void {
  if (event.altKey && event.key === 'ArrowUp') {
    event.preventDefault()
    moveSection(index, -1)
  } else if (event.altKey && event.key === 'ArrowDown') {
    event.preventDefault()
    moveSection(index, 1)
  }
}

onBeforeUnmount(() => audioElement.value?.pause())
</script>

<template>
  <div class="page music-page">
    <header class="page-heading music-page-heading">
      <div class="page-heading-copy">
        <span class="eyebrow">Tale Star · Música</span>
        <h1>Crea una canción</h1>
        <p>Diseña la dirección musical y estructura cada parte antes de generar tu audio.</p>
      </div>
    </header>

    <div class="music-upper-grid">
      <BasePanel class="direction-panel">
        <div class="panel-title-row">
          <div>
            <h2>Dirección musical</h2>
            <p>El prompt combina estos valores en el caption final de ACE-Step.</p>
          </div>
          <span class="contract-note">Opciones de texto libre</span>
        </div>

        <div class="tag-editor-list">
          <section
            v-for="editor in tagEditors"
            :key="editor.key"
            class="tag-editor"
          >
            <label :for="'music-tag-' + editor.key">{{ editor.label }}</label>
            <div
              v-if="tags[editor.key].length"
              class="chip-list"
            >
              <span
                v-for="(tag, index) in tags[editor.key]"
                :key="tag.toLocaleLowerCase()"
                class="music-chip music-chip-selected"
              >
                {{ tag }}
                <button
                  type="button"
                  :aria-label="'Quitar ' + tag"
                  @click="removeTag(editor.key, index)"
                >
                  <UiIcon
                    name="close"
                    :size="11"
                  />
                </button>
              </span>
            </div>
            <div class="tag-entry-row">
              <input
                :id="'music-tag-' + editor.key"
                v-model="tagDrafts[editor.key]"
                class="form-control"
                :placeholder="editor.placeholder"
                maxlength="200"
                @keydown="onTagKeydown(editor.key, $event)"
              >
              <BaseButton
                :disabled="tags[editor.key].length >= 50 || !tagDrafts[editor.key].trim()"
                aria-label="Agregar valor"
                @click="addTag(editor.key)"
              >
                <UiIcon
                  name="plus"
                  :size="15"
                />
              </BaseButton>
            </div>
            <small class="field-hint">Se enviarán {{ tags[editor.key].length }} de 50 valores permitidos.</small>
          </section>
        </div>

        <div class="music-field-grid">
          <div class="form-field field-wide">
            <span class="form-label">Tipo de salida</span>
            <div class="segmented-control">
              <button
                type="button"
                :class="{ active: form.output === 'song' }"
                @click="form.output = 'song'"
              >
                ♫ Canción
              </button>
              <button
                type="button"
                :class="{ active: form.output === 'instrumental' }"
                @click="form.output = 'instrumental'"
              >
                ♫ Instrumental
              </button>
            </div>
          </div>
          <BaseInput
            v-model="form.voice"
            label="Tipo de voz"
            placeholder="Ej.: Female · Powerful"
            :maxlength="100"
          />
          <label class="form-field">
            <span class="form-label">Idioma</span>
            <select
              v-model="form.language"
              class="form-control"
            >
              <option value="Español">Español</option>
              <option value="English">English</option>
            </select>
          </label>
          <label class="form-field field-wide">
            <span class="form-label">Caption</span>
            <textarea
              v-model="form.caption"
              class="form-control caption-input"
              rows="3"
              maxlength="4000"
              placeholder="Describe el sonido que quieres crear…"
            />
          </label>
          <div class="form-field">
            <label for="music-duration">Duración</label>
            <div class="range-value-row">
              <input
                id="music-duration"
                v-model="form.duration"
                class="form-control number-control"
                type="number"
                min="10"
                max="600"
                step="1"
              >
              <span>segundos</span>
            </div>
            <input
              v-model="form.duration"
              class="accent-range"
              type="range"
              min="10"
              max="600"
              step="1"
              aria-label="Duración en segundos"
            >
            <div class="range-limits">
              <span>10 s</span><span>600 s</span>
            </div>
          </div>
          <BaseInput
            v-model="form.bpm"
            label="BPM"
            type="number"
            :min="30"
            :max="300"
            required
          />
          <BaseInput
            v-model="form.seed"
            label="Seed (opcional)"
            type="number"
            :min="0"
            :max="4294967295"
            hint="Entero entre 0 y 4294967295"
          />
        </div>

        <div class="built-caption-block">
          <div class="inline-heading">
            <div><h3>Caption construido</h3><p>Orden exacto utilizado por el adaptador del backend.</p></div>
            <span>{{ builtCaption.length }}/512</span>
          </div>
          <p class="built-caption">
            {{ builtCaption }}
          </p>
        </div>
      </BasePanel>

      <BasePanel class="structure-panel">
        <div class="panel-title-row structure-title-row">
          <div>
            <h2>Estructura y letra</h2>
            <p>Agrega secciones; Tale Star insertará los tags a partir de sus tipos y modificadores.</p>
          </div>
          <div class="structure-actions">
            <BaseButton @click="showTextModal = true">
              <span class="command-mark">⌘</span> Ver texto
            </BaseButton>
            <BaseButton
              variant="primary"
              @click="addSection()"
            >
              <UiIcon
                name="plus"
                :size="14"
              /> Sección
            </BaseButton>
          </div>
        </div>

        <div class="quick-section-row">
          <span>Agregar rápido:</span>
          <button
            v-for="sectionName in quickSections"
            :key="sectionName"
            class="quick-section-chip"
            type="button"
            :disabled="sections.length >= 50"
            @click="addSection(sectionName)"
          >
            {{ sectionName }}
          </button>
        </div>

        <div class="section-divider" />

        <div
          v-if="sections.length"
          class="music-sections"
        >
          <article
            v-for="(section, index) in sections"
            :key="index"
            class="music-section"
            :class="{ 'section-emphasis': section.Type.toLocaleLowerCase() === 'chorus' }"
            @keydown="sectionKeydown(index, $event)"
          >
            <div
              class="section-order-controls"
              aria-label="Orden de sección"
            >
              <button
                type="button"
                :disabled="index === 0"
                :aria-label="'Mover sección ' + (index + 1) + ' arriba'"
                @click="moveSection(index, -1)"
              >
                ↑
              </button>
              <button
                type="button"
                :disabled="index === sections.length - 1"
                :aria-label="'Mover sección ' + (index + 1) + ' abajo'"
                @click="moveSection(index, 1)"
              >
                ↓
              </button>
            </div>
            <div class="section-fields">
              <BaseInput
                v-model="section.Type"
                label="Tipo"
                placeholder="Verse, Chorus…"
                :maxlength="100"
              />
              <BaseInput
                v-model="section.Modifier"
                label="Modificador"
                placeholder="building energy"
                :maxlength="300"
              />
              <label class="form-field section-lyrics">
                <span class="form-label">Letra / texto de la sección</span>
                <textarea
                  v-model="section.Text"
                  class="form-control"
                  rows="4"
                  maxlength="2000"
                  placeholder="Escribe el texto de esta parte…"
                />
                <small class="field-hint">{{ section.Text.length }}/2000 caracteres · Alt + ↑/↓ también reordena</small>
              </label>
            </div>
            <button
              class="remove-section-button"
              type="button"
              :aria-label="'Eliminar sección ' + (index + 1)"
              @click="removeSection(index)"
            >
              <UiIcon
                name="close"
                :size="15"
              />
            </button>
          </article>
        </div>
        <div
          v-else
          class="sections-empty"
        >
          <span class="empty-sparkle">✦</span>
          <strong>Aún no hay secciones</strong>
          <span>Agrega letra, tags de sección o indicaciones de estructura para ACE-Step.</span>
        </div>

        <p
          v-if="form.output === 'instrumental'"
          class="instrumental-note"
        >
          El adaptador de ACE-Step usará <code>[Instrumental]</code> y omitirá el texto de estas secciones.
        </p>
      </BasePanel>
    </div>

    <BasePanel class="generation-panel">
      <div class="panel-title-row generation-title-row">
        <div>
          <h2>Generación</h2>
          <p>Resumen del render y reproducción del audio recibido desde el backend.</p>
        </div>
        <span
          class="status-pill"
          :class="job ? 'status-' + job.status.toLowerCase() : 'status-idle'"
          role="status"
        >
          {{ jobStatusLabel }}
        </span>
      </div>

      <div class="generation-content">
        <div
          class="music-cover"
          aria-label="Portada decorativa de Tale Star"
        >
          <div class="cover-glow" />
          <UiIcon
            name="music"
            :size="51"
          />
          <span class="cover-star">✦</span>
          <small>Portada decorativa</small>
        </div>

        <div class="generation-details">
          <div
            v-if="active"
            class="job-progress"
            role="status"
          >
            <span
              class="spinner"
              aria-hidden="true"
            />
            <div>
              <strong>
                {{ submitting ? 'Enviando solicitud' : loadingAsset ? 'Cargando audio real' : jobStatusLabel }}
              </strong>
              <small>
                {{ job?.attempts ? `Intento de worker: ${job.attempts}` : 'El backend no publica un porcentaje de progreso.' }}
              </small>
            </div>
          </div>
          <div
            v-else-if="!job"
            class="result-placeholder"
          >
            Tu resultado aparecerá aquí cuando el trabajo de música finalice.
          </div>
          <div
            v-else-if="job.status === 'Failed'"
            class="job-failed"
            role="alert"
          >
            <strong>No se pudo generar el audio</strong>
            <span>{{ job.error_message || error || 'El backend informó un error sin detalle.' }}</span>
          </div>
          <div
            v-else-if="job.status === 'Succeeded' && assetUrl"
            class="audio-player"
          >
            <audio
              ref="audioElement"
              class="audio-engine"
              :src="assetUrl"
              preload="metadata"
              @loadedmetadata="onLoadedMetadata"
              @timeupdate="onTimeUpdate"
              @play="playing = true"
              @pause="playing = false"
              @ended="onAudioEnded"
              @error="playerError = 'El navegador no pudo leer el archivo de audio recibido.'"
            />
            <div class="player-control-row">
              <button
                class="play-button"
                type="button"
                :aria-label="playing ? 'Pausar audio' : 'Reproducir audio'"
                @click="togglePlayback"
              >
                {{ playing ? 'Ⅱ' : '▶' }}
              </button>
              <span class="player-time">{{ formatTime(currentTime) }}</span>
              <input
                class="seek-range"
                type="range"
                min="0"
                :max="sliderMax"
                :value="safeCurrentTime"
                step="0.1"
                aria-label="Buscar posición en el audio"
                @input="seek"
              >
              <span class="player-time">{{ formatTime(audioDuration) }}</span>
            </div>
            <p class="audio-source-note">
              Reproducción del asset autenticado <code>{{ assetId }}</code>
            </p>
            <p
              v-if="playerError"
              class="field-error"
              role="alert"
            >
              {{ playerError }}
            </p>
            <div class="result-actions">
              <BaseButton
                :disabled="!assetUrl"
                @click="downloadAudio"
              >
                <UiIcon
                  name="download"
                  :size="15"
                /> Descargar
              </BaseButton>
              <BaseButton
                variant="primary"
                :disabled="!assetUrl || saving"
                @click="saveToLibrary"
              >
                <UiIcon
                  name="heart"
                  :size="15"
                /> {{ saving ? 'Guardando…' : 'Guardar en biblioteca' }}
              </BaseButton>
            </div>
          </div>
          <div
            v-else-if="job.status === 'Succeeded'"
            class="result-placeholder"
          >
            El trabajo terminó, pero todavía no hay un asset reproducible.
          </div>

          <div
            v-if="error && job?.status !== 'Failed'"
            class="field-error generation-error"
            role="alert"
          >
            {{ error }}
          </div>
          <BaseButton
            v-if="error && (job?.status === 'Pending' || job?.status === 'Processing')"
            class="resume-polling-button"
            @click="resumePolling"
          >
            <UiIcon
              name="refresh"
              :size="13"
            /> Reanudar consulta de este job
          </BaseButton>
          <div
            v-if="saveError"
            class="field-error generation-error"
            role="alert"
          >
            {{ saveError }}
          </div>

          <dl
            v-if="job"
            class="job-meta"
          >
            <div><dt>Duración</dt><dd>{{ resultDuration !== null ? `${resultDuration} s` : 'Sin metadata' }}</dd></div>
            <div><dt>BPM</dt><dd>{{ resultBpm ?? 'Sin metadata' }}</dd></div>
            <div><dt>Idioma</dt><dd>{{ resultLanguage || 'Sin metadata' }}</dd></div>
            <div><dt>Formato</dt><dd>{{ resultExtension || resultMediaType || 'Sin metadata' }}</dd></div>
            <div><dt>Salida</dt><dd>{{ resultOutput === 'instrumental' ? 'Instrumental' : resultOutput === 'song' ? 'Canción' : 'Sin metadata' }}</dd></div>
            <div><dt>Seed</dt><dd>{{ resultSeed ?? 'Sin metadata' }}</dd></div>
          </dl>
        </div>
      </div>

      <div class="generation-footer">
        <div class="job-reference">
          <span>Job del backend</span>
          <code v-if="job">{{ job.id }}</code>
          <span v-else>Se asignará al generar</span>
        </div>
        <BaseButton
          variant="primary"
          size="large"
          :disabled="active"
          @click="generate"
        >
          <UiIcon
            :name="job?.status === 'Succeeded' ? 'refresh' : 'sparkle'"
            :size="16"
          />
          {{ active ? 'Generación en curso…' : job?.status === 'Succeeded' ? 'Regenerar música' : job?.status === 'Failed' ? 'Intentar de nuevo' : 'Generar música' }}
        </BaseButton>
      </div>
    </BasePanel>

    <BaseModal
      v-model="showTextModal"
      title="Texto musical completo"
    >
      <div class="full-text-content">
        <section>
          <h3>Caption de ACE-Step</h3>
          <p>{{ builtCaption }}</p>
          <small>Se limita a 512 caracteres en el adaptador.</small>
        </section>
        <section>
          <h3>Lyrics / estructura enviada</h3>
          <pre>{{ builtLyrics || 'No hay texto de secciones.' }}</pre>
          <small v-if="form.output === 'instrumental'">La salida instrumental ignora el texto de las secciones.</small>
        </section>
      </div>
    </BaseModal>
  </div>
</template>

<style scoped>
.music-page-heading { margin-bottom: 14px; }
.music-page-heading p { max-width: 700px; }
.music-upper-grid {
  display: grid;
  grid-template-columns: minmax(310px, 0.72fr) minmax(0, 1.08fr);
  align-items: stretch;
  gap: 16px;
}
.direction-panel,
.structure-panel,
.generation-panel { min-width: 0; }
.panel-title-row,
.inline-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}
.panel-title-row h2,
.inline-heading h3 { margin: 0; font-size: 14px; font-weight: 750; }
.panel-title-row p,
.inline-heading p { margin-top: 4px; color: var(--text-3); font-size: 10px; line-height: 1.45; }
.contract-note { color: var(--accent); font-size: 9px; font-weight: 700; white-space: nowrap; }
.tag-editor-list { display: grid; gap: 10px; margin-top: 17px; }
.tag-editor { display: grid; gap: 5px; }
.tag-editor > label,
.form-label,
.music-field-grid .form-field > label,
.form-field > label { color: var(--text-2); font-size: 9px; font-weight: 700; }
.tag-entry-row { display: flex; align-items: center; gap: 7px; }
.tag-entry-row .form-control { min-width: 0; }
.chip-list { display: flex; flex-wrap: wrap; gap: 5px; }
.music-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 23px;
  padding: 3px 6px 3px 9px;
  border: 1px solid var(--accent-border);
  border-radius: 999px;
  background: rgba(235, 227, 255, 0.82);
  color: var(--accent);
  font-size: 9px;
  font-weight: 650;
}
.music-chip button { display: grid; width: 15px; height: 15px; padding: 0; place-items: center; border: 0; border-radius: 50%; background: transparent; color: inherit; cursor: pointer; }
.music-chip button:hover { background: rgba(116, 84, 253, 0.13); }
.field-hint { color: var(--text-3); font-size: 8px; }
.music-field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }
.field-wide { grid-column: 1 / -1; }
.segmented-control { display: grid; grid-template-columns: 1fr 1fr; padding: 3px; border: 1px solid var(--border); border-radius: 12px; background: rgba(240, 241, 244, 0.65); }
.segmented-control button { min-height: 34px; border: 0; border-radius: 9px; background: transparent; color: var(--text-2); font-size: 10px; font-weight: 700; cursor: pointer; }
.segmented-control button.active { background: rgba(230, 219, 254, 0.9); color: var(--accent); box-shadow: var(--shadow-sm); }
.caption-input { resize: vertical; min-height: 72px; }
.range-value-row { display: flex; align-items: center; gap: 8px; }
.range-value-row span { color: var(--text-3); font-size: 9px; white-space: nowrap; }
.number-control { width: 100%; }
.accent-range,
.seek-range { width: 100%; accent-color: var(--accent); cursor: pointer; }
.accent-range { margin-top: 5px; }
.range-limits { display: flex; justify-content: space-between; color: var(--text-3); font-size: 8px; }
.built-caption-block { margin-top: 15px; padding-top: 12px; border-top: 1px solid var(--border); }
.inline-heading { align-items: center; }
.inline-heading h3 { font-size: 10px; }
.inline-heading p { font-size: 8px; }
.inline-heading > span { color: var(--accent); font-size: 8px; white-space: nowrap; }
.built-caption { min-height: 45px; margin: 8px 0 0; padding: 10px; border: 1px solid var(--border); border-radius: 10px; background: rgba(240, 241, 244, 0.58); color: var(--text-2); font-size: 10px; line-height: 1.55; overflow-wrap: anywhere; }
.structure-title-row { align-items: center; }
.structure-actions { display: flex; flex: 0 0 auto; gap: 7px; }
.command-mark { font-size: 15px; font-weight: 700; }
.quick-section-row { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; margin-top: 18px; }
.quick-section-row > span { margin-right: 3px; color: var(--text-3); font-size: 8px; }
.quick-section-chip { padding: 5px 8px; border: 1px solid var(--border); border-radius: 7px; background: rgba(244, 244, 247, 0.72); color: var(--text-2); font-size: 8px; font-weight: 650; cursor: pointer; }
.quick-section-chip:hover:not(:disabled) { border-color: var(--accent-border); background: rgba(230, 219, 254, 0.75); color: var(--accent); }
.quick-section-chip:disabled { opacity: 0.45; cursor: not-allowed; }
.section-divider { height: 1px; margin: 14px 0 11px; background: var(--border); }
.music-sections { display: grid; gap: 9px; }
.music-section { position: relative; display: grid; grid-template-columns: 17px minmax(0, 1fr); gap: 9px; padding: 12px 35px 12px 10px; border: 1px solid var(--border); border-radius: 13px; background: rgba(240, 241, 244, 0.62); }
.music-section.section-emphasis { border-color: var(--accent-border); background: rgba(226, 215, 255, 0.75); }
.section-order-controls { display: flex; flex-direction: column; align-items: center; gap: 2px; padding-top: 4px; }
.section-order-controls button { width: 17px; height: 17px; padding: 0; border: 0; border-radius: 5px; background: transparent; color: var(--text-3); font-size: 12px; line-height: 1; cursor: pointer; }
.section-order-controls button:hover:not(:disabled) { background: rgba(116, 84, 253, 0.12); color: var(--accent); }
.section-order-controls button:disabled { opacity: 0.3; cursor: not-allowed; }
.section-fields { display: grid; grid-template-columns: minmax(110px, 0.85fr) minmax(130px, 1.15fr); gap: 9px; }
.section-lyrics { grid-column: 1 / -1; }
.section-lyrics textarea { min-height: 72px; resize: vertical; }
.remove-section-button { position: absolute; top: 10px; right: 8px; display: grid; width: 24px; height: 24px; place-items: center; border: 0; border-radius: 7px; background: transparent; color: var(--text-3); cursor: pointer; }
.remove-section-button:hover { background: rgba(227, 87, 112, 0.12); color: #b92e45; }
.sections-empty { display: grid; min-height: 215px; align-content: center; justify-items: center; gap: 8px; padding: 24px; border: 1px dashed var(--border-strong); border-radius: 14px; color: var(--text-3); text-align: center; }
.empty-sparkle { color: var(--accent); font-size: 23px; }
.sections-empty strong { color: var(--text-2); font-size: 11px; }
.sections-empty span:last-child { max-width: 300px; font-size: 9px; line-height: 1.45; }
.instrumental-note { margin: 12px 0 0; padding: 9px 10px; border-radius: 9px; background: rgba(230, 219, 254, 0.48); color: var(--text-3); font-size: 9px; line-height: 1.5; }
.instrumental-note code { color: var(--accent); }
.generation-panel { margin-top: 16px; }
.generation-title-row { align-items: center; }
.status-pill { padding: 5px 9px; border: 1px solid transparent; border-radius: 999px; background: rgba(116, 84, 253, 0.1); color: var(--accent); font-size: 9px; font-weight: 750; white-space: nowrap; }
.status-pending,
.status-processing { background: rgba(116, 84, 253, 0.1); color: var(--accent); }
.status-succeeded { background: rgba(34, 160, 107, 0.12); color: #1a8153; }
.status-failed { background: rgba(224, 82, 101, 0.12); color: #b92e45; }
.status-idle { background: rgba(115, 117, 130, 0.1); color: var(--text-3); }
.generation-content { display: grid; grid-template-columns: minmax(180px, 0.28fr) minmax(0, 1fr); gap: 17px; margin-top: 15px; }
.music-cover { position: relative; display: grid; min-height: 174px; overflow: hidden; place-items: center; border-radius: 15px; background: radial-gradient(circle at 40% 39%, rgba(136, 100, 255, 0.65), transparent 38%), linear-gradient(145deg, #20193e, #110f26); color: white; }
.music-cover > .ui-icon { z-index: 1; filter: drop-shadow(0 4px 12px rgba(170, 148, 255, 0.5)); }
.cover-glow { position: absolute; inset: 10% 17%; border-radius: 50%; background: radial-gradient(circle, rgba(116, 84, 253, 0.48), transparent 65%); filter: blur(11px); }
.cover-star { position: absolute; top: 21%; right: 23%; color: #d8c9ff; font-size: 16px; }
.music-cover small { position: absolute; right: 9px; bottom: 8px; color: rgba(255,255,255,.6); font-size: 7px; }
.generation-details { min-width: 0; }
.result-placeholder { display: flex; min-height: 74px; align-items: center; padding: 13px; border: 1px dashed var(--border-strong); border-radius: 12px; color: var(--text-3); font-size: 10px; line-height: 1.5; }
.job-progress { display: flex; min-height: 74px; align-items: center; gap: 11px; padding: 13px; border-radius: 12px; background: rgba(230, 219, 254, 0.48); }
.job-progress strong,.job-progress small { display: block; }
.job-progress strong { font-size: 11px; }
.job-progress small { margin-top: 4px; color: var(--text-3); font-size: 9px; }
.spinner { width: 23px; height: 23px; flex: 0 0 auto; border: 3px solid rgba(116,84,253,.2); border-top-color: var(--accent); border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.job-failed { display: grid; gap: 6px; padding: 13px; border-radius: 12px; background: rgba(224,82,101,.09); color: #a02d40; font-size: 10px; line-height: 1.5; }
.audio-player { display: grid; gap: 9px; padding: 12px; border: 1px solid var(--accent-border); border-radius: 12px; background: rgba(255,255,255,.48); }
.audio-engine { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; clip-path: inset(50%); }
.player-control-row { display: grid; grid-template-columns: 38px auto minmax(60px, 1fr) auto; align-items: center; gap: 9px; }
.play-button { display: grid; width: 38px; height: 38px; place-items: center; border: 0; border-radius: 12px; background: linear-gradient(135deg, #6847ff, #9369ff); box-shadow: 0 7px 16px rgba(110,72,255,.25); color: #fff; font-size: 14px; cursor: pointer; }
.play-button:hover { filter: brightness(1.06); transform: translateY(-1px); }
.player-time { color: var(--text-2); font-size: 9px; font-variant-numeric: tabular-nums; }
.audio-source-note { margin: 0; overflow: hidden; color: var(--text-3); font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
.audio-source-note code { color: var(--text-2); }
.result-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.job-meta { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; margin: 12px 0 0; }
.job-meta div { min-width: 0; padding: 8px 9px; border-radius: 9px; background: rgba(240, 241, 244, .66); }
.job-meta dt { color: var(--text-3); font-size: 7px; text-transform: uppercase; letter-spacing: .035em; }
.job-meta dd { margin: 4px 0 0; overflow: hidden; color: var(--text-2); font-size: 9px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.field-error { color: #a02d40; font-size: 9px; line-height: 1.45; }
.generation-error { margin-top: 9px; padding: 9px 10px; border-radius: 9px; background: rgba(224,82,101,.09); }
.resume-polling-button { margin-top: 8px; }
.generation-footer { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-top: 14px; padding-top: 13px; border-top: 1px solid var(--border); }
.job-reference { display: grid; min-width: 0; gap: 4px; color: var(--text-3); font-size: 8px; }
.job-reference code { overflow: hidden; color: var(--text-2); font-size: 8px; text-overflow: ellipsis; white-space: nowrap; }
.full-text-content { display: grid; gap: 17px; }
.full-text-content section { display: grid; gap: 7px; }
.full-text-content h3 { margin: 0; font-size: 11px; }
.full-text-content p,.full-text-content pre { margin: 0; padding: 12px; border: 1px solid var(--border); border-radius: 10px; background: rgba(240,241,244,.65); color: var(--text-2); font-size: 10px; line-height: 1.6; overflow-wrap: anywhere; white-space: pre-wrap; }
.full-text-content small { color: var(--text-3); font-size: 8px; }

@media (max-width: 1050px) {
  .music-upper-grid { grid-template-columns: minmax(0, 1fr); }
  .structure-panel { min-height: 360px; }
}
@media (max-width: 680px) {
  .music-field-grid { grid-template-columns: 1fr; }
  .field-wide { grid-column: auto; }
  .structure-title-row { align-items: flex-start; flex-direction: column; }
  .structure-actions { align-self: stretch; }
  .structure-actions :deep(.button) { flex: 1; }
  .section-fields { grid-template-columns: 1fr; }
  .section-lyrics { grid-column: auto; }
  .generation-content { grid-template-columns: 1fr; }
  .music-cover { min-height: 145px; }
  .job-meta { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .generation-footer { align-items: stretch; flex-direction: column; }
  .generation-footer :deep(.button) { width: 100%; }
}
@media (max-width: 420px) {
  .player-control-row { grid-template-columns: 36px auto minmax(40px, 1fr) auto; gap: 5px; }
  .music-section { padding-right: 31px; }
  .contract-note { max-width: 80px; text-align: right; white-space: normal; }
  .tag-entry-row :deep(.button) { min-width: 40px; }
}
</style>
