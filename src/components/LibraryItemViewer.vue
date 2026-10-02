<script setup lang="ts">
import { ref, watch } from 'vue'
import BaseButton from '@/components/BaseButton.vue'
import BaseModal from '@/components/BaseModal.vue'
import UiIcon from '@/components/UiIcon.vue'
import { useLibraryViewer } from '@/composables/useLibraryViewer'
import type { LibraryItem } from '@/types/api'

const props = defineProps<{ modelValue: boolean; item: LibraryItem | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
const viewer = useLibraryViewer()
const {
  item: openedItem,
  story,
  pageIndex,
  currentPage,
  pageCount,
  assetUrl,
  loading,
  mediaLoading,
  error,
  mediaError,
  filename,
  open,
  close,
  selectPage,
  download,
} = viewer
const imageLoadFailed = ref(false)

watch(
  () => [props.modelValue, props.item?.id] as const,
  ([isOpen]) => {
    if (isOpen && props.item) {
      imageLoadFailed.value = false
      void open(props.item)
    } else {
      close()
    }
  },
  { immediate: true },
)

function changePage(offset: number): void {
  void selectPage(pageIndex.value + offset)
}

function onModalChange(value: boolean): void {
  emit('update:modelValue', value)
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    :title="item?.name || 'Vista previa'"
    @update:model-value="onModalChange"
  >
    <div class="library-viewer-body">
      <div
        v-if="loading"
        class="viewer-state"
        role="status"
      >
        <span
          class="viewer-spinner"
          aria-hidden="true"
        />
        <strong>Abriendo recurso guardado…</strong>
      </div>
      <div
        v-else-if="error"
        class="viewer-state viewer-error"
        role="alert"
      >
        <UiIcon
          name="close"
          :size="20"
        />
        <strong>No se pudo abrir</strong>
        <p>{{ error }}</p>
      </div>
      <template v-else-if="openedItem">
        <div
          v-if="openedItem.type === 'image'"
          class="image-viewer"
        >
          <img
            v-if="assetUrl && !imageLoadFailed"
            :src="assetUrl"
            :alt="openedItem.name"
            @error="imageLoadFailed = true"
          >
          <div
            v-else-if="mediaLoading"
            class="viewer-state"
            role="status"
          >
            Cargando imagen…
          </div>
          <div
            v-else
            class="viewer-state viewer-error"
            role="alert"
          >
            <strong>La imagen guardada no está disponible</strong>
            <p>{{ mediaError || 'El navegador no pudo mostrar el asset de media.' }}</p>
          </div>
        </div>
        <div
          v-else-if="openedItem.type === 'music'"
          class="audio-viewer"
        >
          <div class="audio-art">
            <UiIcon
              name="music"
              :size="44"
            /><small>Audio guardado en Tale Star</small>
          </div>
          <div
            v-if="mediaLoading"
            class="viewer-state"
            role="status"
          >
            Cargando audio…
          </div>
          <audio
            v-else-if="assetUrl"
            :src="assetUrl"
            controls
            preload="metadata"
          />
          <div
            v-else
            class="viewer-state viewer-error"
            role="alert"
          >
            <strong>El audio guardado no está disponible</strong>
            <p>{{ mediaError || 'El endpoint de media no devolvió el asset.' }}</p>
          </div>
        </div>
        <div
          v-else
          class="story-viewer"
        >
          <div class="story-page-art">
            <img
              v-if="assetUrl && !imageLoadFailed"
              :src="assetUrl"
              :alt="'Ilustración de ' + openedItem.name"
              @error="imageLoadFailed = true"
            >
            <div
              v-else-if="mediaLoading"
              class="viewer-state"
              role="status"
            >
              Cargando ilustración…
            </div>
            <div
              v-else
              class="story-art-empty"
            >
              <UiIcon
                name="stories"
                :size="32"
              />
              <span>{{ mediaError ? 'Ilustración no disponible' : 'Página del cuento' }}</span>
            </div>
          </div>
          <article class="story-copy">
            <span class="eyebrow">{{ story?.title || openedItem.name }}</span>
            <p
              v-if="currentPage?.action"
              class="story-action"
            >
              {{ currentPage.action }}
            </p>
            <p v-if="currentPage?.text">
              {{ currentPage.text }}
            </p>
            <p
              v-else-if="!pageCount"
              class="muted"
            >
              Este cuento aún no tiene páginas.
            </p>
            <div
              v-if="pageCount"
              class="story-pager"
            >
              <BaseButton
                :disabled="pageIndex === 0 || mediaLoading"
                aria-label="Página anterior"
                @click="changePage(-1)"
              >
                <UiIcon
                  name="arrow"
                  :size="14"
                />
              </BaseButton>
              <span>Página {{ currentPage?.page_number || pageIndex + 1 }} de {{ pageCount }}</span>
              <BaseButton
                :disabled="pageIndex >= pageCount - 1 || mediaLoading"
                aria-label="Página siguiente"
                @click="changePage(1)"
              >
                <UiIcon
                  name="arrow"
                  :size="14"
                />
              </BaseButton>
            </div>
          </article>
        </div>

        <dl class="viewer-metadata">
          <div><dt>Tipo</dt><dd>{{ openedItem.type }}</dd></div>
          <div><dt>Guardado</dt><dd>{{ new Date(openedItem.created_at).toLocaleString() }}</dd></div>
          <div v-if="openedItem.media_type">
            <dt>Media</dt><dd>{{ openedItem.media_type }}</dd>
          </div>
          <div><dt>Asset / recurso</dt><dd>{{ openedItem.resource_id }}</dd></div>
        </dl>
        <footer class="viewer-actions">
          <BaseButton
            :disabled="openedItem.type !== 'story' && !assetUrl"
            @click="download"
          >
            <UiIcon
              name="download"
              :size="14"
            /> Descargar {{ filename.split('.').pop()?.toUpperCase() }}
          </BaseButton>
          <BaseButton
            variant="primary"
            @click="onModalChange(false)"
          >
            Cerrar
          </BaseButton>
        </footer>
      </template>
    </div>
  </BaseModal>
</template>

<style scoped>
.library-viewer-body { padding: 16px 20px 20px; }
.viewer-state { display: flex; min-height: 170px; flex-direction: column; align-items: center; justify-content: center; gap: 9px; color: var(--text-2); font-size: 11px; text-align: center; }
.viewer-state p { margin: 0; color: var(--text-3); font-size: 10px; line-height: 1.5; }
.viewer-error { color: #a02d40; }
.viewer-spinner { width: 24px; height: 24px; border: 3px solid rgba(116,84,253,.2); border-top-color: var(--accent); border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.image-viewer { display: grid; min-height: 250px; max-height: 60vh; overflow: hidden; place-items: center; border-radius: 13px; background: rgba(236,232,248,.8); }
.image-viewer img { display: block; max-width: 100%; max-height: 60vh; object-fit: contain; }
.audio-viewer { display: grid; gap: 13px; }
.audio-viewer audio { width: 100%; }
.audio-art { display: grid; min-height: 180px; place-items: center; align-content: center; gap: 12px; border-radius: 14px; background: radial-gradient(circle at 42% 38%, rgba(151,119,255,.72), transparent 44%), linear-gradient(140deg,#463491,#261d54); color: white; }
.audio-art small { color: rgba(255,255,255,.7); font-size: 9px; }
.story-viewer { overflow: hidden; border-radius: 14px; background: #fffdf8; box-shadow: var(--shadow-sm); }
.story-page-art { display: grid; min-height: 190px; max-height: 44vh; overflow: hidden; place-items: center; background: linear-gradient(160deg,#bdc4ff,#ecd5db); }
.story-page-art img { display: block; width: 100%; max-height: 44vh; object-fit: cover; }
.story-art-empty { display: grid; justify-items: center; gap: 9px; color: #7254bc; font-size: 9px; }
.story-copy { padding: 20px clamp(17px,4vw,40px); color: #28202d; }
.story-copy .eyebrow { margin: 0 0 7px; font-size: 8px; }
.story-copy > p { margin: 6px 0 18px; font-family: Georgia,serif; font-size: 15px; line-height: 1.65; white-space: pre-wrap; }
.story-copy .story-action { color: #7b62b1; font-family: var(--font-ui); font-size: 10px; font-weight: 700; }
.story-pager { display: flex; align-items: center; justify-content: center; gap: 12px; border-top: 1px solid rgba(34,30,45,.1); padding-top: 13px; }
.story-pager span { min-width: 100px; color: var(--text-2); font-size: 9px; text-align: center; }
.story-pager :deep(.ui-icon) { transform: rotate(180deg); }
.story-pager button:last-child :deep(.ui-icon) { transform: none; }
.viewer-metadata { display: flex; flex-wrap: wrap; gap: 7px; margin: 12px 0; }
.viewer-metadata div { min-width: 0; flex: 1 1 120px; padding: 8px 9px; border-radius: 9px; background: rgba(240,241,244,.72); }
.viewer-metadata dt { color: var(--text-3); font-size: 7px; text-transform: uppercase; }
.viewer-metadata dd { margin: 4px 0 0; overflow-wrap: anywhere; color: var(--text-2); font-size: 9px; }
.viewer-actions { display: flex; justify-content: flex-end; gap: 8px; }
.muted { color: var(--text-3); }
</style>
