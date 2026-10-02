<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue'
import type { Character } from '@/types/api'

const props = withDefaults(defineProps<{
  modelValue: string
  characters: Character[]
  label: string
  id?: string
  placeholder?: string
  rows?: number
  maxlength?: number
  textareaClass?: string
}>(), {
  id: undefined,
  placeholder: '',
  rows: 3,
  maxlength: undefined,
  textareaClass: '',
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const generatedId = useId()
const textarea = ref<HTMLTextAreaElement | null>(null)
const currentValue = ref(props.modelValue)
const caret = ref(0)
const activeIndex = ref(0)
const mentionStart = ref<number | null>(null)
const query = ref('')
const listId = computed(() => `${props.id || generatedId}-suggestions`)
const suggestions = computed(() => {
  const prefix = query.value.trim().toLocaleLowerCase()
  return props.characters
    .filter((character) => character.name.toLocaleLowerCase().startsWith(prefix))
    .slice(0, 8)
})
const isOpen = computed(() => mentionStart.value !== null && suggestions.value.length > 0)

watch(() => props.modelValue, (value) => {
  currentValue.value = value
})

function inspectCaret(element: HTMLTextAreaElement): void {
  caret.value = element.selectionStart
  const beforeCaret = element.value.slice(0, caret.value)
  const match = beforeCaret.match(
    /(?:^|[^\p{L}\p{N}_])@([\p{L}\p{N}_ -]*[\p{L}\p{N}_])?$/u,
  )
  if (!match) {
    mentionStart.value = null
    query.value = ''
    activeIndex.value = 0
    return
  }
  mentionStart.value = beforeCaret.lastIndexOf('@')
  query.value = match[1] || ''
  activeIndex.value = 0
}

function handleInput(event: Event): void {
  const element = event.target as HTMLTextAreaElement
  currentValue.value = element.value
  emit('update:modelValue', element.value)
  inspectCaret(element)
}

function handleKeyup(event: KeyboardEvent): void {
  if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Tab'].includes(event.key)) return
  inspectCaret(event.target as HTMLTextAreaElement)
}

function handleKeydown(event: KeyboardEvent): void {
  if (!isOpen.value) return
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % suggestions.value.length
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    activeIndex.value = (activeIndex.value - 1 + suggestions.value.length) % suggestions.value.length
  } else if (event.key === 'Enter' || event.key === 'Tab') {
    if (event.key === 'Enter') event.preventDefault()
    choose(suggestions.value[activeIndex.value])
  } else if (event.key === 'Escape') {
    event.preventDefault()
    mentionStart.value = null
  }
}

async function choose(character?: Character): Promise<void> {
  if (!character || mentionStart.value === null) return
  const start = mentionStart.value
  const value = `${currentValue.value.slice(0, start)}@${character.name} ${currentValue.value.slice(caret.value)}`
  currentValue.value = value
  emit('update:modelValue', value)
  mentionStart.value = null
  await nextTick()
  const nextCaret = start + character.name.length + 2
  textarea.value?.focus()
  textarea.value?.setSelectionRange(nextCaret, nextCaret)
}
</script>

<template>
  <div class="character-mention">
    <textarea
      :id="id || `${generatedId}-textarea`"
      ref="textarea"
      :value="modelValue"
      :class="['form-control', textareaClass]"
      :rows="rows"
      :maxlength="maxlength"
      :placeholder="placeholder"
      :aria-label="label"
      aria-autocomplete="list"
      :aria-expanded="isOpen"
      :aria-controls="listId"
      :aria-activedescendant="isOpen ? `${listId}-${activeIndex}` : undefined"
      @input="handleInput"
      @click="inspectCaret($event.target as HTMLTextAreaElement)"
      @keyup="handleKeyup"
      @keydown="handleKeydown"
    />
    <div
      v-if="isOpen"
      :id="listId"
      class="mention-options"
      role="listbox"
      :aria-label="`Personajes para ${label}`"
    >
      <button
        v-for="(character, index) in suggestions"
        :id="`${listId}-${index}`"
        :key="character.id"
        class="mention-option"
        :class="{ active: index === activeIndex }"
        type="button"
        role="option"
        :aria-selected="index === activeIndex"
        @mousedown.prevent
        @click="choose(character)"
      >
        <span class="mention-at">@</span>
        <span>{{ character.name }}</span>
        <small>{{ character.description || character.visual_description || 'Personaje guardado' }}</small>
      </button>
    </div>
  </div>
</template>

<style scoped>
.character-mention {
  position: relative;
  width: 100%;
}

.mention-options {
  position: absolute;
  z-index: 30;
  top: calc(100% + 5px);
  left: 0;
  display: grid;
  width: min(100%, 360px);
  max-height: 240px;
  overflow: auto;
  padding: 5px;
  border: 1px solid rgba(116, 78, 255, 0.24);
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 14px 32px rgba(48, 34, 94, 0.18);
}

.mention-option {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 2px 7px;
  padding: 9px 10px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--text-1);
  cursor: pointer;
  text-align: left;
}

.mention-option:hover,
.mention-option.active {
  background: #eee9ff;
}

.mention-at {
  grid-row: span 2;
  color: var(--accent-strong);
  font-weight: 800;
}

.mention-option > span:nth-child(2) {
  font-size: 12px;
  font-weight: 750;
}

.mention-option small {
  overflow: hidden;
  color: var(--text-3);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
