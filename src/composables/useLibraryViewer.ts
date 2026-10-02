import { computed, onScopeDispose, ref } from 'vue'
import { ApiError } from '@/api/HttpClient'
import { libraryApi } from '@/api/libraryApi'
import { mediaApi } from '@/api/mediaApi'
import { resourcesApi } from '@/api/resourcesApi'
import type { LibraryItem, Story, StoryPage } from '@/types/api'

function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Tu sesión terminó. Inicia sesión de nuevo.'
    if (error.status === 403) return 'Tu cuenta no tiene acceso a este recurso.'
    if (error.status === 404) return 'El elemento o su asset ya no existe o no te pertenece.'
    if (error.status >= 500) return 'Tale Star API tuvo un error al abrir el recurso.'
    return error.message
  }
  return error instanceof Error ? error.message : 'No se pudo abrir este recurso.'
}

function assetIdOf(page: StoryPage | undefined): string {
  const id = page?.visual_config.asset_id
  return typeof id === 'string' ? id : ''
}

function fileSuffix(mediaType: string | null): string {
  const suffixes: Record<string, string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'audio/flac': '.flac',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
    'audio/ogg': '.ogg',
    'audio/opus': '.opus',
    'audio/aac': '.aac',
  }
  return mediaType ? suffixes[mediaType.toLowerCase()] || '' : ''
}

export function useLibraryViewer() {
  const item = ref<LibraryItem | null>(null)
  const story = ref<Story | null>(null)
  const pages = ref<StoryPage[]>([])
  const pageIndex = ref(0)
  const assetUrl = ref('')
  const loading = ref(false)
  const mediaLoading = ref(false)
  const error = ref('')
  const mediaError = ref('')
  const currentPage = computed(() => pages.value[pageIndex.value] || null)
  const pageCount = computed(() => pages.value.length)
  const filename = computed(() => {
    const name = (item.value?.name || 'tale-star-resource').trim().replace(/[\\/:*?"<>|]+/g, '-')
    if (item.value?.type === 'story') return `${name || 'cuento'}.txt`
    return `${name || 'tale-star-resource'}${fileSuffix(item.value?.media_type || null)}`
  })

  let requestId = 0
  let mediaRequestId = 0
  let controller: AbortController | null = null
  let mediaController: AbortController | null = null

  function revokeAsset(): void {
    if (assetUrl.value) URL.revokeObjectURL(assetUrl.value)
    assetUrl.value = ''
  }

  function close(): void {
    requestId++
    mediaRequestId++
    controller?.abort()
    controller = null
    mediaController?.abort()
    mediaController = null
    revokeAsset()
    item.value = null
    story.value = null
    pages.value = []
    pageIndex.value = 0
    error.value = ''
    mediaError.value = ''
    loading.value = false
    mediaLoading.value = false
  }

  async function loadStoryPageAsset(page: StoryPage | undefined, parentRequestId: number): Promise<void> {
    const thisMediaRequest = ++mediaRequestId
    mediaController?.abort()
    const currentMediaController = new AbortController()
    mediaController = currentMediaController
    revokeAsset()
    mediaError.value = ''
    const id = assetIdOf(page)
    if (!id) {
      mediaLoading.value = false
      return
    }
    mediaLoading.value = true
    try {
      const url = await mediaApi.loadAssetById(id, currentMediaController.signal)
      if (parentRequestId !== requestId || thisMediaRequest !== mediaRequestId) {
        URL.revokeObjectURL(url)
        return
      }
      assetUrl.value = url
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return
      if (parentRequestId === requestId && thisMediaRequest === mediaRequestId) {
        mediaError.value = messageFor(cause)
      }
    } finally {
      if (parentRequestId === requestId && thisMediaRequest === mediaRequestId) mediaLoading.value = false
    }
  }

  async function open(candidate: LibraryItem): Promise<void> {
    close()
    const thisRequest = requestId
    const currentController = new AbortController()
    controller = currentController
    item.value = candidate
    loading.value = true
    try {
      const currentItem = await libraryApi.get(candidate.id, currentController.signal)
      if (thisRequest !== requestId) return
      item.value = currentItem
      if (currentItem.type === 'story') {
        const [storyDetail, pageRows] = await Promise.all([
          resourcesApi.getStory(currentItem.resource_id, currentController.signal),
          resourcesApi.listStoryPages(currentItem.resource_id, currentController.signal),
        ])
        if (thisRequest !== requestId) return
        story.value = storyDetail
        pages.value = [...pageRows].sort((left, right) => left.page_number - right.page_number)
        loading.value = false
        await loadStoryPageAsset(pages.value[0], thisRequest)
      } else {
        const url = await mediaApi.loadAssetById(currentItem.resource_id, currentController.signal)
        if (thisRequest !== requestId) {
          URL.revokeObjectURL(url)
          return
        }
        assetUrl.value = url
        loading.value = false
      }
    } catch (cause) {
      if (thisRequest !== requestId || (cause instanceof DOMException && cause.name === 'AbortError')) return
      error.value = messageFor(cause)
    } finally {
      if (thisRequest === requestId) loading.value = false
    }
  }

  async function selectPage(index: number): Promise<void> {
    if (index < 0 || index >= pages.value.length || index === pageIndex.value) return
    pageIndex.value = index
    await loadStoryPageAsset(currentPage.value || undefined, requestId)
  }

  function download(): void {
    const current = item.value
    if (!current) return
    let url = assetUrl.value
    let temporaryUrl = false
    if (current.type === 'story') {
      const content = [
        story.value?.title || current.name,
        story.value?.description || current.description,
        ...pages.value.map((page) => `Página ${page.page_number}\n${page.action}\n${page.text}`.trim()),
      ].filter(Boolean).join('\n\n')
      url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }))
      temporaryUrl = true
    }
    if (!url) return
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename.value
    anchor.click()
    if (temporaryUrl) window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  onScopeDispose(close)

  return {
    item,
    story,
    pages,
    pageIndex,
    currentPage,
    pageCount,
    assetUrl,
    loading,
    mediaLoading,
    error,
    mediaError,
    filename,
    open,
    close,
    selectPage,
    download,
  }
}
