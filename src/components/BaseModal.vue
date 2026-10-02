<script setup lang="ts">
import { nextTick, onUnmounted, ref, useId, watch } from 'vue'
import UiIcon from '@/components/UiIcon.vue'

const props = defineProps<{ modelValue: boolean; title: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
const dialog = ref<HTMLElement | null>(null)
const titleId = `modal-title-${useId()}`
let previousFocus: HTMLElement | null = null

function focusableElements(): HTMLElement[] {
  if (!dialog.value) return []
  return Array.from(dialog.value.querySelectorAll<HTMLElement>(
    'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
  )).filter((element) => !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true')
}

function onDialogKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('update:modelValue', false)
    return
  }
  if (event.key !== 'Tab') return
  const focusable = focusableElements()
  if (!focusable.length) {
    event.preventDefault()
    dialog.value?.focus()
    return
  }
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last?.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first?.focus()
  }
}

watch(() => props.modelValue, async (open) => {
  if (open) {
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    await nextTick()
    if (!props.modelValue) return
    document.addEventListener('keydown', onDialogKeydown)
    ;(focusableElements()[0] || dialog.value)?.focus()
  } else {
    document.removeEventListener('keydown', onDialogKeydown)
    if (previousFocus?.isConnected) previousFocus.focus()
    previousFocus = null
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', onDialogKeydown)
  if (previousFocus?.isConnected) previousFocus.focus()
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="modal-backdrop"
      role="presentation"
      @click.self="emit('update:modelValue', false)"
    >
      <section
        ref="dialog"
        class="modal-card"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        tabindex="-1"
      >
        <header class="modal-header">
          <h2 :id="titleId">
            {{ title }}
          </h2>
          <button
            class="button-icon"
            type="button"
            aria-label="Cerrar"
            @click="emit('update:modelValue', false)"
          >
            <UiIcon name="close" />
          </button>
        </header>
        <slot />
      </section>
    </div>
  </Teleport>
</template>
