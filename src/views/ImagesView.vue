<script setup lang="ts">
import { onMounted } from 'vue'
import { useImageCreator } from '@/composables/useImageCreator'
import BaseButton from '@/components/BaseButton.vue'
import CharacterMentionTextarea from '@/components/CharacterMentionTextarea.vue'
import BaseInput from '@/components/BaseInput.vue'
import BasePanel from '@/components/BasePanel.vue'
import BaseSelect from '@/components/BaseSelect.vue'
import UiIcon from '@/components/UiIcon.vue'

const creator = useImageCreator()
const {
  characters, styles, selectedCharacters, objects, objectEntry, loadingResources,
  resourceError, mode, form, generation, savingToLibrary, saveError,
  scenarioOptions, styleOptions, builtPrompt,
  hasGeneratedImage, jobStatusLabel, loadResources, toggleCharacter, addObject,
  removeObject, handleObjectKey, generate, saveToLibrary, downloadImage, copyPrompt,
} = creator
const { job, assetUrl, error: generationError, submitting, polling } = generation

onMounted(loadResources)
</script>

<template>
  <div class="page image-page">
    <div class="image-workspace">
      <BasePanel class="builder-panel">
        <div
          class="prompt-mode-switch"
          aria-label="Tipo de prompt"
        >
          <button
            type="button"
            :class="{ active: mode === 'guided' }"
            :aria-pressed="mode === 'guided'"
            @click="mode = 'guided'"
          >
            Prompt guiado
          </button>
          <button
            type="button"
            :class="{ active: mode === 'free' }"
            :aria-pressed="mode === 'free'"
            @click="mode = 'free'"
          >
            Prompt libre
          </button>
        </div>

        <div
          v-if="mode === 'guided'"
          class="guided-form"
        >
          <section class="builder-section">
            <div class="section-heading">
              <div>
                <h2>Personajes</h2>
                <p>Usa personajes guardados o elige hasta 50 para esta escena.</p>
              </div>
              <RouterLink
                class="text-link"
                to="/library"
              >
                Administrar
              </RouterLink>
            </div>
            <div
              v-if="loadingResources"
              class="inline-loader"
            >
              Cargando personajes…
            </div>
            <div
              v-else-if="characters.length"
              class="choice-grid"
            >
              <button
                v-for="(character, index) in characters"
                :key="character.id"
                class="character-choice"
                :class="{ selected: selectedCharacters.includes(character.id) }"
                type="button"
                :aria-pressed="selectedCharacters.includes(character.id)"
                @click="toggleCharacter(character.id)"
              >
                <span
                  class="choice-avatar"
                  :class="'tone-' + (index % 4)"
                >
                  <UiIcon
                    name="characters"
                    :size="16"
                  />
                </span>
                <span class="choice-copy">
                  <strong>{{ character.name }}</strong>
                  <small>{{ character.description || character.visual_description || 'Personaje guardado' }}</small>
                </span>
                <UiIcon
                  v-if="selectedCharacters.includes(character.id)"
                  name="check"
                  :size="15"
                />
              </button>
            </div>
            <div
              v-else
              class="resource-empty"
            >
              <span>{{ resourceError || 'Aún no tienes personajes guardados.' }}</span>
              <RouterLink to="/library">
                Abrir biblioteca
              </RouterLink>
              <BaseButton
                v-if="resourceError"
                size="normal"
                @click="loadResources"
              >
                Reintentar
              </BaseButton>
            </div>
          </section>

          <div class="form-grid two image-fields">
            <label class="form-field">
              <span class="form-label">Acción principal</span>
              <CharacterMentionTextarea
                v-model="form.action"
                :characters="characters"
                label="Acción principal"
                placeholder="Describe qué sucede en la escena"
                :maxlength="200"
                :rows="2"
              />
            </label>
            <BaseInput
              v-model="form.emotion"
              label="Emoción"
              placeholder="Ej.: alegres y curiosos"
              :maxlength="200"
            />
          </div>

          <section class="builder-section compact-section">
            <label class="form-field">
              <span class="form-label">Objetos visibles</span>
              <div class="object-input">
                <span
                  v-for="(object, index) in objects"
                  :key="object + index"
                  class="object-chip"
                >
                  {{ object }}
                  <button
                    type="button"
                    :aria-label="'Quitar ' + object"
                    @click="removeObject(index)"
                  >×</button>
                </span>
                <input
                  v-model="objectEntry"
                  class="object-entry"
                  type="text"
                  placeholder="Agregar objeto…"
                  @keydown="handleObjectKey"
                  @blur="addObject()"
                >
              </div>
              <small class="form-hint">Presiona Enter o coma para agregar cada objeto.</small>
            </label>
          </section>

          <div class="form-grid two image-fields">
            <BaseSelect
              v-model="form.scenarioId"
              label="Escenario"
              :options="scenarioOptions"
              placeholder="Sin escenario guardado"
            />
            <BaseInput
              v-model="form.moment"
              label="Momento"
              placeholder="Ej.: atardecer"
              :maxlength="500"
            />
          </div>

          <section class="builder-section style-section">
            <div class="section-heading">
              <div>
                <h2>Estilo visual</h2>
                <p>Los perfiles disponibles vienen de tu cuenta en Tale Star.</p>
              </div>
            </div>
            <div
              v-if="styles.length"
              class="style-grid"
            >
              <button
                v-for="(profile, index) in styles"
                :key="profile.id"
                class="style-choice"
                :class="[{ selected: form.styleId === profile.id }, 'style-tone-' + (index % 3)]"
                type="button"
                :aria-pressed="form.styleId === profile.id"
                @click="form.styleId = form.styleId === profile.id ? '' : profile.id"
              >
                <span class="style-swatch" />
                <span class="style-copy">
                  <strong>{{ profile.name }}</strong>
                  <small>{{ profile.description || profile.prompt_modifier || 'Perfil visual guardado' }}</small>
                </span>
                <UiIcon
                  v-if="form.styleId === profile.id"
                  name="check"
                  :size="14"
                />
              </button>
            </div>
            <p
              v-else-if="!loadingResources"
              class="form-hint"
            >
              No hay perfiles visuales guardados. Puedes administrar recursos en la biblioteca.
            </p>
            <BaseSelect
              v-if="styles.length"
              v-model="form.styleId"
              class="style-select-fallback"
              label="Perfil de estilo"
              :options="styleOptions"
              placeholder="Sin perfil de estilo"
            />
          </section>

          <label class="form-field optional-prompt">
            <span class="form-label">Prompt libre opcional</span>
            <CharacterMentionTextarea
              v-model="form.freePrompt"
              :characters="characters"
              label="Prompt libre opcional"
              :rows="2"
              :maxlength="4000"
              placeholder="Añade un detalle creativo adicional…"
            />
          </label>
        </div>

        <div
          v-else
          class="free-form"
        >
          <div class="free-form-intro">
            <span class="eyebrow">Prompt libre</span>
            <h2>Describe tu escena</h2>
            <p>Escribe @ para insertar un personaje guardado. Al generar, el backend agrega su descripción y traduce el prompt al inglés.</p>
          </div>
          <label class="form-field">
            <span class="form-label">Prompt</span>
            <CharacterMentionTextarea
              v-model="form.freePrompt"
              :characters="characters"
              label="Prompt"
              textarea-class="free-prompt-area"
              :rows="9"
              :maxlength="4000"
              placeholder="Escribe la escena que quieres crear…"
            />
            <small class="form-hint">{{ form.freePrompt.length }} / 4000 · Escribe @ para mencionar un personaje.</small>
          </label>
          <BaseInput
            v-model="form.seed"
            label="Seed (opcional)"
            type="number"
            :min="0"
            :max="4294967295"
          />
        </div>

        <label class="form-field extra-field">
          <span class="form-label">Indicaciones adicionales <small>Opcional</small></span>
          <CharacterMentionTextarea
            v-model="form.extra"
            :characters="characters"
            label="Indicaciones adicionales"
            :rows="3"
            :maxlength="2000"
            placeholder="Detalles adicionales para el generador…"
          />
        </label>

        <div
          v-if="mode === 'guided'"
          class="form-grid two seed-row"
        >
          <BaseInput
            v-model="form.seed"
            label="Seed (opcional)"
            type="number"
            :min="0"
            :max="4294967295"
          />
          <p class="form-hint seed-note">
            Usa la misma seed si quieres repetir una composición con cambios pequeños.
          </p>
        </div>

        <footer class="builder-footer">
          <span class="form-hint">La generación usa el servicio real del backend.</span>
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
            {{ submitting ? 'Enviando…' : polling ? 'Generar otra imagen' : hasGeneratedImage ? 'Regenerar imagen' : 'Generar imagen' }}
          </BaseButton>
        </footer>
      </BasePanel>

      <BasePanel class="image-preview">
        <div class="preview-heading">
          <div>
            <strong>Vista previa</strong>
            <small>{{ jobStatusLabel }}</small>
          </div>
          <span
            v-if="job"
            class="job-pill"
            :class="'job-' + job.status.toLowerCase()"
          >{{ job.status }}</span>
          <span
            v-else
            class="preview-menu"
            aria-label="Más opciones"
          >•••</span>
        </div>
        <div
          class="image-stage"
          :class="{ 'has-image': assetUrl }"
        >
          <img
            v-if="assetUrl"
            :src="assetUrl"
            alt="Imagen generada por Tale Star"
          >
          <div
            v-else
            class="preview-empty"
          >
            <span class="preview-sky">
              <span class="preview-sun" />
              <span class="preview-star star-one">✦</span>
              <span class="preview-star star-two">✧</span>
              <span class="preview-hills" />
            </span>
            <span class="preview-state">
              <span v-if="job?.status === 'Pending'">En espera de un worker de generación…</span>
              <span v-else-if="job?.status === 'Processing'">Tu imagen se está creando…</span>
              <span v-else-if="job?.status === 'Failed'">El trabajo falló. Puedes volver a intentarlo.</span>
              <span v-else>Tu próxima escena empieza aquí.</span>
            </span>
          </div>
        </div>
        <div
          v-if="polling"
          class="generation-progress"
          role="status"
        >
          <span class="progress-spinner" />
          <span>Consultando el estado del trabajo…</span>
        </div>
        <div class="preview-actions">
          <BaseButton
            :disabled="!hasGeneratedImage"
            @click="generate"
          >
            <UiIcon
              name="refresh"
              :size="15"
            /> Regenerar
          </BaseButton>
          <BaseButton
            :disabled="!hasGeneratedImage"
            @click="downloadImage"
          >
            <UiIcon
              name="download"
              :size="15"
            /> Descargar
          </BaseButton>
          <BaseButton
            variant="primary"
            :disabled="!hasGeneratedImage || savingToLibrary"
            @click="saveToLibrary"
          >
            {{ savingToLibrary ? 'Guardando…' : 'Guardar' }}
          </BaseButton>
        </div>
        <div
          v-if="generationError || saveError"
          class="auth-error"
          role="alert"
        >
          {{ generationError || saveError }}
        </div>
        <div class="built-prompt">
          <div class="prompt-title">
            <strong>Prompt construido</strong>
            <button
              type="button"
              class="text-link"
              :disabled="!builtPrompt"
              @click="copyPrompt"
            >
              Copiar
            </button>
          </div>
          <p>{{ builtPrompt || 'Completa los campos para describir la imagen.' }}</p>
        </div>
        <div
          v-if="job"
          class="job-metadata"
        >
          <span>ID del trabajo</span>
          <code>{{ job.id }}</code>
        </div>
      </BasePanel>
    </div>
  </div>
</template>

<style scoped>
.image-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.48fr) minmax(330px, 1fr);
  align-items: stretch;
  gap: 16px;
}

.image-workspace > :deep(.glass-panel) { min-height: calc(100vh - 68px); }
.builder-panel { display: flex; flex-direction: column; }
.prompt-mode-switch { display: flex; width: fit-content; gap: 3px; margin-bottom: 20px; padding: 4px; border-radius: 12px; background: rgba(240, 241, 244, 0.82); }
.prompt-mode-switch button { min-width: 124px; min-height: 34px; padding: 0 12px; border: 1px solid transparent; border-radius: 9px; background: transparent; color: var(--text-2); font-size: 10px; font-weight: 750; }
.prompt-mode-switch button.active { border-color: rgba(116, 84, 253, 0.19); background: rgba(230, 219, 254, 0.72); color: var(--accent); box-shadow: var(--shadow-sm); }
.builder-section { margin-bottom: 17px; }
.section-heading { margin-bottom: 10px; }
.text-link { padding: 3px 5px; border: 0; background: transparent; color: var(--accent); font-size: 10px; font-weight: 750; }
.text-link:hover:not(:disabled) { text-decoration: underline; }
.text-link:disabled { cursor: not-allowed; opacity: .45; }
.choice-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.character-choice { display: flex; min-width: 0; min-height: 54px; align-items: center; gap: 8px; padding: 7px 9px; border: 1px solid transparent; border-radius: 12px; background: rgba(240, 241, 244, .84); text-align: left; transition: border-color .16s ease, background .16s ease, transform .16s ease; }
.character-choice:hover { transform: translateY(-1px); border-color: var(--accent-border); }
.character-choice.selected { border-color: var(--accent-border); background: rgba(230, 219, 254, .66); }
.choice-avatar { display: grid; width: 34px; height: 34px; flex: 0 0 auto; place-items: center; border-radius: 10px; background: linear-gradient(140deg, #b194fe, #7454fd); color: #fff; }
.tone-1 { background: linear-gradient(140deg, #ffc27c, #d7882c); }
.tone-2 { background: linear-gradient(140deg, #84d5cf, #3b9c99); }
.tone-3 { background: linear-gradient(140deg, #f3a4bd, #c45b7f); }
.choice-copy { min-width: 0; flex: 1; }
.choice-copy strong, .choice-copy small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.choice-copy strong { color: var(--text); font-size: 10px; }
.choice-copy small { margin-top: 3px; color: var(--text-3); font-size: 9px; }
.resource-empty { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 12px; border: 1px dashed var(--accent-border); border-radius: 12px; color: var(--text-2); font-size: 10px; }
.resource-empty a { color: var(--accent); font-weight: 750; }
.inline-loader { margin: 10px 0 18px; color: var(--text-3); font-size: 10px; }
.image-fields { gap: 13px 11px; }
.compact-section { margin: 14px 0; }
.object-input { display: flex; min-height: 42px; flex-wrap: wrap; align-items: center; gap: 5px; padding: 5px 7px; border: 1px solid var(--border); border-radius: 11px; background: #f0f1f4; }
.object-chip { display: inline-flex; min-height: 26px; align-items: center; gap: 6px; padding: 0 8px; border-radius: 8px; background: #fff; color: var(--text-2); font-size: 10px; }
.object-chip button { border: 0; background: transparent; color: var(--text-3); font-size: 13px; }
.object-entry { min-width: 120px; min-height: 28px; flex: 1; border: 0; outline: 0; background: transparent; color: var(--text); font-size: 12px; }
.object-entry::placeholder { color: var(--text-3); }
.style-section { margin-top: 18px; }
.style-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; }
.style-choice { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 5px 8px; min-width: 0; padding: 7px; border: 1px solid transparent; border-radius: 13px; background: rgba(255, 255, 255, .88); text-align: left; }
.style-choice.selected { border-color: var(--accent-border); background: rgba(230, 219, 254, .66); }
.style-swatch { grid-column: 1 / -1; height: 54px; border-radius: 9px; background: linear-gradient(110deg, #f8d4ca, #c7bdff 58%, #99baff); }
.style-tone-1 .style-swatch { background: radial-gradient(circle at 36% 30%, #fff4d3 0 12%, transparent 13%), linear-gradient(110deg, #62c7c1, #8c8bff); }
.style-tone-2 .style-swatch { background: linear-gradient(120deg, #ffc4da, #c5b2ff 52%, #ffd58b); }
.style-copy { display: block; min-width: 0; padding: 0 4px 3px; }
.style-copy strong, .style-copy small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.style-copy strong { font-size: 10px; }
.style-copy small { margin-top: 3px; color: var(--text-3); font-size: 9px; }
.style-choice :deep(.ui-icon) { align-self: center; margin-right: 5px; color: var(--accent); }
.style-select-fallback { display: none; }
.optional-prompt { margin-bottom: 13px; }
.form-label small { float: right; color: var(--text-3); font-weight: 500; }
.free-form { display: grid; gap: 16px; min-height: 470px; align-content: start; }
.free-form-intro h2 { margin: 3px 0 5px; font-family: var(--font-display); font-size: 19px; }
.free-form-intro p { margin: 0; color: var(--text-3); font-size: 11px; line-height: 1.55; }
.free-form-intro code { color: var(--accent); }
.free-prompt-area { min-height: 250px !important; }
.extra-field { margin-top: 8px; }
.seed-row { align-items: center; margin-top: 14px; }
.seed-note { align-self: end; padding-bottom: 8px; }
.builder-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: auto; padding-top: 16px; border-top: 1px solid var(--border); }
.image-preview { display: flex; flex-direction: column; }
.preview-heading { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 13px; }
.preview-heading strong, .preview-heading small { display: block; }
.preview-heading strong { font-size: 14px; }
.preview-heading small { margin-top: 4px; color: var(--text-3); font-size: 10px; }
.preview-menu { color: var(--text-2); letter-spacing: 2px; }
.job-pill { padding: 5px 9px; border-radius: 999px; background: var(--accent-soft); color: var(--accent); font-size: 9px; font-weight: 750; }
.job-failed { background: rgba(224, 82, 101, .1); color: #b92e45; }
.job-succeeded { background: rgba(34, 160, 107, .12); color: #256b50; }
.image-stage { display: grid; min-height: 440px; flex: 0 0 auto; place-items: center; overflow: hidden; border-radius: 16px; background: #d2c1ff; }
.image-stage.has-image { background: rgba(255, 255, 255, .3); }
.image-stage img { display: block; width: 100%; height: 100%; max-height: 580px; object-fit: contain; }
.preview-empty { position: relative; display: flex; width: 100%; min-height: 440px; flex-direction: column; align-items: center; justify-content: space-between; overflow: hidden; padding: 28px 20px 20px; background: linear-gradient(180deg, #a9b6f4 0%, #d3b5da 56%, #e3a99f 100%); }
.preview-sky { position: relative; display: block; width: 100%; height: 100%; min-height: 330px; }
.preview-sun { position: absolute; top: 13%; right: 18%; width: 52px; aspect-ratio: 1; border-radius: 50%; background: #fff0bd; box-shadow: 0 0 36px 12px rgba(255, 240, 189, .6); }
.preview-star { position: absolute; color: #fff4c4; text-shadow: 0 0 12px rgba(255, 255, 255, .7); }
.star-one { top: 26%; left: 23%; font-size: 18px; }
.star-two { top: 45%; right: 24%; font-size: 23px; }
.preview-hills { position: absolute; right: -25%; bottom: -3px; left: -25%; height: 36%; border-radius: 50% 50% 0 0; background: #587362; box-shadow: inset 140px 20px 0 -65px #698371; }
.preview-state { position: relative; z-index: 1; display: grid; max-width: 290px; min-height: 42px; place-items: center; padding: 10px 14px; border: 1px solid rgba(255,255,255,.42); border-radius: 12px; background: rgba(255,255,255,.78); color: var(--text-2); font-size: 10px; line-height: 1.5; text-align: center; backdrop-filter: blur(10px); }
.generation-progress { display: flex; align-items: center; gap: 8px; margin-top: 10px; color: var(--text-2); font-size: 10px; }
.progress-spinner { width: 14px; height: 14px; border: 2px solid rgba(116,84,253,.2); border-top-color: var(--accent); border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.preview-actions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; margin-top: 10px; }
.preview-actions :deep(.button) { min-width: 0; padding-inline: 8px; }
.auth-error { margin-top: 12px; }
.built-prompt { margin-top: 14px; padding-top: 13px; border-top: 1px solid var(--border); }
.prompt-title { display: flex; align-items: center; justify-content: space-between; }
.built-prompt strong { font-size: 10px; }
.built-prompt p { margin: 7px 0 0; color: var(--text-3); font-size: 10px; line-height: 1.6; overflow-wrap: anywhere; }
.job-metadata { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 12px; color: var(--text-3); font-size: 9px; }
.job-metadata code { color: var(--text-2); overflow-wrap: anywhere; }

@media (max-width: 1100px) {
  .image-workspace { grid-template-columns: minmax(0, 1.15fr) minmax(290px, .85fr); }
  .choice-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 900px) {
  .image-workspace { grid-template-columns: 1fr; }
  .image-workspace > :deep(.glass-panel) { min-height: 0; }
  .image-preview { order: -1; }
  .image-stage, .preview-empty { min-height: 380px; }
}
@media (max-width: 560px) {
  .choice-grid, .style-grid { grid-template-columns: 1fr; }
  .image-fields { grid-template-columns: 1fr; }
  .image-stage, .preview-empty { min-height: 300px; }
  .preview-sky { min-height: 220px; }
  .preview-actions { grid-template-columns: 1fr 1fr; }
  .preview-actions :deep(.button-primary) { grid-column: 1 / -1; }
  .builder-footer { align-items: stretch; flex-direction: column; }
  .builder-footer :deep(.button) { width: 100%; }
  .seed-row { grid-template-columns: 1fr; }
}
</style>
