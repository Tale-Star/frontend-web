import { httpClient } from '@/api/HttpClient'
import type {
  LibraryItem,
  LibraryItemCreateRequest,
  LibraryItemPatchRequest,
  LibraryItemType,
} from '@/types/api'

export interface LibraryFilters {
  type?: LibraryItemType
  q?: string
  favorite?: boolean
}

export const libraryApi = {
  list(filters: LibraryFilters = {}): Promise<LibraryItem[]> {
    const params = new URLSearchParams()
    if (filters.type) params.set('type', filters.type)
    if (filters.q?.trim()) params.set('q', filters.q.trim())
    if (filters.favorite !== undefined) params.set('favorite', String(filters.favorite))
    const query = params.toString()
    return httpClient.request<LibraryItem[]>('library' + (query ? '?' + query : ''))
  },
  save(payload: LibraryItemCreateRequest): Promise<LibraryItem> {
    return httpClient.request<LibraryItem>('library', { method: 'POST', body: payload })
  },
  patch(id: string, payload: LibraryItemPatchRequest): Promise<LibraryItem> {
    return httpClient.request<LibraryItem>('library/' + encodeURIComponent(id), {
      method: 'PATCH',
      body: payload,
    })
  },
  delete(id: string): Promise<void> {
    return httpClient.request<void>('library/' + encodeURIComponent(id), { method: 'DELETE' })
  },
}
