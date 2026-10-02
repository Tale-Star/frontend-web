import { httpClient } from '@/api/HttpClient'
import type {
  GenerationJob,
  ImageGenerationRequest,
  MusicGenerationRequest,
} from '@/types/api'

export const generationApi = {
  createImage(payload: ImageGenerationRequest, signal?: AbortSignal): Promise<GenerationJob> {
    return httpClient.request<GenerationJob>('generations/images', {
      method: 'POST',
      body: payload,
      signal,
    })
  },
  createMusic(payload: MusicGenerationRequest): Promise<GenerationJob> {
    return httpClient.request<GenerationJob>('generations/music', {
      method: 'POST',
      body: payload,
    })
  },
  getJob(id: string, signal?: AbortSignal): Promise<GenerationJob> {
    return httpClient.request<GenerationJob>('generations/' + encodeURIComponent(id), { signal })
  },
}
