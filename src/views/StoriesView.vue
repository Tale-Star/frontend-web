<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useStoriesEditor } from '@/composables/useStoriesEditor'
import BaseButton from '@/components/BaseButton.vue'
import CharacterMentionTextarea from '@/components/CharacterMentionTextarea.vue'
import BaseInput from '@/components/BaseInput.vue'
import BaseModal from '@/components/BaseModal.vue'
import BasePanel from '@/components/BasePanel.vue'
import BaseSelect from '@/components/BaseSelect.vue'
import UiIcon from '@/components/UiIcon.vue'

const editor = useStoriesEditor()
const route = useRoute()
const {
  stories, characters, styles, sortedPages, selectedStoryId, selectedStory,
  selectedPage, selectedPageIndex, scenarioOptions, styleOptions, loading, pagesLoading, loadingPageDetail,
  storyModalOpen, editingStoryId, savingStory, savingPage, storyError, pageError,
  pageImageError, storyLibraryError, storyForm, pageForm, imageGeneration, isPageDirty, previewImageUrl,
  pageScenarioName, pageStyleName, load, openCreateStory, openEditStory, saveStory,
  removeStory, clearPage, selectPage, selectStory, addPageObject, toggleCharacter,
  savePage, removePage, movePage, generatePageImage, savePageImageToLibrary, downloadPageImage,
  saveStoryToLibrary, savingStoryToLibrary,
} = editor
const { job, error: generationError, submitting: generating, polling } = imageGeneration

function handleObjectKey(event: KeyboardEvent): void {
  if (event.key === 'Enter' || event.key === ',') {
    event.preventDefault()
    addPageObject()
  }
}

async function loadRequestedStory(): Promise<void> {
  await load()
  const storyId = route.query.story
  if (typeof storyId === 'string' && stories.value.some((story) => story.id === storyId)) {
    await selectStory(storyId)
  }
}

onMounted(() => void loadRequestedStory())
</script>

<template>
  <div class="page stories-page">
    <header class="page-heading">
      <div class="page-heading-copy">
        <span class="eyebrow">Cuentos</span>
        <h1>{{ selectedStory?.title || 'Historias que crecen contigo' }}</h1>
        <p>{{ selectedStory?.description || 'Crea cuentos por páginas y reutiliza tus personajes, escenarios y estilos guardados.' }}</p>
      </div>
      <div class="page-actions">
        <BaseButton @click="openCreateStory">
          <UiIcon
            name="plus"
            :size="15"
          /> Nuevo cuento
        </BaseButton>
        <BaseButton
          v-if="selectedStory"
          :disabled="savingStoryToLibrary"
          @click="saveStoryToLibrary"
        >
          <UiIcon
            name="heart"
            :size="15"
          />
          {{ savingStoryToLibrary ? 'Guardando…' : 'Guardar en biblioteca' }}
        </BaseButton>
        <BaseButton
          v-if="selectedStory"
          variant="primary"
          @click="openEditStory"
        >
          <UiIcon
            name="edit"
            :size="15"
          /> Editar cuento
        </BaseButton>
      </div>
    </header>

    <div
      v-if="storyError"
      class="auth-error story-global-error"
      role="alert"
    >
      {{ storyError }}
    </div>
    <div
      v-if="storyLibraryError"
      class="auth-error story-global-error"
      role="alert"
    >
      {{ storyLibraryError }}
    </div>

    <BasePanel
      v-if="loading"
      class="story-loading"
    >
      Cargando cuentos, personajes, escenarios y perfiles guardados…
    </BasePanel>

    <template v-else-if="stories.length">
      <BasePanel class="story-picker-panel">
        <div class="story-picker-heading">
          <div>
            <strong>Tus cuentos</strong>
            <small>{{ stories.length }} guardados en tu cuenta</small>
          </div>
          <button
            v-if="selectedStory"
            class="button-icon delete-story-button"
            type="button"
            aria-label="Eliminar cuento"
            @click="removeStory"
          >
            <UiIcon
              name="trash"
              :size="15"
            />
          </button>
        </div>
        <div class="story-picker-list">
          <button
            v-for="story in stories"
            :key="story.id"
            class="story-picker-item"
            :class="{ active: selectedStoryId === story.id }"
            type="button"
            @click="selectStory(story.id)"
          >
            <span class="story-picker-icon"><UiIcon
              name="stories"
              :size="15"
            /></span>
            <span class="story-picker-copy">
              <strong>{{ story.title }}</strong>
              <small>{{ story.description || 'Sin descripción' }}</small>
            </span>
            <UiIcon
              v-if="selectedStoryId === story.id"
              name="check"
              :size="14"
            />
          </button>
        </div>
      </BasePanel>

      <div
        v-if="selectedStory"
        class="story-layout"
      >
        <BasePanel class="story-editor-panel">
          <div class="story-editor-heading">
            <div>
              <span class="eyebrow">Editor de cuento</span>
              <h2>{{ selectedStory.title }}</h2>
              <p>Personajes y escenas se cargan desde los recursos de tu cuenta.</p>
            </div>
            <span class="page-count">{{ sortedPages.length }} {{ sortedPages.length === 1 ? 'página' : 'páginas' }}</span>
          </div>

          <div class="pages-toolbar">
            <div class="page-navigation">
              <BaseButton
                aria-label="Página anterior"
                :disabled="selectedPageIndex <= 0 || pagesLoading || loadingPageDetail"
                @click="movePage(-1)"
              >
                ←
              </BaseButton>
              <strong>{{ selectedPage ? `Página ${selectedPage.page_number}` : 'Nueva página' }}</strong>
              <small v-if="selectedPage">de {{ sortedPages.length }}</small>
              <BaseButton
                aria-label="Página siguiente"
                :disabled="selectedPageIndex < 0 || selectedPageIndex >= sortedPages.length - 1 || pagesLoading || loadingPageDetail"
                @click="movePage(1)"
              >
                →
              </BaseButton>
            </div>
            <BaseButton @click="clearPage">
              <UiIcon
                name="plus"
                :size="14"
              /> Página
            </BaseButton>
          </div>

          <div
            v-if="sortedPages.length"
            class="page-tabs"
            aria-label="Páginas del cuento"
          >
            <button
              v-for="page in sortedPages"
              :key="page.id"
              type="button"
              class="page-tab"
              :class="{ active: page.id === selectedPage?.id }"
              :disabled="loadingPageDetail"
              @click="selectPage(page)"
            >
              {{ page.page_number }}
            </button>
          </div>
          <div
            v-else-if="pagesLoading"
            class="inline-loader"
          >
            Cargando páginas…
          </div>
          <div
            v-else
            class="first-page-note"
          >
            Este cuento aún no tiene páginas. Completa los campos y guarda la primera.
          </div>

          <form
            class="page-editor"
            :class="{ 'detail-loading': loadingPageDetail }"
            :aria-busy="loadingPageDetail"
            @submit.prevent="savePage"
          >
            <div class="form-grid two">
              <BaseInput
                v-model="pageForm.pageNumber"
                label="Número de página"
                type="number"
                :min="1"
                :max="1000"
                required
              />
              <BaseInput
                v-model="pageForm.seed"
                label="Seed (opcional)"
                type="number"
                :min="0"
                :max="4294967295"
              />
            </div>

            <section class="page-form-section">
              <div class="section-heading">
                <div><h3>Personajes</h3><p>Selecciona personajes existentes para esta página.</p></div>
                <RouterLink
                  class="text-link"
                  to="/library"
                >
                  Administrar
                </RouterLink>
              </div>
              <div
                v-if="characters.length"
                class="character-row"
              >
                <button
                  v-for="(character, index) in characters"
                  :key="character.id"
                  class="character-choice"
                  :class="{ selected: pageForm.characterIds.includes(character.id) }"
                  type="button"
                  :aria-pressed="pageForm.characterIds.includes(character.id)"
                  @click="toggleCharacter(character.id)"
                >
                  <span
                    class="character-avatar"
                    :class="'tone-' + (index % 4)"
                  >
                    <UiIcon
                      name="characters"
                      :size="14"
                    />
                  </span>
                  <span>{{ character.name }}</span>
                  <UiIcon
                    v-if="pageForm.characterIds.includes(character.id)"
                    name="check"
                    :size="13"
                  />
                </button>
              </div>
              <div
                v-else
                class="resource-empty"
              >
                Aún no hay personajes guardados en tu cuenta.
              </div>
            </section>

            <label class="form-field">
              <span class="form-label">Texto de la página</span>
              <CharacterMentionTextarea
                v-model="pageForm.text"
                :characters="characters"
                label="Texto de la página"
                textarea-class="page-text"
                :rows="6"
                :maxlength="20000"
                placeholder="Escribe el texto de esta página…"
              />
              <small class="form-hint character-count">{{ pageForm.text.length }} / 20000 · Escribe @ para mencionar personajes guardados.</small>
              <small
                v-if="pageForm.text.length > 4000"
                class="form-hint character-count"
              >
                El prompt de imagen admite 4000 caracteres; se enviarán los primeros 4000.
              </small>
            </label>

            <div class="form-grid two">
              <label class="form-field">
                <span class="form-label">Acción principal</span>
                <CharacterMentionTextarea
                  v-model="pageForm.action"
                  :characters="characters"
                  label="Acción principal"
                  placeholder="Qué sucede en esta escena"
                  :maxlength="2000"
                  :rows="2"
                />
              </label>
              <BaseInput
                v-model="pageForm.emotion"
                label="Emoción"
                placeholder="Ej.: alegres y curiosos"
                :maxlength="200"
              />
            </div>

            <label class="form-field">
              <span class="form-label">Objetos visibles</span>
              <div class="object-input">
                <span
                  v-for="(object, index) in pageForm.objects"
                  :key="object + index"
                  class="object-chip"
                >
                  {{ object }}
                  <button
                    type="button"
                    :aria-label="'Quitar ' + object"
                    @click="pageForm.objects.splice(index, 1)"
                  >×</button>
                </span>
                <input
                  v-model="pageForm.objectEntry"
                  class="object-entry"
                  type="text"
                  placeholder="Agregar objeto…"
                  @keydown="handleObjectKey"
                  @blur="addPageObject()"
                >
              </div>
              <small class="form-hint">Presiona Enter o coma para agregar un objeto.</small>
            </label>

            <div class="form-grid two">
              <BaseSelect
                v-model="pageForm.scenarioId"
                label="Escenario"
                :options="scenarioOptions"
                placeholder="Sin escenario guardado"
              />
              <BaseInput
                v-model="pageForm.moment"
                label="Momento"
                placeholder="Ej.: atardecer"
                :maxlength="500"
              />
            </div>

            <section class="page-form-section style-section">
              <div class="section-heading">
                <div><h3>Estilo visual</h3><p>Perfiles visuales guardados en el backend.</p></div>
              </div>
              <div
                v-if="styles.length"
                class="style-grid"
              >
                <button
                  v-for="(profile, index) in styles"
                  :key="profile.id"
                  type="button"
                  class="style-choice"
                  :class="[{ selected: pageForm.styleId === profile.id }, 'style-tone-' + (index % 3)]"
                  :aria-pressed="pageForm.styleId === profile.id"
                  @click="pageForm.styleId = pageForm.styleId === profile.id ? '' : profile.id"
                >
                  <span class="style-swatch" />
                  <span class="style-copy"><strong>{{ profile.name }}</strong><small>{{ profile.description || 'Perfil visual guardado' }}</small></span>
                  <UiIcon
                    v-if="pageForm.styleId === profile.id"
                    name="check"
                    :size="13"
                  />
                </button>
              </div>
              <p
                v-else
                class="form-hint"
              >
                No tienes perfiles visuales guardados.
              </p>
              <BaseSelect
                v-if="styles.length"
                v-model="pageForm.styleId"
                class="style-select-fallback"
                label="Perfil de estilo"
                :options="styleOptions"
                placeholder="Sin perfil de estilo"
              />
            </section>

            <label class="form-field">
              <span class="form-label">Indicaciones adicionales <small>Opcional</small></span>
              <CharacterMentionTextarea
                v-model="pageForm.extra"
                :characters="characters"
                label="Indicaciones adicionales"
                :rows="3"
                :maxlength="2000"
                placeholder="Detalles que deben aparecer en la ilustración…"
              />
            </label>

            <div
              v-if="pageError || pageImageError || generationError"
              class="auth-error"
              role="alert"
            >
              {{ pageError || pageImageError || generationError }}
            </div>

            <footer class="editor-footer">
              <div class="editor-actions">
                <BaseButton
                  v-if="selectedPage"
                  variant="danger"
                  type="button"
                  :disabled="savingPage"
                  @click="removePage"
                >
                  <UiIcon
                    name="trash"
                    :size="14"
                  /> Eliminar
                </BaseButton>
                <BaseButton
                  type="submit"
                  variant="primary"
                  :disabled="savingPage"
                >
                  {{ savingPage ? 'Guardando…' : selectedPage ? 'Guardar página' : 'Crear página' }}
                </BaseButton>
              </div>
              <BaseButton
                type="button"
                :disabled="savingPage || generating"
                @click="generatePageImage"
              >
                <UiIcon
                  name="sparkle"
                  :size="14"
                />
                {{ generating ? 'Enviando…' : polling ? 'Generar otra ilustración' : 'Generar ilustración' }}
              </BaseButton>
            </footer>
            <p
              v-if="isPageDirty"
              class="unsaved-note"
            >
              Hay cambios sin guardar en esta página.
            </p>
          </form>
        </BasePanel>

        <BasePanel class="story-preview-panel">
          <header class="preview-heading">
            <div>
              <span class="eyebrow">Vista previa</span>
              <h2>{{ selectedStory.title }}</h2>
              <p v-if="selectedPage">
                Página {{ selectedPage.page_number }}
              </p>
            </div>
            <span
              v-if="job"
              class="job-pill"
              :class="'job-' + job.status.toLowerCase()"
            >{{ job.status }}</span>
          </header>

          <article class="book-page">
            <div
              class="book-illustration"
              :class="{ 'has-image': previewImageUrl }"
            >
              <img
                v-if="previewImageUrl"
                :src="previewImageUrl"
                alt="Ilustración real de la página"
              >
              <div
                v-else
                class="illustration-empty"
              >
                <span class="illustration-sun" />
                <span class="illustration-star illustration-star-one">✦</span>
                <span class="illustration-star illustration-star-two">✧</span>
                <span class="illustration-ground" />
                <span class="illustration-caption">La ilustración generada para esta página aparecerá aquí.</span>
              </div>
            </div>
            <div class="book-copy">
              <p v-if="pageForm.text">
                {{ pageForm.text }}
              </p>
              <p
                v-else
                class="preview-placeholder"
              >
                El texto de la página aparecerá aquí cuando lo escribas.
              </p>
              <div class="preview-details">
                <span v-if="pageForm.action">Acción: {{ pageForm.action }}</span>
                <span v-if="pageForm.emotion">Emoción: {{ pageForm.emotion }}</span>
                <span v-if="pageScenarioName">{{ pageScenarioName }}<template v-if="pageForm.moment"> · {{ pageForm.moment }}</template></span>
                <span v-if="pageStyleName">Estilo: {{ pageStyleName }}</span>
                <span v-if="pageForm.objects.length">Objetos: {{ pageForm.objects.join(', ') }}</span>
              </div>
              <small class="book-page-number">{{ selectedPage?.page_number || pageForm.pageNumber }}</small>
            </div>
          </article>

          <div
            v-if="polling"
            class="generation-progress"
            role="status"
          >
            <span class="progress-spinner" />
            <span>El worker está procesando la ilustración…</span>
          </div>
          <footer class="preview-actions">
            <BaseButton
              :disabled="!previewImageUrl"
              @click="downloadPageImage"
            >
              <UiIcon
                name="download"
                :size="14"
              /> Descargar
            </BaseButton>
            <BaseButton
              variant="primary"
              :disabled="!previewImageUrl || !selectedPage"
              @click="savePageImageToLibrary"
            >
              Guardar ilustración
            </BaseButton>
          </footer>
        </BasePanel>
      </div>
    </template>

    <BasePanel
      v-else
      class="stories-empty-panel"
    >
      <div class="empty-state">
        <div class="empty-state-icon">
          <UiIcon name="stories" />
        </div>
        <strong>Aún no hay cuentos</strong>
        <p>Crea tu primer cuento para guardar páginas, texto y personajes.</p>
        <BaseButton
          variant="primary"
          @click="openCreateStory"
        >
          Crear cuento
        </BaseButton>
      </div>
    </BasePanel>
  </div>

  <BaseModal
    v-model="storyModalOpen"
    :title="editingStoryId ? 'Editar cuento' : 'Nuevo cuento'"
  >
    <form @submit.prevent="saveStory">
      <div class="modal-body">
        <BaseInput
          v-model="storyForm.title"
          label="Título del cuento"
          :maxlength="200"
          required
        />
        <label class="form-field">
          <span class="form-label">Descripción</span>
          <textarea
            v-model="storyForm.description"
            class="form-control"
            rows="4"
            maxlength="10000"
          />
        </label>
        <BaseSelect
          v-model="storyForm.scenarioId"
          label="Escenario del cuento"
          :options="scenarioOptions"
          placeholder="Sin escenario"
        />
        <BaseSelect
          v-model="storyForm.styleId"
          label="Perfil visual del cuento"
          :options="styleOptions"
          placeholder="Sin perfil de estilo"
        />
        <BaseInput
          v-model="storyForm.seed"
          label="Seed (opcional)"
          type="number"
          :min="0"
          :max="4294967295"
        />
        <div
          v-if="storyError"
          class="auth-error"
          role="alert"
        >
          {{ storyError }}
        </div>
      </div>
      <footer class="modal-footer">
        <BaseButton
          type="button"
          @click="storyModalOpen = false"
        >
          Cancelar
        </BaseButton>
        <BaseButton
          variant="primary"
          type="submit"
          :disabled="savingStory"
        >
          {{ savingStory ? 'Guardando…' : editingStoryId ? 'Guardar cambios' : 'Crear cuento' }}
        </BaseButton>
      </footer>
    </form>
  </BaseModal>
</template>

<style scoped>
.stories-page { display: grid; gap: 14px; }
.story-global-error { margin-top: -5px; }
.story-loading { min-height: 160px; display: grid; place-items: center; color: var(--text-2); font-size: 12px; }
.story-picker-panel { padding: 12px; }
.story-picker-heading { display: flex; align-items: center; justify-content: space-between; margin: 0 2px 9px; }
.story-picker-heading strong, .story-picker-heading small { display: block; }
.story-picker-heading strong { font-size: 11px; }
.story-picker-heading small { margin-top: 3px; color: var(--text-3); font-size: 9px; }
.story-picker-list { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 2px; }
.story-picker-item { display: flex; min-width: 220px; max-width: 330px; flex: 1; align-items: center; gap: 8px; padding: 8px; border: 1px solid transparent; border-radius: 12px; background: rgba(240, 241, 244, .7); text-align: left; }
.story-picker-item:hover, .story-picker-item.active { border-color: var(--accent-border); background: rgba(230, 219, 254, .65); }
.story-picker-icon { display: grid; width: 31px; height: 31px; flex: 0 0 auto; place-items: center; border-radius: 9px; background: rgba(116,84,253,.13); color: var(--accent); }
.story-picker-copy { min-width: 0; flex: 1; }
.story-picker-copy strong, .story-picker-copy small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.story-picker-copy strong { font-size: 10px; }
.story-picker-copy small { margin-top: 3px; color: var(--text-3); font-size: 9px; }
.story-picker-item > .ui-icon { color: var(--accent); }
.story-layout { display: grid; grid-template-columns: minmax(0, 1.14fr) minmax(340px, .86fr); align-items: start; gap: 14px; }
.story-editor-panel, .story-preview-panel { min-width: 0; }
.story-editor-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding-bottom: 14px; border-bottom: 1px solid var(--border); }
.story-editor-heading h2 { margin: 0; font-family: var(--font-display); font-size: 20px; letter-spacing: -.02em; }
.story-editor-heading p { margin: 5px 0 0; color: var(--text-3); font-size: 10px; }
.page-count { flex: 0 0 auto; padding: 6px 9px; border-radius: 999px; background: rgba(230,219,254,.67); color: var(--accent); font-size: 9px; font-weight: 750; }
.pages-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 13px 0 9px; }
.page-navigation { display: flex; align-items: center; gap: 7px; }
.page-navigation :deep(.button) { min-width: 33px; min-height: 33px; padding: 0 8px; }
.page-navigation strong { font-size: 10px; }
.page-navigation small { color: var(--text-3); font-size: 9px; }
.page-tabs { display: flex; gap: 6px; margin-bottom: 13px; overflow-x: auto; }
.page-tab { min-width: 32px; height: 30px; padding: 0 8px; border: 1px solid var(--border); border-radius: 9px; background: rgba(255,255,255,.64); color: var(--text-2); font-size: 10px; font-weight: 750; }
.page-tab:hover, .page-tab.active { border-color: var(--accent-border); background: rgba(230,219,254,.7); color: var(--accent); }
.first-page-note { margin: 8px 0 13px; padding: 11px 12px; border: 1px dashed var(--accent-border); border-radius: 11px; color: var(--text-2); font-size: 10px; }
.page-editor { display: grid; align-content: start; gap: 13px; }
.page-editor.detail-loading { opacity: .62; pointer-events: none; }
.page-editor .form-grid.two { gap: 11px; }
.page-form-section { min-width: 0; }
.section-heading { margin-bottom: 9px; }
.section-heading h3 { margin: 0; font-size: 12px; }
.section-heading p { margin: 4px 0 0; color: var(--text-3); font-size: 9px; }
.text-link { padding: 3px 5px; border: 0; background: transparent; color: var(--accent); font-size: 10px; font-weight: 750; }
.character-row { display: flex; flex-wrap: wrap; gap: 6px; }
.character-choice { display: inline-flex; min-height: 38px; align-items: center; gap: 6px; padding: 4px 8px 4px 5px; border: 1px solid transparent; border-radius: 10px; background: rgba(240,241,244,.85); font-size: 9px; }
.character-choice:hover, .character-choice.selected { border-color: var(--accent-border); background: rgba(230,219,254,.65); }
.character-avatar { display: grid; width: 28px; height: 28px; place-items: center; border-radius: 8px; background: linear-gradient(140deg, #b194fe, #7454fd); color: #fff; }
.tone-1 { background: linear-gradient(140deg, #ffc27c, #d7882c); }
.tone-2 { background: linear-gradient(140deg, #84d5cf, #3b9c99); }
.tone-3 { background: linear-gradient(140deg, #f3a4bd, #c45b7f); }
.resource-empty { padding: 11px; border: 1px dashed var(--border-strong); border-radius: 10px; color: var(--text-3); font-size: 10px; }
.page-text { min-height: 118px !important; }
.character-count { display: block; text-align: right; }
.object-input { display: flex; min-height: 40px; flex-wrap: wrap; align-items: center; gap: 5px; padding: 5px 7px; border: 1px solid var(--border); border-radius: 11px; background: #f0f1f4; }
.object-chip { display: inline-flex; min-height: 25px; align-items: center; gap: 5px; padding: 0 7px; border-radius: 8px; background: #fff; color: var(--text-2); font-size: 9px; }
.object-chip button { border: 0; background: transparent; color: var(--text-3); font-size: 13px; }
.object-entry { min-width: 115px; min-height: 26px; flex: 1; border: 0; outline: 0; background: transparent; font-size: 11px; }
.object-entry::placeholder { color: var(--text-3); }
.style-section { margin-top: 0; }
.style-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.style-choice { display: grid; grid-template-columns: 1fr auto; gap: 4px 7px; min-width: 0; padding: 6px; border: 1px solid transparent; border-radius: 12px; background: rgba(255,255,255,.82); text-align: left; }
.style-choice.selected { border-color: var(--accent-border); background: rgba(230,219,254,.66); }
.style-swatch { grid-column: 1 / -1; height: 43px; border-radius: 8px; background: linear-gradient(110deg, #f8d4ca, #c7bdff 58%, #99baff); }
.style-tone-1 .style-swatch { background: radial-gradient(circle at 36% 30%, #fff4d3 0 13%, transparent 14%), linear-gradient(110deg, #62c7c1, #8c8bff); }
.style-tone-2 .style-swatch { background: linear-gradient(120deg, #ffc4da, #c5b2ff 52%, #ffd58b); }
.style-copy { min-width: 0; padding: 0 3px 3px; }
.style-copy strong, .style-copy small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.style-copy strong { font-size: 9px; }
.style-copy small { margin-top: 2px; color: var(--text-3); font-size: 8px; }
.style-choice :deep(.ui-icon) { align-self: center; margin-right: 4px; color: var(--accent); }
.style-select-fallback { display: none; }
.form-label small { float: right; color: var(--text-3); font-weight: 500; }
.editor-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-top: 13px; border-top: 1px solid var(--border); }
.editor-actions { display: flex; gap: 7px; }
.editor-footer :deep(.button) { min-width: 0; padding-inline: 10px; }
.unsaved-note { margin: -6px 0 0; color: #986817; font-size: 9px; }
.preview-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 13px; }
.preview-heading h2 { margin: 0; font-size: 13px; }
.preview-heading p { margin: 4px 0 0; color: var(--text-3); font-size: 9px; }
.job-pill { flex: 0 0 auto; padding: 5px 8px; border-radius: 999px; background: var(--accent-soft); color: var(--accent); font-size: 8px; font-weight: 750; }
.job-failed { background: rgba(224,82,101,.1); color: #b92e45; }
.job-succeeded { background: rgba(34,160,107,.12); color: #256b50; }
.book-page { overflow: hidden; border: 1px solid rgba(255,255,255,.84); border-radius: 14px; background: #fffdf9; box-shadow: var(--shadow-sm); }
.book-illustration { position: relative; display: grid; min-height: 300px; place-items: center; overflow: hidden; background: linear-gradient(180deg, #aebaf6 0%, #d2b8d8 57%, #e1aa9e 100%); }
.book-illustration.has-image { background: rgba(255,255,255,.6); }
.book-illustration > img { display: block; width: 100%; height: 100%; max-height: 460px; object-fit: contain; }
.illustration-empty { position: absolute; inset: 0; overflow: hidden; }
.illustration-sun { position: absolute; top: 13%; right: 17%; width: 48px; aspect-ratio: 1; border-radius: 50%; background: #fff2c5; box-shadow: 0 0 32px 10px rgba(255,242,197,.7); }
.illustration-star { position: absolute; z-index: 1; color: #fff4c4; text-shadow: 0 0 12px white; }
.illustration-star-one { top: 25%; left: 25%; font-size: 17px; }
.illustration-star-two { top: 43%; right: 25%; font-size: 23px; }
.illustration-ground { position: absolute; right: -10%; bottom: -16%; left: -10%; height: 42%; border-radius: 50% 50% 0 0; background: #587362; box-shadow: inset 130px 12px 0 -55px #698371; }
.illustration-caption { position: absolute; z-index: 1; right: 12px; bottom: 11px; left: 12px; padding: 8px; border-radius: 8px; background: rgba(255,255,255,.7); color: var(--text-2); font-size: 9px; text-align: center; backdrop-filter: blur(9px); }
.book-copy { position: relative; min-height: 190px; padding: 24px 20px 32px; }
.book-copy > p { margin: 0; color: #221a23; font-family: Georgia, 'Times New Roman', serif; font-size: 16px; line-height: 1.65; white-space: pre-wrap; overflow-wrap: anywhere; }
.book-copy > .preview-placeholder { color: #aaa5aa; font-style: italic; }
.preview-details { display: grid; gap: 4px; margin-top: 13px; color: #77727d; font-size: 9px; line-height: 1.45; }
.book-page-number { position: absolute; right: 0; bottom: 10px; left: 0; color: #a19aa3; font-size: 8px; text-align: center; }
.generation-progress { display: flex; align-items: center; gap: 7px; margin-top: 10px; color: var(--text-2); font-size: 9px; }
.progress-spinner { width: 13px; height: 13px; border: 2px solid rgba(116,84,253,.2); border-top-color: var(--accent); border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.preview-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; margin-top: 10px; }
.preview-actions :deep(.button) { min-width: 0; padding-inline: 8px; }
.stories-empty-panel { display: grid; min-height: 320px; place-items: center; }
.delete-story-button { color: #b92e45; }

@media (max-width: 1120px) {
  .story-layout { grid-template-columns: 1fr; }
  .story-preview-panel { order: -1; }
  .book-illustration { min-height: 340px; }
}
@media (max-width: 700px) {
  .story-picker-list { flex-direction: column; }
  .story-picker-item { min-width: 0; max-width: none; }
  .page-editor .form-grid.two { grid-template-columns: 1fr; }
  .editor-footer { align-items: stretch; flex-direction: column; }
  .editor-actions { display: grid; grid-template-columns: 1fr 1.5fr; }
  .editor-footer > :deep(.button) { width: 100%; }
  .book-illustration { min-height: 270px; }
  .book-copy { min-height: 160px; padding: 18px 15px 29px; }
  .book-copy > p { font-size: 14px; }
}
</style>
