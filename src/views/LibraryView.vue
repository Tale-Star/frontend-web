<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { libraryApi } from '@/api/libraryApi'
import BaseButton from '@/components/BaseButton.vue'
import BasePanel from '@/components/BasePanel.vue'
import ResourceManager from '@/components/ResourceManager.vue'
import MediaThumbnail from '@/components/MediaThumbnail.vue'
import UiIcon from '@/components/UiIcon.vue'
import { useNoticesStore } from '@/stores/notices'
import type { LibraryItem, LibraryItemType } from '@/types/api'

type LibraryTab = 'creations' | 'characters' | 'scenarios' | 'styles'

const notices = useNoticesStore()
const selectedTab = ref<LibraryTab>('creations')
const items = ref<LibraryItem[]>([])
const loading = ref(true)
const loadFailed = ref(false)
const query = ref('')
const filterType = ref<LibraryItemType | ''>('')
const favoritesOnly = ref(false)
const busyItem = ref('')

const typeLabel: Record<LibraryItemType, string> = {
  image: 'Imagen',
  story: 'Cuento',
  music: 'Música',
}

const tabs: Array<{ key: LibraryTab; label: string }> = [
  { key: 'creations', label: 'Creaciones' },
  { key: 'characters', label: 'Personajes' },
  { key: 'scenarios', label: 'Escenarios' },
  { key: 'styles', label: 'Estilos' },
]
const creationTypes: LibraryItemType[] = ['image', 'story', 'music']

const emptyMessage = computed(() => {
  if (filterType.value) return 'No hay ' + typeLabel[filterType.value].toLowerCase() + 's guardados.'
  if (favoritesOnly.value) return 'Todavía no tienes creaciones favoritas.'
  return 'Cuando guardes una imagen, cuento o canción, aparecerá aquí.'
})

async function load(): Promise<void> {
  loading.value = true
  loadFailed.value = false
  try {
    items.value = await libraryApi.list({
      type: filterType.value || undefined,
      q: query.value,
      favorite: favoritesOnly.value ? true : undefined,
    })
  } catch {
    loadFailed.value = true
  } finally {
    loading.value = false
  }
}

async function toggleFavorite(item: LibraryItem): Promise<void> {
  busyItem.value = item.id
  try {
    const updated = await libraryApi.patch(item.id, { favorite: !item.favorite })
    items.value = favoritesOnly.value && !updated.favorite
      ? items.value.filter((current) => current.id !== updated.id)
      : items.value.map((current) => (current.id === updated.id ? updated : current))
  } finally {
    busyItem.value = ''
  }
}

async function removeItem(item: LibraryItem): Promise<void> {
  if (!window.confirm('Quitar «' + item.name + '» de la biblioteca?')) return
  busyItem.value = item.id
  try {
    await libraryApi.delete(item.id)
    items.value = items.value.filter((current) => current.id !== item.id)
    notices.push('Creación quitada de la biblioteca.')
  } finally {
    busyItem.value = ''
  }
}

watch([filterType, favoritesOnly], load)
onMounted(load)
</script>

<template>
  <div class="page">
    <header class="page-heading">
      <div class="page-heading-copy">
        <span class="eyebrow">Biblioteca</span>
        <h1>Tus creaciones</h1>
        <p>Encuentra tus archivos guardados y administra los recursos que reutilizas en tus escenas.</p>
      </div>
    </header>

    <div
      class="resource-tabs"
      role="tablist"
      aria-label="Secciones de la biblioteca"
    >
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-button"
        :class="{ active: selectedTab === tab.key }"
        type="button"
        role="tab"
        :aria-selected="selectedTab === tab.key"
        @click="selectedTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <BasePanel v-if="selectedTab === 'creations'">
      <div class="section-heading library-controls">
        <div>
          <h2>Creaciones guardadas</h2>
          <p>Los resultados provienen de tu biblioteca en Tale Star API.</p>
        </div>
        <form
          class="library-search"
          @submit.prevent="load"
        >
          <label class="search-field">
            <span class="sr-only">Buscar en tu biblioteca</span>
            <input
              v-model="query"
              class="form-control"
              type="search"
              placeholder="Buscar en tu biblioteca"
            >
          </label>
          <BaseButton
            type="submit"
            aria-label="Buscar"
          >
            <UiIcon
              name="search"
              :size="15"
            />
          </BaseButton>
        </form>
      </div>

      <div class="filter-row">
        <button
          class="chip"
          :class="{ active: !filterType }"
          type="button"
          @click="filterType = ''"
        >
          Todo
        </button>
        <button
          v-for="type in creationTypes"
          :key="type"
          class="chip"
          :class="{ active: filterType === type }"
          type="button"
          @click="filterType = type"
        >
          {{ typeLabel[type] }}
        </button>
        <button
          class="chip favorite-filter"
          :class="{ active: favoritesOnly }"
          type="button"
          @click="favoritesOnly = !favoritesOnly"
        >
          <UiIcon
            name="heart"
            :size="13"
          />
          Favoritos
        </button>
      </div>

      <div
        v-if="loading"
        class="page-loader"
      >
        Cargando tus creaciones…
      </div>
      <div
        v-else-if="loadFailed"
        class="empty-state"
      >
        <div class="empty-state-icon">
          <UiIcon name="library" />
        </div>
        <strong>No se pudo abrir la biblioteca</strong>
        <p>Comprueba la conexión con Tale Star API e inténtalo de nuevo.</p>
        <BaseButton
          class="retry-button"
          @click="load"
        >
          Volver a intentar
        </BaseButton>
      </div>
      <div
        v-else-if="items.length"
        class="library-list"
      >
        <article
          v-for="item in items"
          :key="item.id"
          class="library-item"
        >
          <MediaThumbnail
            :resource-url="item.resource_url"
            :type="item.type"
            :media-type="item.media_type"
          />
          <div class="library-copy">
            <strong>{{ item.name }}</strong>
            <small>{{ typeLabel[item.type] }} · {{ new Date(item.created_at).toLocaleDateString() }}</small>
            <small v-if="item.description">{{ item.description }}</small>
          </div>
          <div class="library-actions">
            <button
              class="button-icon"
              type="button"
              :disabled="busyItem === item.id"
              :aria-label="item.favorite ? 'Quitar de favoritos' : 'Marcar favorito'"
              @click="toggleFavorite(item)"
            >
              <UiIcon
                name="heart"
                :size="16"
              />
            </button>
            <button
              class="button-icon"
              type="button"
              :disabled="busyItem === item.id"
              :aria-label="'Eliminar ' + item.name"
              @click="removeItem(item)"
            >
              <UiIcon
                name="trash"
                :size="16"
              />
            </button>
          </div>
        </article>
      </div>
      <div
        v-else
        class="empty-state"
      >
        <div class="empty-state-icon">
          <UiIcon name="library" />
        </div>
        <strong>Tu biblioteca está esperando nuevas ideas</strong>
        <p>{{ emptyMessage }}</p>
      </div>
    </BasePanel>
    <ResourceManager
      v-else-if="selectedTab === 'characters'"
      kind="characters"
    />
    <ResourceManager
      v-else-if="selectedTab === 'scenarios'"
      kind="scenarios"
    />
    <ResourceManager
      v-else
      kind="styles"
    />
  </div>
</template>

<style scoped>
.library-controls {
  align-items: flex-start;
  margin-bottom: 14px;
}

.library-search {
  display: flex;
  min-width: min(340px, 100%);
  align-items: flex-end;
  gap: 7px;
}

.library-search .search-field {
  flex: 1;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin: 13px 0 16px;
}

.favorite-filter {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: auto;
}

.library-actions {
  display: flex;
  gap: 3px;
}

.library-actions button[aria-label='Quitar de favoritos'] {
  color: var(--accent);
}

.retry-button {
  margin-top: 12px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

@media (max-width: 700px) {
  .library-controls {
    flex-direction: column;
  }

  .library-search {
    width: 100%;
    min-width: 0;
  }

  .favorite-filter {
    margin-left: 0;
  }
}
</style>
