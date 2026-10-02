import { environment } from '@/config/env'
import { httpClient } from '@/api/HttpClient'

export const mediaApi = {
  async loadAsset(resourceUrl: string, signal?: AbortSignal): Promise<string> {
    const base = new URL(environment.apiBaseUrl)
    const assetPath = new URL(resourceUrl, base.origin).pathname
    const basePath = base.pathname.replace(/\/+$/, '')
    const endpoint = assetPath.startsWith(basePath)
      ? assetPath.slice(basePath.length)
      : assetPath
    const blob = await httpClient.getBlob(endpoint || assetPath, signal)
    return URL.createObjectURL(blob)
  },

  async loadAssetById(assetId: string, signal?: AbortSignal): Promise<string> {
    const blob = await httpClient.getBlob('media/assets/' + encodeURIComponent(assetId), signal)
    return URL.createObjectURL(blob)
  },
}
