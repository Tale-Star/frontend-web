<script setup lang="ts">
import { useId } from 'vue'

withDefaults(
  defineProps<{
    modelValue: string
    label: string
    options: Array<{ label: string; value: string }>
    placeholder?: string
  }>(),
  { placeholder: 'Selecciona una opción' },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const selectId = useId()
</script>

<template>
  <div class="form-field">
    <label :for="selectId">{{ label }}</label>
    <select
      :id="selectId"
      class="form-control"
      :value="modelValue"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option value="">
        {{ placeholder }}
      </option>
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
  </div>
</template>
