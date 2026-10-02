<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    size?: 'normal' | 'large'
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
  }>(),
  { variant: 'secondary', size: 'normal', type: 'button', disabled: false },
)
</script>

<template>
  <button
    class="button"
    :class="['button-' + variant, { 'button-large': size === 'large' }]"
    :type="type"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>
