<script setup lang="ts">
import type { IconName } from '@/components/UiIcon.vue'
import UiIcon from '@/components/UiIcon.vue'

defineProps<{
  name: string
  description: string
  icon: IconName
  detail?: string
  busy?: boolean
}>()

const emit = defineEmits<{ edit: []; delete: [] }>()
</script>

<template>
  <article class="resource-card">
    <div class="resource-card-top">
      <div class="resource-card-icon">
        <UiIcon :name="icon" />
      </div>
      <div class="resource-card-copy">
        <strong :title="name">{{ name }}</strong>
        <p>{{ description || 'Sin descripción' }}</p>
        <small
          v-if="detail"
          class="form-hint"
        >{{ detail }}</small>
      </div>
    </div>
    <div class="resource-card-actions">
      <button
        class="button-icon"
        type="button"
        :disabled="busy"
        :aria-label="'Editar ' + name"
        @click="emit('edit')"
      >
        <UiIcon
          name="edit"
          :size="16"
        />
      </button>
      <button
        class="button-icon"
        type="button"
        :disabled="busy"
        :aria-label="'Eliminar ' + name"
        @click="emit('delete')"
      >
        <UiIcon
          name="trash"
          :size="16"
        />
      </button>
    </div>
  </article>
</template>
