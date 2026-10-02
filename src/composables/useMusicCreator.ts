import { computed, onScopeDispose, reactive, ref } from 'vue'
import { ApiError } from '@/api/HttpClient'
import { generationApi } from '@/api/generationApi'
import { libraryApi } from '@/api/libraryApi'
import { mediaApi } from '@/api/mediaApi'
import { useNoticesStore } from '@/stores/notices'
import type { GenerationJob, MusicGenerationRequest, MusicSectionRequest } from '@/types/api'

type MusicTagKey = 'Genre' | 'Mood' | 'Instruments' | 'Production'

const MAX_TAGS = 50
const MAX_POLL_RETRIES = 8

function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Tu sesión terminó. Inicia sesión otra vez para continuar.'
    if (error.status === 404) return 'El trabajo o el recurso de audio ya no está disponible.'
    if (error.status === 409) return 'Ese audio ya está guardado en tu biblioteca.'
    if (error.status === 422) return `El backend rechazó algunos campos: ${error.message}`
    return error.message
  }
  return error instanceof Error ? error.message : 'No se pudo completar la solicitud musical.'
}

function tagValues(value: string[]): string[] {
  return value.map((item) => item.trim()).filter(Boolean)
}

export function useMusicCreator() {
  const notices = useNoticesStore()
  const form = reactive({
    caption: '',
    duration: '120',
    bpm: '120',
    voice: '',
    language: 'Español' as MusicGenerationRequest['Language'],
    output: 'song' as MusicGenerationRequest['Output'],
    seed: '',
  })
  const tags = reactive<Record<MusicTagKey, string[]>>({
    Genre: [],
    Mood: [],
    Instruments: [],
    Production: [],
  })
  const tagDrafts = reactive<Record<MusicTagKey, string>>({
    Genre: '',
    Mood: '',
    Instruments: '',
    Production: '',
  })
  const sections = ref<MusicSectionRequest[]>([])
  const job = ref<GenerationJob | null>(null)
  const assetUrl = ref('')
  const error = ref('')
  const saveError = ref('')
  const submitting = ref(false)
  const polling = ref(false)
  const loadingAsset = ref(false)
  const saving = ref(false)

  let runId = 0
  let pollTimer: number | undefined
  let controller: AbortController | null = null
  let retryCount = 0
  let pollRequestInFlight = false

  const active = computed(() => submitting.value || polling.value || loadingAsset.value)
  const builtCaption = computed(() => {
    const parts: string[] = []
    if (form.caption.trim()) parts.push(form.caption.trim())
    for (const [key, label] of [
      ['Genre', 'Genre'],
      ['Mood', 'Mood'],
      ['Instruments', 'Instruments'],
      ['Production', 'Production'],
    ] as const) {
      const values = tagValues(tags[key])
      if (values.length) parts.push(`${label}: ${values.join(', ')}`)
    }
    if (form.voice.trim()) parts.push(`Vocal direction: ${form.voice.trim()}`)
    return parts.join('; ').slice(0, 512) || 'Tale Star original music'
  })

  const builtLyrics = computed(() => {
    if (form.output === 'instrumental') return '[Instrumental]'
    const rows = sections.value.flatMap((section) => {
      const text = section.Text.trim()
      if (!text) return []
      const type = section.Type.trim() || 'Verse'
      const modifier = section.Modifier.trim()
      return [`[${modifier ? `${type}: ${modifier}` : type}]\n${text}`]
    })
    return rows.join('\n\n').slice(0, 4096)
  })

  const jobStatusLabel = computed(() => {
    switch (job.value?.status) {
      case 'Pending': return 'En cola'
      case 'Processing': return 'Procesando'
      case 'Succeeded': return 'Completada'
      case 'Failed': return 'Fallida'
      default: return 'Aún no generada'
    }
  })

  const result = computed(() => job.value?.result)
  const assetId = computed(() => {
    const value = result.value?.asset_id
    return typeof value === 'string' && value ? value : ''
  })
  const resultDuration = computed(() => {
    const value = result.value?.duration
    return typeof value === 'number' && Number.isFinite(value) ? value : null
  })
  const resultBpm = computed(() => {
    const value = result.value?.bpm
    return typeof value === 'number' && Number.isFinite(value) ? value : null
  })
  const resultLanguage = computed(() => {
    const value = result.value?.language
    return typeof value === 'string' ? value : ''
  })
  const resultExtension = computed(() => {
    const value = result.value?.extension
    return typeof value === 'string' ? value : ''
  })
  const resultMediaType = computed(() => {
    const value = result.value?.media_type
    return typeof value === 'string' ? value : ''
  })
  const resultOutput = computed(() => job.value?.payload.Output)
  const resultSeed = computed(() => {
    const value = result.value?.seed
    return typeof value === 'number' && Number.isFinite(value) ? value : null
  })

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
    pollRequestInFlight = false
    polling.value = false
    submitting.value = false
    loadingAsset.value = false
  }

  function schedulePoll(targetRun: number, delayMs: number): void {
    if (targetRun !== runId || !controller || controller.signal.aborted) return
    if (pollTimer !== undefined) window.clearTimeout(pollTimer)
    pollTimer = window.setTimeout(() => {
      pollTimer = undefined
      void poll(targetRun)
    }, delayMs)
  }

  async function acceptJob(updated: GenerationJob, targetRun: number): Promise<void> {
    if (targetRun !== runId) return
    job.value = updated

    if (updated.status === 'Succeeded') {
      polling.value = false
      if (pollTimer !== undefined) window.clearTimeout(pollTimer)
      pollTimer = undefined
      if (!assetId.value) {
        error.value = 'El backend completó el trabajo sin devolver el asset_id del audio.'
        return
      }
      loadingAsset.value = true
      try {
        const nextUrl = await mediaApi.loadAssetById(assetId.value, controller?.signal)
        if (targetRun !== runId) {
          URL.revokeObjectURL(nextUrl)
          return
        }
        revokeAsset()
        assetUrl.value = nextUrl
        error.value = ''
        notices.push('La música está lista para reproducirse.')
      } catch (cause) {
        if (targetRun !== runId || (cause instanceof DOMException && cause.name === 'AbortError')) return
        error.value = messageFor(cause)
      } finally {
        if (targetRun === runId) loadingAsset.value = false
      }
      return
    }

    if (updated.status === 'Failed') {
      polling.value = false
      error.value = updated.error_message || 'El trabajo musical falló en el backend.'
      return
    }

    polling.value = true
    schedulePoll(targetRun, 2500)
  }

  async function poll(targetRun: number): Promise<void> {
    const current = job.value
    if (targetRun !== runId || !controller || !current || pollRequestInFlight) return
    pollRequestInFlight = true
    try {
      const updated = await generationApi.getJob(current.id, controller.signal)
      if (targetRun !== runId) return
      retryCount = 0
      await acceptJob(updated, targetRun)
    } catch (cause) {
      if (targetRun !== runId || (cause instanceof DOMException && cause.name === 'AbortError')) return
      const retryable = !(cause instanceof ApiError)
        || cause.status === 0
        || cause.status === 429
        || cause.status >= 500
      if (!retryable) {
        polling.value = false
        error.value = messageFor(cause)
        return
      }
      retryCount += 1
      if (retryCount > MAX_POLL_RETRIES) {
        polling.value = false
        error.value = 'No se pudo consultar el trabajo tras varios intentos. Puedes volver a generarlo.'
        return
      }
      polling.value = true
      schedulePoll(targetRun, Math.min(15000, 1500 * 2 ** (retryCount - 1)))
    } finally {
      pollRequestInFlight = false
    }
  }

  function parseRequest(): MusicGenerationRequest | null {
    const duration = Number(form.duration)
    const bpm = Number(form.bpm)
    if (!Number.isInteger(duration) || duration < 10 || duration > 600) {
      error.value = 'La duración debe ser un entero entre 10 y 600 segundos.'
      return null
    }
    if (!Number.isInteger(bpm) || bpm < 30 || bpm > 300) {
      error.value = 'El BPM debe ser un entero entre 30 y 300.'
      return null
    }
    if (form.caption.length > 4000 || form.voice.length > 100) {
      error.value = 'Revisa la longitud máxima de caption y tipo de voz.'
      return null
    }
    const seedValue = form.seed.trim() ? Number(form.seed) : null
    if (seedValue !== null && (!Number.isInteger(seedValue) || seedValue < 0 || seedValue > 4_294_967_295)) {
      error.value = 'La seed debe ser un entero entre 0 y 4294967295.'
      return null
    }
    if (Object.values(tags).some((values) => values.length > MAX_TAGS)) {
      error.value = 'El backend admite hasta 50 valores en cada grupo musical.'
      return null
    }
    if (sections.value.length > MAX_TAGS) {
      error.value = 'El backend admite hasta 50 secciones musicales.'
      return null
    }
    if (sections.value.some((section) =>
      section.Type.length > 100 || section.Modifier.length > 300 || section.Text.length > 2000,
    )) {
      error.value = 'Revisa los límites de tipo, modificador y letra de cada sección.'
      return null
    }

    return {
      Caption: form.caption,
      Duration: duration,
      Bpm: bpm,
      Voice: form.voice,
      Language: form.language,
      Output: form.output,
      Genre: tagValues(tags.Genre),
      Mood: tagValues(tags.Mood),
      Instruments: tagValues(tags.Instruments),
      Production: tagValues(tags.Production),
      Sections: sections.value.map((section) => ({ ...section })),
      Seed: seedValue,
    }
  }

  async function generate(): Promise<void> {
    if (submitting.value || polling.value || loadingAsset.value) return
    const payload = parseRequest()
    if (!payload) return

    stopRun()
    const targetRun = runId
    controller = new AbortController()
    retryCount = 0
    pollRequestInFlight = false
    error.value = ''
    saveError.value = ''
    job.value = null
    revokeAsset()
    submitting.value = true
    try {
      const created = await generationApi.createMusic(payload, controller.signal)
      if (targetRun !== runId) return
      job.value = created
      notices.push('La solicitud musical fue aceptada por el backend.')
      await acceptJob(created, targetRun)
    } catch (cause) {
      if (targetRun === runId && !(cause instanceof DOMException && cause.name === 'AbortError')) {
        error.value = messageFor(cause)
      }
    } finally {
      if (targetRun === runId) submitting.value = false
    }
  }

  function resumePolling(): void {
    if (!job.value || !['Pending', 'Processing'].includes(job.value.status) || polling.value) return
    if (!controller || controller.signal.aborted) controller = new AbortController()
    error.value = ''
    retryCount = 0
    polling.value = true
    schedulePoll(runId, 0)
  }

  function addTag(key: MusicTagKey, value = tagDrafts[key]): void {
    const candidates = value.split(',').map((item) => item.trim()).filter(Boolean)
    for (const candidate of candidates) {
      const exists = tags[key].some((item) => item.toLocaleLowerCase() === candidate.toLocaleLowerCase())
      if (!exists && tags[key].length < MAX_TAGS) tags[key].push(candidate)
    }
    tagDrafts[key] = ''
  }

  function onTagKeydown(key: MusicTagKey, event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addTag(key)
    }
  }

  function removeTag(key: MusicTagKey, index: number): void {
    tags[key].splice(index, 1)
  }

  function addSection(type = ''): void {
    if (sections.value.length >= MAX_TAGS) return
    sections.value.push({ Type: type, Modifier: '', Text: '' })
  }

  function removeSection(index: number): void {
    sections.value.splice(index, 1)
  }

  function moveSection(index: number, direction: -1 | 1): void {
    const target = index + direction
    if (target < 0 || target >= sections.value.length) return
    const [section] = sections.value.splice(index, 1)
    if (!section) return
    sections.value.splice(target, 0, section)
  }

  async function saveToLibrary(): Promise<void> {
    if (!assetId.value || !assetUrl.value || saving.value) return
    saving.value = true
    saveError.value = ''
    try {
      const name = form.caption.trim().slice(0, 200) || builtCaption.value.slice(0, 200) || 'Música generada'
      await libraryApi.save({
        type: 'music',
        resource_id: assetId.value,
        name,
        description: builtCaption.value,
      })
      notices.push('Música guardada en tu biblioteca.')
    } catch (cause) {
      saveError.value = messageFor(cause)
    } finally {
      saving.value = false
    }
  }

  function downloadAudio(): void {
    if (!assetUrl.value) return
    const extension = resultExtension.value
    const suffix = /^\.[a-z0-9]{1,10}$/i.test(extension) ? extension : ''
    const anchor = document.createElement('a')
    anchor.href = assetUrl.value
    anchor.download = 'tale-star-music' + suffix
    anchor.click()
  }

  onScopeDispose(() => {
    stopRun()
    revokeAsset()
  })

  return {
    form,
    tags,
    tagDrafts,
    sections,
    job,
    assetUrl,
    assetId,
    error,
    saveError,
    submitting,
    polling,
    loadingAsset,
    saving,
    active,
    builtCaption,
    builtLyrics,
    jobStatusLabel,
    resultDuration,
    resultBpm,
    resultLanguage,
    resultExtension,
    resultMediaType,
    resultOutput,
    resultSeed,
    generate,
    resumePolling,
    addTag,
    onTagKeydown,
    removeTag,
    addSection,
    removeSection,
    moveSection,
    saveToLibrary,
    downloadAudio,
  }
}
