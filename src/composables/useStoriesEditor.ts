import { computed, onScopeDispose, reactive, ref, watch } from 'vue'
import { ApiError } from '@/api/HttpClient'
import { libraryApi } from '@/api/libraryApi'
import { mediaApi } from '@/api/mediaApi'
import { resourcesApi } from '@/api/resourcesApi'
import { useImageGeneration } from '@/composables/useImageGeneration'
import { useNoticesStore } from '@/stores/notices'
import type { Character, ImageGenerationRequest, Scenario, Story, StoryPage, StyleProfile } from '@/types/api'

interface PageVisualConfig extends Record<string, unknown> {
  emotion?: string
  objects?: string[]
  scenario_id?: string
  moment?: string
  style_profile_id?: string
  extra?: string
  asset_id?: string
}

interface PageEditorForm {
  pageNumber: string
  action: string
  text: string
  emotion: string
  objects: string[]
  objectEntry: string
  scenarioId: string
  moment: string
  styleId: string
  extra: string
  seed: string
  characterIds: string[]
}

function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Tu sesión terminó. Inicia sesión otra vez para continuar.'
    if (error.status === 404) return 'El cuento, la página o uno de sus recursos ya no existe.'
    if (error.status === 409) return 'Ya existe otra página con ese número. Elige un número distinto.'
    if (error.status === 422) return 'Revisa los campos: el backend rechazó la solicitud.'
    return error.message
  }
  return error instanceof Error ? error.message : 'No se pudo completar la acción.'
}

function configOf(page: StoryPage | null): PageVisualConfig {
  return (page?.visual_config || {}) as PageVisualConfig
}

function validUuid(value: unknown): value is string {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export function useStoriesEditor() {
  const notices = useNoticesStore()
  const stories = ref<Story[]>([])
  const characters = ref<Character[]>([])
  const scenarios = ref<Scenario[]>([])
  const styles = ref<StyleProfile[]>([])
  const pages = ref<StoryPage[]>([])
  const selectedStoryId = ref('')
  const selectedPageId = ref<string | null>(null)
  const loading = ref(true)
  const pagesLoading = ref(false)
  const loadingPageDetail = ref(false)
  const storyModalOpen = ref(false)
  const editingStoryId = ref<string | null>(null)
  const savingStory = ref(false)
  const savingPage = ref(false)
  const storyError = ref('')
  const storyLibraryError = ref('')
  const savingStoryToLibrary = ref(false)
  const pageError = ref('')
  const pageImageError = ref('')
  const storyForm = reactive({ title: '', description: '', scenarioId: '', styleId: '', seed: '' })
  const pageForm = reactive<PageEditorForm>({
    pageNumber: '1', action: '', text: '', emotion: '', objects: [], objectEntry: '',
    scenarioId: '', moment: '', styleId: '', extra: '', seed: '', characterIds: [],
  })
  const imageGeneration = useImageGeneration()
  const pageAssetUrls = ref<Record<string, string>>({})
  const generationTargetPageId = ref<string | null>(null)
  let baseline = ''
  let pageRequestId = 0
  let pageDetailRequestId = 0
  let pageMediaController: AbortController | null = null

  const selectedStory = computed(() => stories.value.find((row) => row.id === selectedStoryId.value) || null)
  const selectedPage = computed(() => pages.value.find((row) => row.id === selectedPageId.value) || null)
  const scenarioOptions = computed(() => scenarios.value.map((row) => ({ label: row.name, value: row.id })))
  const styleOptions = computed(() => styles.value.map((row) => ({ label: row.name, value: row.id })))
  const sortedPages = computed(() => [...pages.value].sort((left, right) => left.page_number - right.page_number))
  const selectedPageIndex = computed(() => sortedPages.value.findIndex((row) => row.id === selectedPageId.value))
  const isPageDirty = computed(() => baseline !== snapshotPageForm())
  const previewImageUrl = computed(() => {
    const pageId = selectedPageId.value
    if (!pageId) return ''
    if (generationTargetPageId.value === pageId && imageGeneration.assetUrl.value) {
      return imageGeneration.assetUrl.value
    }
    return pageAssetUrls.value[pageId] || ''
  })
  const pageScenarioName = computed(() => scenarios.value.find((row) => row.id === pageForm.scenarioId)?.name || '')
  const pageStyleName = computed(() => styles.value.find((row) => row.id === pageForm.styleId)?.name || '')

  function snapshotPageForm(): string {
    return JSON.stringify({
      pageNumber: pageForm.pageNumber,
      action: pageForm.action,
      text: pageForm.text,
      emotion: pageForm.emotion,
      objects: pageForm.objects,
      scenarioId: pageForm.scenarioId,
      moment: pageForm.moment,
      styleId: pageForm.styleId,
      extra: pageForm.extra,
      seed: pageForm.seed,
      characterIds: pageForm.characterIds,
    })
  }

  function markPageClean(): void {
    baseline = snapshotPageForm()
  }

  function mayDiscardChanges(): boolean {
    return !isPageDirty.value || window.confirm('Hay cambios sin guardar en esta página. ¿Descartarlos?')
  }

  function releasePageAssets(): void {
    pageMediaController?.abort()
    pageMediaController = null
    for (const url of Object.values(pageAssetUrls.value)) URL.revokeObjectURL(url)
    pageAssetUrls.value = {}
  }

  async function loadPages(storyId: string, preferredPageId?: string): Promise<void> {
    const requestId = ++pageRequestId
    releasePageAssets()
    const controller = new AbortController()
    pageMediaController = controller
    pagesLoading.value = true
    pageError.value = ''
    try {
      const rows = await resourcesApi.listStoryPages(storyId, controller.signal)
      if (requestId !== pageRequestId || selectedStoryId.value !== storyId) return
      pages.value = rows
      const selected = rows.find((row) => row.id === preferredPageId)
        || rows.find((row) => row.id === selectedPageId.value)
        || [...rows].sort((left, right) => left.page_number - right.page_number)[0]
      if (selected) applyPage(selected)
      else clearPage(false)
      void loadPageAssets(rows, controller, requestId)
    } catch (error) {
      if (controller.signal.aborted) return
      pageError.value = messageFor(error)
      pages.value = []
      clearPage(false)
    } finally {
      if (requestId === pageRequestId) pagesLoading.value = false
    }
  }

  async function loadPageAssets(rows: StoryPage[], controller: AbortController, requestId: number): Promise<void> {
    const entries = await Promise.all(rows.map(async (page) => {
      const assetId = configOf(page).asset_id
      if (!validUuid(assetId)) return null
      try {
        const url = await mediaApi.loadAssetById(assetId, controller.signal)
        return [page.id, url] as const
      } catch (error) {
        if (!controller.signal.aborted && requestId === pageRequestId) {
          pageImageError.value = messageFor(error)
        }
        return null
      }
    }))
    if (controller.signal.aborted || requestId !== pageRequestId) {
      for (const entry of entries) if (entry) URL.revokeObjectURL(entry[1])
      return
    }
    pageAssetUrls.value = Object.fromEntries(entries.filter((entry): entry is readonly [string, string] => entry !== null))
  }

  async function load(): Promise<void> {
    loading.value = true
    storyError.value = ''
    const controller = new AbortController()
    try {
      const [storyRows, characterRows, scenarioRows, styleRows] = await Promise.all([
        resourcesApi.listStories(undefined, controller.signal),
        resourcesApi.listCharacters(undefined, controller.signal),
        resourcesApi.listScenarios(undefined, controller.signal),
        resourcesApi.listStyleProfiles(undefined, controller.signal),
      ])
      stories.value = storyRows
      characters.value = characterRows
      scenarios.value = scenarioRows
      styles.value = styleRows
      if (selectedStoryId.value && !storyRows.some((row) => row.id === selectedStoryId.value)) {
        selectedStoryId.value = ''
      }
      if (!selectedStoryId.value && storyRows.length) selectedStoryId.value = storyRows[0]!.id
      if (selectedStoryId.value) {
        const detail = await resourcesApi.getStory(selectedStoryId.value, controller.signal)
        stories.value = stories.value.map((row) => row.id === detail.id ? detail : row)
      }
      if (!storyRows.length) {
        pages.value = []
        clearPage(false)
      }
    } catch (error) {
      storyError.value = messageFor(error)
    } finally {
      loading.value = false
    }
  }

  function resetStoryForm(): void {
    editingStoryId.value = null
    Object.assign(storyForm, { title: '', description: '', scenarioId: '', styleId: '', seed: '' })
  }

  function openCreateStory(): void {
    resetStoryForm()
    storyModalOpen.value = true
    storyError.value = ''
  }

  function openEditStory(): void {
    if (!selectedStory.value) return
    editingStoryId.value = selectedStory.value.id
    Object.assign(storyForm, {
      title: selectedStory.value.title,
      description: selectedStory.value.description,
      scenarioId: selectedStory.value.scenario_id || '',
      styleId: selectedStory.value.style_profile_id || '',
      seed: selectedStory.value.seed === null ? '' : String(selectedStory.value.seed),
    })
    storyError.value = ''
    storyModalOpen.value = true
  }

  function storySeed(): number | null | undefined {
    if (!storyForm.seed.trim()) return null
    const parsed = Number(storyForm.seed)
    return Number.isInteger(parsed) && parsed >= 0 && parsed <= 4_294_967_295 ? parsed : undefined
  }

  async function saveStory(): Promise<void> {
    const seed = storySeed()
    if (seed === undefined) {
      storyError.value = 'La seed debe ser un entero entre 0 y 4294967295.'
      return
    }
    savingStory.value = true
    storyError.value = ''
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
      stories.value = editingStoryId.value
        ? stories.value.map((row) => row.id === saved.id ? saved : row)
        : [saved, ...stories.value]
      selectedStoryId.value = saved.id
      storyModalOpen.value = false
      notices.push(editingStoryId.value ? 'Cuento actualizado.' : 'Cuento creado.')
    } catch (error) {
      storyError.value = messageFor(error)
    } finally {
      savingStory.value = false
    }
  }

  async function removeStory(): Promise<void> {
    const story = selectedStory.value
    if (!story || !window.confirm(`¿Eliminar el cuento «${story.title}» y sus páginas?`)) return
    storyError.value = ''
    try {
      await resourcesApi.deleteStory(story.id)
      stories.value = stories.value.filter((row) => row.id !== story.id)
      selectedStoryId.value = stories.value[0]?.id || ''
      if (!selectedStoryId.value) {
        pages.value = []
        clearPage(false)
        releasePageAssets()
      }
      notices.push('Cuento eliminado.')
    } catch (error) {
      storyError.value = messageFor(error)
    }
  }

  function resetPageForm(): void {
    Object.assign(pageForm, {
      pageNumber: String(Math.max(1, ...pages.value.map((row) => row.page_number + 1))),
      action: '', text: '', emotion: '', objects: [], objectEntry: '',
      scenarioId: selectedStory.value?.scenario_id || '',
      moment: '', styleId: selectedStory.value?.style_profile_id || '', extra: '', seed: '', characterIds: [],
    })
  }

  function clearPage(confirmDiscard = true): void {
    if (confirmDiscard && !mayDiscardChanges()) return
    selectedPageId.value = null
    resetPageForm()
    markPageClean()
    pageError.value = ''
  }

  function applyPage(page: StoryPage): void {
    const config = configOf(page)
    selectedPageId.value = page.id
    Object.assign(pageForm, {
      pageNumber: String(page.page_number),
      action: page.action,
      text: page.text,
      emotion: typeof config.emotion === 'string' ? config.emotion : '',
      objects: Array.isArray(config.objects) ? config.objects.filter((value): value is string => typeof value === 'string') : [],
      objectEntry: '',
      scenarioId: typeof config.scenario_id === 'string' ? config.scenario_id : selectedStory.value?.scenario_id || '',
      moment: typeof config.moment === 'string' ? config.moment : '',
      styleId: typeof config.style_profile_id === 'string' ? config.style_profile_id : selectedStory.value?.style_profile_id || '',
      extra: typeof config.extra === 'string' ? config.extra : '',
      seed: page.seed === null ? '' : String(page.seed),
      characterIds: [...page.character_ids],
    })
    pageError.value = ''
    pageImageError.value = ''
    markPageClean()
  }

  async function selectPage(page: StoryPage): Promise<void> {
    if (page.id === selectedPageId.value || !mayDiscardChanges()) return
    const storyId = selectedStoryId.value
    const requestId = ++pageDetailRequestId
    const formBeforeRequest = snapshotPageForm()
    loadingPageDetail.value = true
    pageError.value = ''
    try {
      const detail = await resourcesApi.getStoryPage(storyId, page.id)
      if (requestId !== pageDetailRequestId || selectedStoryId.value !== storyId) return
      if (snapshotPageForm() !== formBeforeRequest) {
        pageError.value = 'Se modificó el formulario durante la carga. Guarda los cambios antes de cambiar de página.'
        return
      }
      pages.value = pages.value.map((row) => row.id === detail.id ? detail : row)
      applyPage(detail)
    } catch (error) {
      if (requestId === pageDetailRequestId) pageError.value = messageFor(error)
    } finally {
      if (requestId === pageDetailRequestId) loadingPageDetail.value = false
    }
  }

  function addPageObject(value = pageForm.objectEntry): void {
    const item = value.trim().replace(/,$/, '').trim()
    if (!item) {
      pageForm.objectEntry = ''
      return
    }
    if (pageForm.objects.some((object) => object.toLocaleLowerCase() === item.toLocaleLowerCase())) {
      pageForm.objectEntry = ''
      return
    }
    if (pageForm.objects.length >= 50) {
      pageError.value = 'El backend admite hasta 50 objetos por página.'
      return
    }
    pageForm.objects = [...pageForm.objects, item]
    pageForm.objectEntry = ''
  }

  function toggleCharacter(id: string): void {
    pageForm.characterIds = pageForm.characterIds.includes(id)
      ? pageForm.characterIds.filter((value) => value !== id)
      : pageForm.characterIds.length < 50 ? [...pageForm.characterIds, id] : pageForm.characterIds
    if (pageForm.characterIds.length === 50) pageError.value = 'El backend admite hasta 50 personajes por página.'
  }

  function pageSeed(): number | null | undefined {
    if (!pageForm.seed.trim()) return null
    const parsed = Number(pageForm.seed)
    return Number.isInteger(parsed) && parsed >= 0 && parsed <= 4_294_967_295 ? parsed : undefined
  }

  function visualConfig(page: StoryPage | null = selectedPage.value): PageVisualConfig {
    const oldConfig = configOf(page)
    return {
      ...oldConfig,
      emotion: pageForm.emotion,
      objects: [...pageForm.objects],
      scenario_id: pageForm.scenarioId,
      moment: pageForm.moment,
      style_profile_id: pageForm.styleId,
      extra: pageForm.extra,
    }
  }

  function updatePage(saved: StoryPage, select = true): void {
    const index = pages.value.findIndex((row) => row.id === saved.id)
    if (index === -1) pages.value = [...pages.value, saved]
    else pages.value = pages.value.map((row) => row.id === saved.id ? saved : row)
    pages.value.sort((left, right) => left.page_number - right.page_number)
    if (select && selectedPageId.value === saved.id) applyPage(saved)
  }

  async function selectStory(storyId: string): Promise<void> {
    if (storyId === selectedStoryId.value || !mayDiscardChanges()) return
    selectedStoryId.value = storyId
    storyError.value = ''
    try {
      const detail = await resourcesApi.getStory(storyId)
      if (selectedStoryId.value === storyId) {
        stories.value = stories.value.map((row) => row.id === detail.id ? detail : row)
      }
    } catch (error) {
      storyError.value = messageFor(error)
    }
  }

  async function savePage(): Promise<StoryPage | null> {
    const story = selectedStory.value
    if (!story) return null
    const seed = pageSeed()
    const pageNumber = Number(pageForm.pageNumber)
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > 1000) {
      pageError.value = 'El número de página debe estar entre 1 y 1000.'
      return null
    }
    if (seed === undefined) {
      pageError.value = 'La seed debe ser un entero entre 0 y 4294967295.'
      return null
    }
    if (pageForm.characterIds.length > 50 || pageForm.objects.length > 50) {
      pageError.value = 'El backend admite hasta 50 personajes y 50 objetos por página.'
      return null
    }
    savingPage.value = true
    pageError.value = ''
    try {
      const creating = !selectedPageId.value
      const payload = {
        page_number: pageNumber,
        action: pageForm.action,
        text: pageForm.text,
        visual_config: visualConfig(),
        character_ids: [...pageForm.characterIds],
        seed,
      }
      const saved = selectedPageId.value
        ? await resourcesApi.patchStoryPage(story.id, selectedPageId.value, payload)
        : await resourcesApi.createStoryPage(story.id, payload)
      selectedPageId.value = saved.id
      updatePage(saved)
      notices.push(creating ? 'Página creada.' : 'Página guardada.')
      return saved
    } catch (error) {
      pageError.value = messageFor(error)
      return null
    } finally {
      savingPage.value = false
    }
  }

  async function removePage(): Promise<void> {
    const story = selectedStory.value
    const page = selectedPage.value
    if (!story || !page || !window.confirm(`¿Eliminar la página ${page.page_number}?`)) return
    pageError.value = ''
    try {
      await resourcesApi.deleteStoryPage(story.id, page.id)
      const removedIndex = selectedPageIndex.value
      pages.value = pages.value.filter((row) => row.id !== page.id)
      if (pageAssetUrls.value[page.id]) {
        URL.revokeObjectURL(pageAssetUrls.value[page.id]!)
        const remaining = { ...pageAssetUrls.value }
        delete remaining[page.id]
        pageAssetUrls.value = remaining
      }
      const next = sortedPages.value[Math.min(removedIndex, sortedPages.value.length - 1)]
      if (next) applyPage(next)
      else clearPage(false)
      notices.push('Página eliminada.')
    } catch (error) {
      pageError.value = messageFor(error)
    }
  }

  function movePage(direction: -1 | 1): void {
    const index = selectedPageIndex.value
    const destination = sortedPages.value[index + direction]
    if (destination) selectPage(destination)
  }

  function buildImageRequest(page: StoryPage): ImageGenerationRequest {
    const config = configOf(page)
    const chosenScenarioId = typeof config.scenario_id === 'string' ? config.scenario_id : ''
    const chosenStyleId = typeof config.style_profile_id === 'string' ? config.style_profile_id : ''
    const scenario = scenarios.value.find((row) => row.id === chosenScenarioId)
    const style = styles.value.find((row) => row.id === chosenStyleId)
    const names = characters.value
      .filter((row) => page.character_ids.includes(row.id))
      .map((row) => row.name)
    const objects = Array.isArray(config.objects)
      ? config.objects.filter((value): value is string => typeof value === 'string')
      : []
    return {
      Action: page.action,
      Emotion: typeof config.emotion === 'string' ? config.emotion : '',
      Scene: scenario?.visual_description || scenario?.name || '',
      Moment: typeof config.moment === 'string' ? config.moment : '',
      Extra: typeof config.extra === 'string' ? config.extra : '',
      FreePrompt: page.text.slice(0, 4000),
      Style: style?.name || '',
      Characters: names,
      Objects: objects,
      Seed: page.seed,
    }
  }

  async function generatePageImage(): Promise<void> {
    if (!selectedStory.value) return
    pageImageError.value = ''
    const savedPage = isPageDirty.value ? await savePage() : selectedPage.value
    if (!savedPage) return
    generationTargetPageId.value = savedPage.id
    await imageGeneration.generate(buildImageRequest(savedPage), async (_job, assetId) => {
      const storyId = savedPage.story_id
      const config = { ...configOf(savedPage), asset_id: assetId }
      const saved = await resourcesApi.patchStoryPage(storyId, savedPage.id, { visual_config: config })
      updatePage(saved, false)
      const nextUrl = await mediaApi.loadAssetById(assetId)
      const previousUrl = pageAssetUrls.value[savedPage.id]
      if (previousUrl) URL.revokeObjectURL(previousUrl)
      pageAssetUrls.value = { ...pageAssetUrls.value, [savedPage.id]: nextUrl }
      notices.push('Ilustración guardada en esta página.')
    })
  }

  async function savePageImageToLibrary(): Promise<void> {
    const page = selectedPage.value
    const assetId = page ? configOf(page).asset_id : null
    if (!page || typeof assetId !== 'string' || !previewImageUrl.value) return
    pageImageError.value = ''
    try {
      await libraryApi.save({
        type: 'image',
        resource_id: assetId,
        name: `${selectedStory.value?.title || 'Cuento'} · página ${page.page_number}`,
        description: [page.action, pageForm.text].filter(Boolean).join(' · '),
      })
      notices.push('Ilustración guardada en tu biblioteca.')
    } catch (error) {
      pageImageError.value = messageFor(error)
    }
  }

  async function saveStoryToLibrary(): Promise<void> {
    const currentStory = selectedStory.value
    if (!currentStory || savingStoryToLibrary.value) return
    savingStoryToLibrary.value = true
    storyLibraryError.value = ''
    try {
      await libraryApi.save({
        type: 'story',
        resource_id: currentStory.id,
        name: currentStory.title,
        description: currentStory.description,
      })
      notices.push('Cuento guardado en tu biblioteca.')
    } catch (error) {
      storyLibraryError.value = error instanceof ApiError && error.status === 409
        ? 'Este cuento ya está guardado en tu biblioteca.'
        : messageFor(error)
    } finally {
      savingStoryToLibrary.value = false
    }
  }

  function downloadPageImage(): void {
    if (!previewImageUrl.value || !selectedPage.value) return
    const anchor = document.createElement('a')
    anchor.href = previewImageUrl.value
    anchor.download = `tale-star-story-page-${selectedPage.value.page_number}.png`
    anchor.click()
  }

  watch(selectedStoryId, (storyId) => {
    pageDetailRequestId += 1
    loadingPageDetail.value = false
    pages.value = []
    selectedPageId.value = null
    resetPageForm()
    markPageClean()
    if (storyId) void loadPages(storyId)
    else releasePageAssets()
  })

  onScopeDispose(() => {
    pageRequestId += 1
    pageMediaController?.abort()
    releasePageAssets()
  })

  return {
    stories, characters, scenarios, styles, pages, sortedPages, selectedStoryId, selectedPageId,
    selectedStory, selectedPage, selectedPageIndex, scenarioOptions, styleOptions, loading,
    pagesLoading, loadingPageDetail, storyModalOpen, editingStoryId, savingStory, savingPage, storyError,
    pageError, pageImageError, storyLibraryError, savingStoryToLibrary, storyForm, pageForm, imageGeneration, pageAssetUrls,
    generationTargetPageId, isPageDirty, previewImageUrl, pageScenarioName, pageStyleName,
    load, openCreateStory, openEditStory, saveStory, removeStory, clearPage, selectPage,
    selectStory, addPageObject, toggleCharacter, savePage, removePage, movePage, generatePageImage,
    savePageImageToLibrary, saveStoryToLibrary, downloadPageImage,
  }
}
