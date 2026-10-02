<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { mediaApi } from '@/api/mediaApi'
import type { LibraryItemType } from '@/types/api'
import UiIcon, { type IconName } from '@/components/UiIcon.vue'

const props = defineProps<{
  resourceUrl: string
  type: LibraryItemType
  mediaType: string | null
}>()

const source = ref('')
let requestIndex = 0

async function load(): Promise<void> {
  const index = ++requestIndex
  if (source.value) URL.revokeObjectURL(source.value)
  source.value = ''
  if (props.type !== 'image') return
  try {
    const url = await mediaApi.loadAsset(props.resourceUrl)
    if (index !== requestIndex) {
      URL.revokeObjectURL(url)
      return
    }
    source.value = url
  } catch {
    source.value = ''
  }
}

const iconName = ref<IconName>('images')
watch(
  () => props.type,
  (type) => {
    iconName.value = type === 'music' ? 'music' : type === 'story' ? 'stories' : 'images'
  },
  { immediate: true },
)

watch(() => props.resourceUrl, load)
watch(() => props.type, load)
onMounted(load)
onUnmounted(() => {
  requestIndex++
  if (source.value) URL.revokeObjectURL(source.value)
})
</script>

<template>
  <div class="library-thumb">
    <img
      v-if="source && type === 'image'"
      :src="source"
      alt=""
    >
    <UiIcon
      v-else
      :name="iconName"
      :size="23"
    />
  </div>
</template>
