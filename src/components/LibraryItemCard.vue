<script setup lang="ts">
import { ref } from 'vue'
import MediaThumbnail from '@/components/MediaThumbnail.vue'
import UiIcon from '@/components/UiIcon.vue'
import type { LibraryItem, LibraryItemType } from '@/types/api'

defineProps<{ item: LibraryItem; busy?: boolean }>()
const emit = defineEmits<{
  open: []
  favorite: []
  edit: []
  editStory: []
  remove: []
}>()
const menu = ref<HTMLDetailsElement | null>(null)

const typeLabels: Record<LibraryItemType, string> = {
  image: 'Imagen',
  story: 'Cuento',
  music: 'Música',
}

function emitMenu(action: 'edit' | 'editStory' | 'remove' | 'open'): void {
  menu.value?.removeAttribute('open')
  if (action === 'edit') emit('edit')
  else if (action === 'editStory') emit('editStory')
  else if (action === 'remove') emit('remove')
  else emit('open')
}

function dateLabel(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Fecha no disponible' : date.toLocaleDateString()
}
</script>

<template>
  <article class="creation-card">
    <div class="creation-cover-wrap">
      <button
        class="creation-cover"
        type="button"
        :aria-label="'Abrir ' + item.name"
        @click="emit('open')"
      >
        <MediaThumbnail
          :resource-url="item.resource_url"
          :type="item.type"
          :media-type="item.media_type"
        />
        <span class="cover-type">{{ typeLabels[item.type] }}</span>
      </button>
      <button
        class="favorite-toggle"
        type="button"
        :disabled="busy"
        :aria-label="item.favorite ? 'Quitar de favoritos' : 'Marcar favorito'"
        :aria-pressed="item.favorite"
        @click="emit('favorite')"
      >
        <UiIcon
          name="heart"
          :size="15"
        />
      </button>
    </div>
    <div class="creation-card-footer">
      <div class="creation-copy">
        <button
          class="creation-title"
          type="button"
          @click="emit('open')"
        >
          {{ item.name }}
        </button>
        <small>{{ typeLabels[item.type].toUpperCase() }} · {{ dateLabel(item.created_at) }}</small>
      </div>
      <details
        ref="menu"
        class="creation-menu"
      >
        <summary :aria-label="'Acciones para ' + item.name">
          •••
        </summary>
        <div class="creation-menu-popover">
          <button
            type="button"
            @click="emitMenu('open')"
          >
            Abrir vista previa
          </button>
          <button
            type="button"
            @click="emitMenu('edit')"
          >
            Editar datos
          </button>
          <button
            v-if="item.type === 'story'"
            type="button"
            @click="emitMenu('editStory')"
          >
            Editar cuento
          </button>
          <button
            type="button"
            @click="emitMenu('remove')"
          >
            Quitar de biblioteca
          </button>
        </div>
      </details>
    </div>
    <p
      v-if="item.description"
      class="creation-description"
    >
      {{ item.description }}
    </p>
  </article>
</template>

<style scoped>
.creation-card { position: relative; min-width: 0; overflow: visible; }
.creation-cover-wrap { position: relative; overflow: hidden; border: 1px solid rgba(255,255,255,.72); border-radius: 17px; background: linear-gradient(145deg,#a785ff,#6847f2 65%,#342078); box-shadow: 0 7px 24px rgba(59,39,139,.11); }
.creation-cover { position: relative; display: grid; width: 100%; aspect-ratio: .82; overflow: hidden; place-items: center; padding: 0; border: 0; background: transparent; color: white; cursor: pointer; }
.creation-cover :deep(.library-thumb) { width: 100%; height: 100%; aspect-ratio: auto; border-radius: 0; background: linear-gradient(145deg,#a785ff,#6847f2 65%,#342078); color: white; }
.creation-cover :deep(.library-thumb .ui-icon) { width: 52px; height: 52px; filter: drop-shadow(0 5px 12px rgba(255,255,255,.18)); }
.creation-cover :deep(.library-thumb img) { position: relative; z-index: 1; transition: transform .3s ease; }
.creation-cover:hover :deep(.library-thumb img) { transform: scale(1.035); }
.cover-type { position: absolute; right: 10px; bottom: 10px; z-index: 2; padding: 5px 8px; border: 1px solid rgba(255,255,255,.25); border-radius: 999px; background: rgba(25,19,57,.42); color: white; font-size: 8px; font-weight: 700; backdrop-filter: blur(8px); }
.favorite-toggle { position: absolute; top: 10px; left: 10px; z-index: 3; display: grid; width: 31px; height: 31px; place-items: center; border: 1px solid rgba(255,255,255,.34); border-radius: 10px; background: rgba(33,25,75,.34); color: white; cursor: pointer; backdrop-filter: blur(9px); }
.favorite-toggle[aria-pressed="true"] { background: rgba(62,40,141,.78); color: #fff; }
.favorite-toggle:hover:not(:disabled) { transform: scale(1.05); }
.favorite-toggle:disabled { opacity: .55; cursor: wait; }
.creation-card-footer { display: flex; align-items: flex-start; justify-content: space-between; gap: 6px; padding: 9px 2px 0; }
.creation-copy { min-width: 0; }
.creation-title { display: block; max-width: 100%; overflow: hidden; padding: 0; border: 0; background: transparent; color: var(--text); font-size: 10px; font-weight: 750; text-align: left; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
.creation-title:hover { color: var(--accent); }
.creation-copy small { display: block; margin-top: 4px; color: var(--text-3); font-size: 7px; letter-spacing: .035em; }
.creation-description { display: -webkit-box; margin: 6px 2px 0; overflow: hidden; color: var(--text-3); font-size: 8px; line-height: 1.4; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.creation-menu { position: relative; flex: 0 0 auto; }
.creation-menu summary { display: grid; width: 28px; height: 24px; place-items: center; border-radius: 7px; color: var(--text-2); font-size: 12px; font-weight: 800; list-style: none; cursor: pointer; }
.creation-menu summary::-webkit-details-marker { display: none; }
.creation-menu summary:hover { background: rgba(255,255,255,.45); color: var(--accent); }
.creation-menu-popover { position: absolute; top: 28px; right: 0; z-index: 8; display: grid; width: max-content; min-width: 160px; padding: 5px; border: 1px solid var(--border); border-radius: 11px; background: var(--surface); box-shadow: var(--shadow-md); }
.creation-menu-popover button { padding: 9px 10px; border: 0; border-radius: 7px; background: transparent; color: var(--text-2); font-size: 10px; text-align: left; cursor: pointer; }
.creation-menu-popover button:hover { background: var(--accent-soft); color: var(--accent); }
</style>
