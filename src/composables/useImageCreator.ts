import { computed, onScopeDispose, reactive, ref } from 'vue'
import { ApiError } from '@/api/HttpClient'
import { libraryApi } from '@/api/libraryApi'
import { resourcesApi } from '@/api/resourcesApi'
import { useImageGeneration } from '@/composables/useImageGeneration'
import { useNoticesStore } from '@/stores/notices'
import type { Character, Scenario, StyleProfile } from '@/types/api'

function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Tu sesión terminó. Inicia sesión otra vez para continuar.'
    if (error.status === 404) return 'El recurso solicitado ya no existe.'
    if (error.status === 409) return 'Este recurso ya está guardado en tu biblioteca.'
    if (error.status === 422) return 'Revisa los campos: el backend rechazó la solicitud.'
    return error.message
  }
  return error instanceof Error ? error.message : 'No se pudo completar la acción.'
}

export function useImageCreator() {
  const notices = useNoticesStore()
  const characters = ref<Character[]>([])
  const scenarios = ref<Scenario[]>([])
  const styles = ref<StyleProfile[]>([])
  const selectedCharacters = ref<string[]>([])
  const objects = ref<string[]>([])
  const objectEntry = ref('')
  const loadingResources = ref(true)
  const resourceError = ref('')
  const mode = ref<'guided' | 'free'>('guided')
  const savingToLibrary = ref(false)
  const saveError = ref('')
  const form = reactive({
    action: '',
    emotion: '',
    scenarioId: '',
    moment: '',
    styleId: '',
    freePrompt: '',
    extra: '',
    seed: '',
  })
  const generation = useImageGeneration()
  let resourceController: AbortController | null = null

  const selectedScenario = computed(() => scenarios.value.find((row) => row.id === form.scenarioId))
  const selectedStyle = computed(() => styles.value.find((row) => row.id === form.styleId))
  const selectedCharacterNames = computed(() =>
    characters.value
      .filter((row) => selectedCharacters.value.includes(row.id))
      .map((row) => row.name),
  )
  const scenarioOptions = computed(() => scenarios.value.map((row) => ({ label: row.name, value: row.id })))
  const styleOptions = computed(() => styles.value.map((row) => ({ label: row.name, value: row.id })))
  const builtPrompt = computed(() => {
    const parts = mode.value === 'free'
      ? [form.freePrompt.trim(), form.extra.trim()]
      : [
          selectedCharacterNames.value.join(', '),
          form.action.trim(),
          form.emotion.trim(),
          selectedScenario.value?.name || '',
          form.moment.trim(),
          objects.value.join(', '),
          selectedStyle.value?.name || '',
          form.extra.trim(),
        ]
    return parts.filter(Boolean).join(' · ')
  })
  const hasGeneratedImage = computed(() => Boolean(generation.assetUrl.value))
  const jobStatusLabel = computed(() => {
    switch (generation.job.value?.status) {
      case 'Pending': return 'En cola'
      case 'Processing': return 'Generando'
      case 'Succeeded': return 'Lista'
      case 'Failed': return 'Fallida'
      default: return 'Tu resultado aparecerá aquí'
    }
  })

  async function loadResources(): Promise<void> {
    resourceController?.abort()
    const controller = new AbortController()
    resourceController = controller
    loadingResources.value = true
    resourceError.value = ''
    try {
      const [characterRows, scenarioRows, styleRows] = await Promise.all([
        resourcesApi.listCharacters(undefined, controller.signal),
        resourcesApi.listScenarios(undefined, controller.signal),
        resourcesApi.listStyleProfiles(undefined, controller.signal),
      ])
      if (controller.signal.aborted) return
      characters.value = characterRows
      scenarios.value = scenarioRows
      styles.value = styleRows
    } catch (error) {
      if (controller.signal.aborted) return
      resourceError.value = messageFor(error)
    } finally {
      if (!controller.signal.aborted) loadingResources.value = false
    }
  }

  function toggleCharacter(id: string): void {
    if (selectedCharacters.value.includes(id)) {
      selectedCharacters.value = selectedCharacters.value.filter((value) => value !== id)
    } else if (selectedCharacters.value.length < 50) {
      selectedCharacters.value = [...selectedCharacters.value, id]
    }
  }

  function addObject(value = objectEntry.value): void {
    const candidate = value.trim().replace(/,$/, '').trim()
    if (!candidate || objects.value.some((item) => item.toLocaleLowerCase() === candidate.toLocaleLowerCase())) {
      objectEntry.value = ''
      return
    }
    if (objects.value.length >= 50) {
      generation.error.value = 'El backend admite hasta 50 objetos por imagen.'
      return
    }
    objects.value = [...objects.value, candidate]
    objectEntry.value = ''
  }

  function removeObject(index: number): void {
    objects.value = objects.value.filter((_, itemIndex) => itemIndex !== index)
  }

  function handleObjectKey(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addObject()
    }
  }

  function parseSeed(): number | null | undefined {
    if (!form.seed.trim()) return null
    const value = Number(form.seed)
    return Number.isInteger(value) && value >= 0 && value <= 4_294_967_295 ? value : undefined
  }

  async function generate(): Promise<void> {
    const seed = parseSeed()
    if (seed === undefined) {
      generation.error.value = 'La seed debe ser un entero entre 0 y 4294967295.'
      return
    }
    if (selectedCharacters.value.length > 50 || objects.value.length > 50) {
      generation.error.value = 'Selecciona como máximo 50 personajes y 50 objetos.'
      return
    }
    saveError.value = ''
    const guided = mode.value === 'guided'
    await generation.generate({
      Action: guided ? form.action : '',
      Emotion: guided ? form.emotion : '',
      Scene: guided ? selectedScenario.value?.visual_description || selectedScenario.value?.name || '' : '',
      Moment: guided ? form.moment : '',
      Extra: form.extra,
      FreePrompt: form.freePrompt,
      Style: guided ? selectedStyle.value?.name || '' : '',
      Characters: guided ? selectedCharacterNames.value : [],
      Objects: guided ? [...objects.value] : [],
      Seed: seed,
    }, () => notices.push('La imagen está lista.'))
    if (generation.job.value && ['Pending', 'Processing'].includes(generation.job.value.status)) {
      notices.push('La solicitud quedó en la cola de generación.')
    }
  }

  async function saveToLibrary(): Promise<void> {
    const assetId = generation.job.value?.result?.asset_id
    if (typeof assetId !== 'string' || !generation.assetUrl.value) return
    savingToLibrary.value = true
    saveError.value = ''
    try {
      await libraryApi.save({
        type: 'image',
        resource_id: assetId,
        name: form.action.trim() || form.freePrompt.trim().slice(0, 200) || 'Imagen generada',
        description: builtPrompt.value,
      })
      notices.push('Imagen guardada en tu biblioteca.')
    } catch (error) {
      saveError.value = messageFor(error)
    } finally {
      savingToLibrary.value = false
    }
  }

  function downloadImage(): void {
    if (!generation.assetUrl.value) return
    const extension = generation.job.value?.result?.extension
    const safeExtension = typeof extension === 'string' && /^\.[a-z0-9]{1,10}$/i.test(extension)
      ? extension
      : '.png'
    const anchor = document.createElement('a')
    anchor.href = generation.assetUrl.value
    anchor.download = 'tale-star-image' + safeExtension
    anchor.click()
  }

  async function copyPrompt(): Promise<void> {
    if (!builtPrompt.value) return
    await navigator.clipboard.writeText(builtPrompt.value)
    notices.push('Prompt copiado.')
  }

  onScopeDispose(() => resourceController?.abort())

  return {
    characters, scenarios, styles, selectedCharacters, objects, objectEntry, loadingResources,
    resourceError, mode, form, generation, savingToLibrary, saveError, selectedScenario,
    selectedStyle, selectedCharacterNames, scenarioOptions, styleOptions, builtPrompt,
    hasGeneratedImage, jobStatusLabel, loadResources, toggleCharacter, addObject,
    removeObject, handleObjectKey, generate, saveToLibrary, downloadImage, copyPrompt,
  }
}
