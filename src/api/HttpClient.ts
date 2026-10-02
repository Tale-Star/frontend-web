import { environment } from '@/config/env'
import type { ErrorIssue, ErrorResponse } from '@/types/api'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly detail: string | ErrorIssue[] | null,
  ) {
    super(ApiError.toMessage(code, detail, status))
    this.name = 'ApiError'
  }

  private static toMessage(
    code: string,
    detail: string | ErrorIssue[] | null,
    status: number,
  ): string {
    if (typeof detail === 'string' && detail.length > 0) return detail
    if (Array.isArray(detail) && detail.length > 0) {
      return detail.map((issue) => issue.msg).join('. ')
    }
    if (status === 0) return 'No se pudo conectar con Tale Star API.'
    return code.replace(/_/g, ' ') || 'La solicitud no pudo completarse.'
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  headers?: HeadersInit
  signal?: AbortSignal
}

type TokenProvider = () => string | null

export class HttpClient {
  private tokenProvider: TokenProvider = () => null

  constructor(private readonly baseUrl: string = environment.apiBaseUrl) {}

  setTokenProvider(provider: TokenProvider): void {
    this.tokenProvider = provider
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await this.fetch(path, options)
    if (response.status === 204) return undefined as T
    const contentType = response.headers.get('content-type') || ''
    const payload = contentType.includes('application/json')
      ? ((await response.json()) as T)
      : ((await response.text()) as T)
    return payload
  }

  async getBlob(path: string, signal?: AbortSignal): Promise<Blob> {
    const response = await this.fetch(path, { method: 'GET', signal })
    return response.blob()
  }

  private async fetch(path: string, options: RequestOptions): Promise<Response> {
    const url = this.makeUrl(path)
    const headers = new Headers(options.headers)
    headers.set('Accept', 'application/json')
    const token = this.tokenProvider()
    if (token) headers.set('Authorization', 'Bearer ' + token)
    let body: BodyInit | undefined
    if (options.body !== undefined) {
      headers.set('Content-Type', 'application/json')
      body = JSON.stringify(options.body)
    }

    let response: Response
    try {
      response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body,
        signal: options.signal,
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error
      const networkError = new ApiError(0, 'network_error', null)
      this.notifyFailure(networkError, path)
      throw networkError
    }

    if (!response.ok) {
      const apiError = await HttpClient.readError(response)
      this.notifyFailure(apiError, path)
      throw apiError
    }
    return response
  }

  private makeUrl(path: string): string {
    if (/^https?:\/\//i.test(path)) return path
    return this.baseUrl + '/' + path.replace(/^\/+/, '')
  }

  private static async readError(response: Response): Promise<ApiError> {
    let payload: Partial<ErrorResponse> | null = null
    try {
      payload = (await response.json()) as Partial<ErrorResponse>
    } catch {
      payload = null
    }
    const envelope = payload?.error
    return new ApiError(
      response.status,
      typeof envelope?.code === 'string' ? envelope.code : 'http_' + response.status,
      typeof envelope?.message === 'string' || Array.isArray(envelope?.message)
        ? envelope.message
        : null,
    )
  }

  private notifyFailure(error: ApiError, path: string): void {
    if (typeof window === 'undefined') return
    if (error.status === 401) {
      const endpoint = path.split('?')[0]?.replace(/^\/+/, '')
      const rejectedCurrentPassword = endpoint === 'auth/parental-pin' && error.code === 'invalid_credentials'
      window.dispatchEvent(new CustomEvent(
        rejectedCurrentPassword ? 'talestar:api-error' : 'talestar:unauthorized',
        { detail: error },
      ))
    } else {
      window.dispatchEvent(new CustomEvent('talestar:api-error', { detail: error }))
    }
  }
}

export const httpClient = new HttpClient()
