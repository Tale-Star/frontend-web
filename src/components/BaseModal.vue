<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import UiIcon from '@/components/UiIcon.vue'

defineProps<{ modelValue: boolean; title: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

function onEscape(event: KeyboardEvent): void {
  if (event.key === 'Escape') emit('update:modelValue', false)
}

onMounted(() => window.addEventListener('keydown', onEscape))
onUnmounted(() => window.removeEventListener('keydown', onEscape))
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
        class="modal-card"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
      >
        <header class="modal-header">
          <h2>{{ title }}</h2>
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
