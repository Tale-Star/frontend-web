<script setup lang="ts">
import { useId } from 'vue'

defineProps<{
  modelValue: string | number
  label: string
  type?: string
  placeholder?: string
  hint?: string
  required?: boolean
  minlength?: number
  maxlength?: number
  min?: number
  max?: number
  pattern?: string
  inputmode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search'
  autocomplete?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const inputId = useId()
</script>

<template>
  <div class="form-field">
    <label :for="inputId">{{ label }}</label>
    <input
      :id="inputId"
      class="form-control"
      :type="type || 'text'"
      :value="modelValue"
      :placeholder="placeholder"
      :required="required"
      :minlength="minlength"
      :maxlength="maxlength"
      :min="min"
      :max="max"
      :pattern="pattern"
      :inputmode="inputmode"
      :autocomplete="autocomplete"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    >
    <small
      v-if="hint"
      :id="inputId + '-hint'"
      class="form-hint"
    >{{ hint }}</small>
  </div>
</template>
