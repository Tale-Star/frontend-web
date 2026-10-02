import { computed, onScopeDispose, ref, watch } from 'vue'
import { ApiError } from '@/api/HttpClient'
import { libraryApi } from '@/api/libraryApi'
import type { LibraryItem, LibraryItemCreateRequest, LibraryItemPatchRequest, LibraryItemType } from '@/types/api'

function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Tu sesión terminó. Inicia sesión de nuevo.'
    if (error.status === 403) return 'Tu cuenta no tiene acceso a esta operación.'
    if (error.status === 404) return 'Este recurso ya no existe o no te pertenece.'
    if (error.status === 409) return 'Este recurso ya está guardado en la biblioteca.'
    if (error.status === 422) return `El backend rechazó la solicitud: ${error.message}`
    if (error.status >= 500) return 'Tale Star API tuvo un error. Inténtalo otra vez.'
    return error.message
  }
  return error instanceof Error ? error.message : 'No se pudo completar la operación.'
}

export function useLibraryCollection() {
  const items = ref<LibraryItem[]>([])
  const query = ref('')
  const filterType = ref<LibraryItemType | ''>('')
  const favoritesOnly = ref(false)
  const recentOnly = ref(false)
  const loading = ref(true)
  const loadError = ref('')
  const actionError = ref('')
  const busyItemId = ref('')
  const visibleItems = computed(() => {
    const ordered = [...items.value].sort(
      (left, right) => Date.parse(right.created_at) - Date.parse(left.created_at),
    )
    return recentOnly.value ? ordered.slice(0, 10) : ordered
  })

  let requestId = 0
  let controller: AbortController | null = null
  let searchTimer: number | undefined

  async function load(): Promise<void> {
    const currentId = ++requestId
    controller?.abort()
    const currentController = new AbortController()
    controller = currentController
    loading.value = true
    loadError.value = ''
    actionError.value = ''
    try {
      const rows = await libraryApi.list({
        type: filterType.value || undefined,
        q: query.value.trim() || undefined,
        favorite: favoritesOnly.value ? true : undefined,
      }, currentController.signal)
      if (currentId === requestId) items.value = rows
    } catch (error) {
      if (currentId !== requestId || (error instanceof DOMException && error.name === 'AbortError')) return
      loadError.value = messageFor(error)
    } finally {
      if (currentId === requestId) loading.value = false
    }
  }

  async function patchItem(id: string, payload: LibraryItemPatchRequest): Promise<LibraryItem | null> {
    busyItemId.value = id
    actionError.value = ''
    try {
      const updated = await libraryApi.patch(id, payload)
      items.value = items.value.map((item) => item.id === id ? updated : item)
      if (favoritesOnly.value && !updated.favorite) {
        items.value = items.value.filter((item) => item.id !== id)
      }
      return updated
    } catch (error) {
      actionError.value = messageFor(error)
      return null
    } finally {
      busyItemId.value = ''
    }
  }

  async function toggleFavorite(item: LibraryItem): Promise<boolean> {
    return Boolean(await patchItem(item.id, { favorite: !item.favorite }))
  }

  async function saveItem(payload: LibraryItemCreateRequest): Promise<LibraryItem | null> {
    busyItemId.value = 'new'
    actionError.value = ''
    try {
      const created = await libraryApi.save(payload)
      items.value = [created, ...items.value.filter((item) => item.id !== created.id)]
      return created
    } catch (error) {
      actionError.value = messageFor(error)
      return null
    } finally {
      busyItemId.value = ''
    }
  }

  async function removeItem(id: string): Promise<boolean> {
    busyItemId.value = id
    actionError.value = ''
    try {
      await libraryApi.delete(id)
      items.value = items.value.filter((item) => item.id !== id)
      return true
    } catch (error) {
      actionError.value = messageFor(error)
      return false
    } finally {
      busyItemId.value = ''
    }
  }

  watch([filterType, favoritesOnly], () => void load())
  watch(query, () => {
    if (searchTimer !== undefined) window.clearTimeout(searchTimer)
    searchTimer = window.setTimeout(() => {
      searchTimer = undefined
      void load()
    }, 280)
  })

  onScopeDispose(() => {
    requestId++
    if (searchTimer !== undefined) window.clearTimeout(searchTimer)
    controller?.abort()
  })

  return {
    items,
    query,
    filterType,
    favoritesOnly,
    recentOnly,
    loading,
    loadError,
    actionError,
    busyItemId,
    visibleItems,
    load,
    patchItem,
    toggleFavorite,
    saveItem,
    removeItem,
  }
}
