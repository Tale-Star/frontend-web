<script setup lang="ts">
import MediaThumbnail from '@/components/MediaThumbnail.vue'
import type { LibraryItem, LibraryItemType } from '@/types/api'

defineProps<{ item: LibraryItem }>()
const emit = defineEmits<{ open: [] }>()

const typeLabels: Record<LibraryItemType, string> = {
  image: 'Imagen',
  story: 'Cuento',
  music: 'Música',
}
</script>

<template>
  <button
    class="child-card"
    type="button"
    @click="emit('open')"
  >
    <span class="child-card-art">
      <MediaThumbnail
        :resource-url="item.resource_url"
        :type="item.type"
        :media-type="item.media_type"
      />
    </span>
    <span class="child-card-title">{{ item.name }}</span>
    <span class="child-card-type">{{ typeLabels[item.type] }}</span>
  </button>
</template>

<style scoped>
.child-card { display: grid; gap: 8px; min-width: 0; padding: 0 0 12px; overflow: hidden; border: 1px solid rgba(255,255,255,.7); border-radius: 18px; background: rgba(255,255,255,.72); box-shadow: 0 9px 24px rgba(60,40,140,.1); text-align: left; cursor: pointer; transition: transform .18s ease, box-shadow .18s ease; }
.child-card:hover { transform: translateY(-3px); box-shadow: 0 14px 30px rgba(60,40,140,.16); }
.child-card:focus-visible { outline: 3px solid rgba(116,84,253,.5); outline-offset: 3px; }
.child-card-art { display: block; aspect-ratio: 1; overflow: hidden; border-radius: 16px 16px 0 0; background: linear-gradient(145deg,#a785ff,#6847f2 65%,#342078); }
.child-card-art :deep(.library-thumb) { width: 100%; height: 100%; aspect-ratio: auto; border-radius: 0; background: linear-gradient(145deg,#a785ff,#6847f2 65%,#342078); color: #fff; }
.child-card-art :deep(.library-thumb .ui-icon) { width: 38px; height: 38px; }
.child-card-title { padding: 0 12px; overflow: hidden; color: var(--text); font-size: 12px; font-weight: 750; text-overflow: ellipsis; white-space: nowrap; }
.child-card-type { padding: 0 12px; color: var(--accent); font-size: 9px; font-weight: 700; }
</style>
