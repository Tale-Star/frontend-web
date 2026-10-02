<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { resourcesApi } from '@/api/resourcesApi'
import BaseButton from '@/components/BaseButton.vue'
import BaseInput from '@/components/BaseInput.vue'
import BaseModal from '@/components/BaseModal.vue'
import BasePanel from '@/components/BasePanel.vue'
import BaseSelect from '@/components/BaseSelect.vue'
import UiIcon from '@/components/UiIcon.vue'
import { useNoticesStore } from '@/stores/notices'
import type { Character, Scenario, Story, StoryPage, StyleProfile } from '@/types/api'

const notices = useNoticesStore()
const stories = ref<Story[]>([])
const characters = ref<Character[]>([])
const scenarios = ref<Scenario[]>([])
const styles = ref<StyleProfile[]>([])
const selectedStoryId = ref('')
const pages = ref<StoryPage[]>([])
const selectedPageId = ref<string | null>(null)
const loading = ref(true)
const pagesLoading = ref(false)
const storyModalOpen = ref(false)
const editingStoryId = ref<string | null>(null)
const savingStory = ref(false)
const savingPage = ref(false)
const storyForm = reactive({ title: '', description: '', scenarioId: '', styleId: '', seed: '' })
const pageForm = reactive({ pageNumber: 1, action: '', text: '', seed: '', characterIds: [] as string[] })

const selectedStory = computed(() => stories.value.find((story) => story.id === selectedStoryId.value) || null)
const selectedPage = computed(() => pages.value.find((page) => page.id === selectedPageId.value) || null)
const scenarioOptions = computed(() => scenarios.value.map((item) => ({ label: item.name, value: item.id })))
const styleOptions = computed(() => styles.value.map((item) => ({ label: item.name, value: item.id })))

async function loadReferenceData(): Promise<void> {
  const [characterRows, scenarioRows, styleRows] = await Promise.all([
    resourcesApi.listCharacters(),
    resourcesApi.listScenarios(),
    resourcesApi.listStyleProfiles(),
  ])
  characters.value = characterRows
  scenarios.value = scenarioRows
  styles.value = styleRows
}

async function loadStories(): Promise<void> {
  loading.value = true
  try {
    const rows = await resourcesApi.listStories()
    stories.value = rows
    if (selectedStoryId.value && !rows.some((story) => story.id === selectedStoryId.value)) {
      selectedStoryId.value = ''
    }
    if (!selectedStoryId.value && rows.length) selectedStoryId.value = rows[0]?.id || ''
  } finally {
    loading.value = false
  }
}

async function loadPages(storyId: string): Promise<void> {
  pagesLoading.value = true
  try {
    pages.value = await resourcesApi.listStoryPages(storyId)
    if (selectedPageId.value && !pages.value.some((page) => page.id === selectedPageId.value)) {
      selectedPageId.value = null
    }
    if (pages.value.length && !selectedPageId.value) selectPage(pages.value[0]!)
    if (!pages.value.length) clearPage()
  } finally {
    pagesLoading.value = false
  }
}

function clearStoryForm(): void {
  editingStoryId.value = null
  Object.assign(storyForm, { title: '', description: '', scenarioId: '', styleId: '', seed: '' })
}

function openCreateStory(): void {
  clearStoryForm()
  storyModalOpen.value = true
}

function openEditStory(): void {
  if (!selectedStory.value) return
  editingStoryId.value = selectedStory.value.id
  storyForm.title = selectedStory.value.title
  storyForm.description = selectedStory.value.description
  storyForm.scenarioId = selectedStory.value.scenario_id || ''
  storyForm.styleId = selectedStory.value.style_profile_id || ''
  storyForm.seed = selectedStory.value.seed === null ? '' : String(selectedStory.value.seed)
  storyModalOpen.value = true
}

function seedValue(): number | null | undefined {
  if (!storyForm.seed.trim()) return null
  const value = Number(storyForm.seed)
  if (!Number.isInteger(value) || value < 0 || value > 4_294_967_295) return undefined
  return value
}

async function saveStory(): Promise<void> {
  const seed = seedValue()
  if (seed === undefined) {
    notices.push('La seed debe ser un entero entre 0 y 4294967295.', 'error')
    return
  }
  savingStory.value = true
  try {
    const payload = {
      title: storyForm.title.trim(),
      description: storyForm.description,
      scenario_id: storyForm.scenarioId || null,
      style_profile_id: storyForm.styleId || null,
      seed,
    }
    const saved = editingStoryId.value
      ? await resourcesApi.patchStory(editingStoryId.value, payload)
      : await resourcesApi.createStory(payload)
    await loadStories()
    selectedStoryId.value = saved.id
    storyModalOpen.value = false
    notices.push(editingStoryId.value ? 'Cuento actualizado.' : 'Cuento creado.')
  } finally {
    savingStory.value = false
  }
}

async function removeStory(): Promise<void> {
  if (!selectedStory.value) return
  if (!window.confirm('¿Eliminar el cuento «' + selectedStory.value.title + '» y sus páginas?')) return
  await resourcesApi.deleteStory(selectedStory.value.id)
  stories.value = stories.value.filter((story) => story.id !== selectedStory.value?.id)
  selectedStoryId.value = stories.value[0]?.id || ''
  notices.push('Cuento eliminado.')
}

function clearPage(): void {
  selectedPageId.value = null
  pageForm.pageNumber = Math.max(1, ...pages.value.map((page) => page.page_number + 1))
  pageForm.action = ''
  pageForm.text = ''
  pageForm.seed = ''
  pageForm.characterIds = []
}

function selectPage(page: StoryPage): void {
  selectedPageId.value = page.id
  pageForm.pageNumber = page.page_number
  pageForm.action = page.action
  pageForm.text = page.text
  pageForm.seed = page.seed === null ? '' : String(page.seed)
  pageForm.characterIds = [...page.character_ids]
}

function toggleCharacter(id: string): void {
  pageForm.characterIds = pageForm.characterIds.includes(id)
    ? pageForm.characterIds.filter((value) => value !== id)
    : [...pageForm.characterIds, id]
}

async function savePage(): Promise<void> {
  if (!selectedStory.value) return
  const seed = pageForm.seed.trim() ? Number(pageForm.seed) : null
  if (seed !== null && (!Number.isInteger(seed) || seed < 0 || seed > 4_294_967_295)) {
    notices.push('La seed debe ser un entero entre 0 y 4294967295.', 'error')
    return
  }
  if (pageForm.characterIds.length > 50) {
    notices.push('Selecciona hasta 50 personajes por página.', 'error')
    return
  }
  savingPage.value = true
  try {
    const payload = {
      page_number: Number(pageForm.pageNumber),
      action: pageForm.action,
      text: pageForm.text,
      visual_config: selectedPage.value?.visual_config || {},
      character_ids: [...pageForm.characterIds],
      seed,
    }
    const saved = selectedPageId.value
      ? await resourcesApi.patchStoryPage(selectedStory.value.id, selectedPageId.value, payload)
      : await resourcesApi.createStoryPage(selectedStory.value.id, payload)
    await loadPages(selectedStory.value.id)
    selectedPageId.value = saved.id
    selectPage(saved)
    notices.push(selectedPageId.value ? 'Página guardada.' : 'Página creada.')
  } finally {
    savingPage.value = false
  }
}

async function removePage(page: StoryPage): Promise<void> {
  if (!selectedStory.value) return
  if (!window.confirm('¿Eliminar la página ' + page.page_number + '?')) return
  await resourcesApi.deleteStoryPage(selectedStory.value.id, page.id)
  pages.value = pages.value.filter((current) => current.id !== page.id)
  if (selectedPageId.value === page.id) clearPage()
  notices.push('Página eliminada.')
}

watch(selectedStoryId, (id) => {
  pages.value = []
  if (id) void loadPages(id)
})

onMounted(async () => {
  try {
    await Promise.all([loadReferenceData(), loadStories()])
  } catch {
    // The API client displays the backend error globally.
  }
})
</script>

<template>
  <div class="page">
    <header class="page-heading">
      <div class="page-heading-copy">
        <span class="eyebrow">Cuentos</span>
        <h1>Historias que crecen contigo</h1>
        <p>Crea historias y páginas guardadas en tu cuenta. Personajes y estilos usan tu biblioteca real.</p>
      </div>
      <BaseButton
        variant="primary"
        @click="openCreateStory"
      >
        <UiIcon
          name="plus"
          :size="16"
        /> Nuevo cuento
      </BaseButton>
    </header>

    <div class="story-layout">
      <BasePanel>
        <div class="section-heading">
          <div><h2>Tus cuentos</h2><p>{{ stories.length }} guardados</p></div>
        </div>
        <div
          v-if="loading"
          class="page-loader"
        >
          Cargando tus cuentos…
        </div>
        <div
          v-else-if="stories.length"
          class="story-list"
        >
          <button
            v-for="story in stories"
            :key="story.id"
            class="story-list-item"
            :class="{ active: selectedStoryId === story.id }"
            type="button"
            @click="selectedStoryId = story.id"
          >
            <span class="story-list-icon"><UiIcon
              name="stories"
              :size="17"
            /></span>
            <span class="story-list-copy"><strong>{{ story.title }}</strong><small>{{ story.description || 'Sin descripción' }}</small></span>
          </button>
        </div>
        <div
          v-else
          class="empty-state"
        >
          <div class="empty-state-icon">
            <UiIcon name="stories" />
          </div>
          <strong>Aún no hay cuentos</strong>
          <p>Crea un cuento y agrega sus páginas desde este espacio.</p>
          <BaseButton
            variant="primary"
            @click="openCreateStory"
          >
            Crear cuento
          </BaseButton>
        </div>
      </BasePanel>

      <BasePanel v-if="selectedStory">
        <header class="story-detail-heading">
          <div><span class="eyebrow">Editor de cuento</span><h2>{{ selectedStory.title }}</h2><p>{{ selectedStory.description || 'Sin descripción' }}</p></div>
          <div class="story-actions">
            <button
              class="button-icon"
              type="button"
              aria-label="Editar cuento"
              @click="openEditStory"
            >
              <UiIcon
                name="edit"
                :size="16"
              />
            </button>
            <button
              class="button-icon"
              type="button"
              aria-label="Eliminar cuento"
              @click="removeStory"
            >
              <UiIcon
                name="trash"
                :size="16"
              />
            </button>
          </div>
        </header>

        <div class="story-editor-layout">
          <section class="story-pages-panel">
            <div class="section-heading">
              <div><h3>Páginas</h3><p>{{ pages.length }} en este cuento</p></div>
              <BaseButton @click="clearPage">
                <UiIcon
                  name="plus"
                  :size="14"
                /> Página
              </BaseButton>
            </div>
            <div
              v-if="pagesLoading"
              class="inline-loader"
            >
              Cargando páginas…
            </div>
            <div
              v-else-if="pages.length"
              class="story-pages"
            >
              <article
                v-for="page in pages"
                :key="page.id"
                class="story-page-row"
              >
                <button
                  class="page-select"
                  type="button"
                  @click="selectPage(page)"
                >
                  <span class="story-page-number">{{ page.page_number }}</span>
                  <span class="story-page-copy">
                    <strong>{{ page.action || 'Página ' + page.page_number }}</strong>
                    <p>{{ page.text || 'Sin texto todavía' }}</p>
                  </span>
                </button>
                <button
                  class="button-icon"
                  type="button"
                  :aria-label="'Eliminar página ' + page.page_number"
                  @click="removePage(page)"
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
              class="empty-state compact-empty"
            >
              <strong>Este cuento no tiene páginas</strong>
              <p>Agrega la primera página para empezar a escribir.</p>
            </div>
          </section>

          <form
            class="page-editor"
            @submit.prevent="savePage"
          >
            <div class="section-heading">
              <div><h3>{{ selectedPage ? 'Editar página' : 'Nueva página' }}</h3><p>Texto, acción y personajes asociados.</p></div>
            </div>
            <BaseInput
              v-model="pageForm.pageNumber"
              label="Número de página"
              type="number"
              :min="1"
              :max="1000"
              required
            />
            <BaseInput
              v-model="pageForm.action"
              label="Acción principal"
              :maxlength="2000"
            />
            <label class="form-field">
              <span class="form-label">Texto de la página</span>
              <textarea
                v-model="pageForm.text"
                class="form-control page-text"
                rows="6"
                maxlength="20000"
              />
              <small class="form-hint">{{ pageForm.text.length }} / 20000</small>
            </label>
            <div class="form-field">
              <span class="form-label">Personajes</span>
              <div
                v-if="characters.length"
                class="character-select-list"
              >
                <button
                  v-for="character in characters"
                  :key="character.id"
                  class="character-select"
                  :class="{ selected: pageForm.characterIds.includes(character.id) }"
                  type="button"
                  :aria-pressed="pageForm.characterIds.includes(character.id)"
                  @click="toggleCharacter(character.id)"
                >
                  {{ character.name }}
                  <UiIcon
                    v-if="pageForm.characterIds.includes(character.id)"
                    name="check"
                    :size="13"
                  />
                </button>
              </div>
              <small
                v-else
                class="form-hint"
              >Aún no hay personajes en tu biblioteca.</small>
            </div>
            <BaseInput
              v-model="pageForm.seed"
              label="Seed (opcional)"
              type="number"
              :min="0"
              :max="4294967295"
            />
            <BaseButton
              variant="primary"
              type="submit"
              :disabled="savingPage"
            >
              {{ savingPage ? 'Guardando…' : selectedPage ? 'Guardar página' : 'Crear página' }}
            </BaseButton>
          </form>
        </div>
      </BasePanel>
      <BasePanel v-else-if="!loading">
        <div class="empty-state">
          <div class="empty-state-icon">
            <UiIcon name="stories" />
          </div>
          <strong>Elige un cuento o crea uno nuevo</strong>
          <p>Los cuentos y sus páginas se guardan en Tale Star API.</p>
        </div>
      </BasePanel>
    </div>
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
          label="Escenario"
          :options="scenarioOptions"
          placeholder="Sin escenario"
        />
        <BaseSelect
          v-model="storyForm.styleId"
          label="Perfil de estilo"
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
      </div>
      <footer class="modal-footer">
        <BaseButton @click="storyModalOpen = false">
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
.story-layout {
  display: grid;
  grid-template-columns: minmax(230px, 0.68fr) minmax(0, 1.32fr);
  align-items: start;
  gap: 14px;
}

.story-list {
  display: grid;
  gap: 6px;
}

.story-list-item {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 9px;
  padding: 9px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: transparent;
  text-align: left;
}

.story-list-item:hover,
.story-list-item.active {
  border-color: var(--accent-border);
  background: rgba(230, 219, 254, 0.54);
}

.story-list-icon {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 10px;
  background: rgba(116, 84, 253, 0.12);
  color: var(--accent);
}

.story-list-copy {
  min-width: 0;
}

.story-list-copy strong,
.story-list-copy small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.story-list-copy strong { font-size: 10px; }
.story-list-copy small { margin-top: 4px; color: var(--text-3); font-size: 9px; }

.story-detail-heading {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border);
}

.story-detail-heading h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 20px;
}

.story-detail-heading p {
  margin: 5px 0 0;
  color: var(--text-2);
  font-size: 10px;
}

.story-actions {
  display: flex;
  gap: 3px;
}

.story-editor-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(270px, 0.86fr);
  gap: 16px;
  padding-top: 14px;
}

.story-pages-panel {
  min-width: 0;
}

.story-page-row {
  align-items: center;
  padding: 7px 8px;
}

.page-select {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 9px;
  border: 0;
  background: transparent;
  text-align: left;
}

.page-editor {
  display: grid;
  align-content: start;
  gap: 12px;
  padding: 14px;
  border: 1px solid rgba(116, 84, 253, 0.14);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.44);
}

.page-editor .section-heading {
  margin-bottom: 1px;
}

.page-text {
  min-height: 155px;
}

.character-select-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.character-select {
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  gap: 5px;
  padding: 0 9px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.75);
  color: var(--text-2);
  font-size: 9px;
}

.character-select.selected {
  border-color: var(--accent-border);
  background: rgba(230, 219, 254, 0.62);
  color: var(--accent);
}

.compact-empty {
  min-height: 120px;
}

@media (max-width: 1120px) {
  .story-layout,
  .story-editor-layout {
    grid-template-columns: 1fr;
  }
}
</style>
