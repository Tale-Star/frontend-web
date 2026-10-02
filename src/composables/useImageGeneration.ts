import { onScopeDispose, ref } from 'vue'
import { ApiError } from '@/api/HttpClient'
import { generationApi } from '@/api/generationApi'
import { mediaApi } from '@/api/mediaApi'
import type { GenerationJob, ImageGenerationRequest } from '@/types/api'

type GenerationCompletion = (job: GenerationJob, assetId: string, objectUrl: string) => void | Promise<void>

const POLL_INTERVAL_MS = 2500
const MAX_RETRIES = 8

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Tu sesión terminó. Inicia sesión otra vez para continuar.'
    if (error.status === 404) return 'El trabajo o el recurso ya no está disponible.'
    if (error.status === 409) return 'El backend no pudo aceptar el cambio por un conflicto.'
    if (error.status === 422) return 'Revisa los campos: el backend rechazó la solicitud.'
    return error.message
  }
  return error instanceof Error ? error.message : 'No se pudo completar la generación.'
}

export function useImageGeneration() {
  const job = ref<GenerationJob | null>(null)
  const assetUrl = ref('')
  const error = ref('')
  const submitting = ref(false)
  const polling = ref(false)

  let runId = 0
  let pollTimer: number | undefined
  let controller: AbortController | null = null
  let retryCount = 0
  let activeCompletion: GenerationCompletion | undefined

  function revokeAsset(): void {
    if (assetUrl.value) URL.revokeObjectURL(assetUrl.value)
    assetUrl.value = ''
  }

  function stopRun(): void {
    runId += 1
    if (pollTimer !== undefined) window.clearTimeout(pollTimer)
    pollTimer = undefined
    controller?.abort()
    controller = null
    polling.value = false
    submitting.value = false
  }

  function reset(): void {
    stopRun()
    job.value = null
    error.value = ''
    retryCount = 0
    revokeAsset()
  }

  function schedulePoll(targetRun: number, delay: number): void {
    if (targetRun !== runId || !controller) return
    if (pollTimer !== undefined) window.clearTimeout(pollTimer)
    pollTimer = window.setTimeout(() => {
      pollTimer = undefined
      void poll(targetRun)
    }, delay)
  }

  async function finishSucceeded(
    result: GenerationJob,
    targetRun: number,
    onComplete?: GenerationCompletion,
  ): Promise<void> {
    polling.value = false
    const assetId = result.result?.asset_id
    if (typeof assetId !== 'string' || !assetId) {
      error.value = 'El trabajo terminó correctamente, pero no contiene el asset_id esperado.'
      return
    }

    try {
      const objectUrl = await mediaApi.loadAssetById(assetId, controller?.signal)
      if (targetRun !== runId) {
        URL.revokeObjectURL(objectUrl)
        return
      }
      revokeAsset()
      assetUrl.value = objectUrl
      error.value = ''
      await onComplete?.(result, assetId, objectUrl)
    } catch (cause) {
      if (targetRun !== runId || (cause instanceof DOMException && cause.name === 'AbortError')) return
      error.value = errorMessage(cause)
    }
  }

  async function acceptJob(
    result: GenerationJob,
    targetRun: number,
    onComplete?: GenerationCompletion,
  ): Promise<void> {
    if (targetRun !== runId) return
    job.value = result

    if (result.status === 'Succeeded') {
      if (pollTimer !== undefined) window.clearTimeout(pollTimer)
      pollTimer = undefined
      await finishSucceeded(result, targetRun, onComplete)
      return
    }

    if (result.status === 'Failed') {
      polling.value = false
      error.value = result.error_message || 'El trabajo de imagen falló en el backend.'
      return
    }

    polling.value = true
    schedulePoll(targetRun, POLL_INTERVAL_MS)
  }

  async function poll(targetRun: number): Promise<void> {
    const currentJob = job.value
    if (targetRun !== runId || !controller || !currentJob) return

    try {
      const result = await generationApi.getJob(currentJob.id, controller.signal)
      if (targetRun !== runId) return
      retryCount = 0
      await acceptJob(result, targetRun, activeCompletion)
    } catch (cause) {
      if (targetRun !== runId || (cause instanceof DOMException && cause.name === 'AbortError')) return
      const retryable = !(cause instanceof ApiError)
        || cause.status === 0
        || cause.status === 429
        || cause.status >= 500
      if (!retryable) {
        polling.value = false
        error.value = errorMessage(cause)
        return
      }

      retryCount += 1
      if (retryCount > MAX_RETRIES) {
        polling.value = false
        error.value = 'No se pudo consultar el trabajo tras varios intentos. Puedes volver a generarlo.'
        return
      }
      polling.value = true
      const backoff = Math.min(15000, 1500 * 2 ** (retryCount - 1))
      schedulePoll(targetRun, backoff)
    }
  }

  async function generate(
    payload: ImageGenerationRequest,
    onComplete?: GenerationCompletion,
  ): Promise<GenerationJob | null> {
    if (submitting.value) return null
    stopRun()
    const currentRun = runId
    controller = new AbortController()
    retryCount = 0
    activeCompletion = onComplete
    error.value = ''
    job.value = null
    revokeAsset()
    submitting.value = true

    try {
      const created = await generationApi.createImage(payload, controller.signal)
      if (currentRun !== runId) return null
      job.value = created
      submitting.value = false
      await acceptJob(created, currentRun, onComplete)
      return created
    } catch (cause) {
      if (currentRun === runId && !(cause instanceof DOMException && cause.name === 'AbortError')) {
        error.value = errorMessage(cause)
      }
      return null
    } finally {
      if (currentRun === runId) submitting.value = false
    }
  }

  onScopeDispose(() => {
    stopRun()
    revokeAsset()
  })

  return { job, assetUrl, error, submitting, polling, generate, reset, cancel: stopRun }
}
