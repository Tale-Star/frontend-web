import { httpClient } from '@/api/HttpClient'
import type {
  GenerationJob,
  ImageGenerationRequest,
  MusicGenerationRequest,
} from '@/types/api'

export const generationApi = {
  createImage(payload: ImageGenerationRequest): Promise<GenerationJob> {
    return httpClient.request<GenerationJob>('generations/images', {
      method: 'POST',
      body: payload,
    })
  },
  createMusic(payload: MusicGenerationRequest): Promise<GenerationJob> {
    return httpClient.request<GenerationJob>('generations/music', {
      method: 'POST',
      body: payload,
    })
  },
  getJob(id: string): Promise<GenerationJob> {
    return httpClient.request<GenerationJob>('generations/' + encodeURIComponent(id))
  },
}
