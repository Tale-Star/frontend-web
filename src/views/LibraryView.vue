<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'
import BaseButton from '@/components/BaseButton.vue'
import BaseInput from '@/components/BaseInput.vue'
import BaseModal from '@/components/BaseModal.vue'
import BasePanel from '@/components/BasePanel.vue'
import LibraryItemCard from '@/components/LibraryItemCard.vue'
import LibraryItemViewer from '@/components/LibraryItemViewer.vue'
import ResourceManager from '@/components/ResourceManager.vue'
import UiIcon from '@/components/UiIcon.vue'
import { useLibraryCollection } from '@/composables/useLibraryCollection'
import { useNoticesStore } from '@/stores/notices'
import type { LibraryItem, LibraryItemType, LibraryItemPatchRequest } from '@/types/api'

type LibraryTab = 'creations' | 'characters' | 'scenarios' | 'styles'

const router = useRouter()
const notices = useNoticesStore()
const collection = useLibraryCollection()
const {
  items,
  query,
  filterType,
  favoritesOnly,
  recentOnly,
  loading,
  loadError,
  actionError,
  busyItemId,
  visibleItems,
  load,
  patchItem,
  toggleFavorite,
  removeItem,
} = collection

const selectedTab = ref<LibraryTab>('creations')
const creationTypes: LibraryItemType[] = ['image', 'story', 'music']
const typeLabels: Record<LibraryItemType, string> = { image: 'Imágenes', story: 'Cuentos', music: 'Música' }
const favoriteItems = computed(() => visibleItems.value.filter((item) => item.favorite))
const editOpen = ref(false)
const deleteOpen = ref(false)
const viewerOpen = ref(false)
const viewerItem = ref<LibraryItem | null>(null)
const targetItem = ref<LibraryItem | null>(null)
const savingMetadata = ref(false)
const deleting = ref(false)
const editError = ref('')
const deleteError = ref('')
const editForm = reactive({ name: '', description: '' })

const tabs: Array<{ key: LibraryTab; label: string }> = [
  { key: 'creations', label: 'Creaciones' },
  { key: 'characters', label: 'Personajes' },
  { key: 'scenarios', label: 'Escenarios' },
  { key: 'styles', label: 'Estilos' },
]

function itemsOfType(type: LibraryItemType): LibraryItem[] {
  return visibleItems.value.filter((item) => item.type === type)
}

function openViewer(item: LibraryItem): void {
  viewerItem.value = item
  viewerOpen.value = true
}

function editMetadata(item: LibraryItem): void {
  targetItem.value = item
  editForm.name = item.name
  editForm.description = item.description
  editError.value = ''
  editOpen.value = true
}

async function saveMetadata(): Promise<void> {
  const item = targetItem.value
  const name = editForm.name.trim()
  if (!item || !name) {
    editError.value = 'El nombre es obligatorio.'
    return
  }
  const payload: LibraryItemPatchRequest = { name, description: editForm.description }
  savingMetadata.value = true
  editError.value = ''
  const updated = await patchItem(item.id, payload)
  savingMetadata.value = false
  if (!updated) {
    editError.value = collection.actionError.value
    return
  }
  if (viewerItem.value?.id === item.id) viewerItem.value = updated
  editOpen.value = false
  notices.push('Datos de la creación actualizados.')
}

function requestDelete(item: LibraryItem): void {
  targetItem.value = item
  deleteError.value = ''
  deleteOpen.value = true
}

async function confirmDelete(): Promise<void> {
  const item = targetItem.value
  if (!item || deleting.value) return
  deleting.value = true
  deleteError.value = ''
  const deleted = await removeItem(item.id)
  deleting.value = false
  if (!deleted) {
    deleteError.value = collection.actionError.value
    return
  }
  if (viewerItem.value?.id === item.id) viewerOpen.value = false
  deleteOpen.value = false
  notices.push('La referencia se quitó de la biblioteca.')
}

async function favorite(item: LibraryItem): Promise<void> {
  if (await toggleFavorite(item)) {
    notices.push(item.favorite ? 'Se quitó de favoritos.' : 'Se agregó a favoritos.')
  }
}

function editStory(item: LibraryItem): void {
  const destination: RouteLocationRaw = { name: 'stories', query: { story: item.resource_id } }
  void router.push(destination)
}

function refresh(): void {
  void load()
}

onMounted(refresh)
</script>

<template>
  <div class="page library-page">
    <header class="page-heading library-page-heading">
      <div class="page-heading-copy">
        <span class="eyebrow">Biblioteca</span>
        <h1>Tus creaciones</h1>
        <p>Abre una creación para disfrutarla, editar sus datos o marcarla como favorita.</p>
      </div>
      <div class="library-toolbar">
        <label class="library-search-field">
          <UiIcon
            name="search"
            :size="15"
          />
          <span class="sr-only">Buscar en tu biblioteca</span>
          <input
            v-model="query"
            type="search"
            maxlength="200"
            placeholder="Buscar en tu biblioteca"
          >
        </label>
        <BaseButton
          :variant="recentOnly ? 'primary' : 'secondary'"
          :aria-pressed="recentOnly"
          @click="recentOnly = !recentOnly"
        >
          <UiIcon
            name="clock"
            :size="14"
          /> Historial
        </BaseButton>
      </div>
    </header>

    <nav
      class="library-tabs"
      aria-label="Secciones de biblioteca"
    >
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        :class="{ active: selectedTab === tab.key }"
        :aria-current="selectedTab === tab.key ? 'page' : undefined"
        @click="selectedTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </nav>

    <template v-if="selectedTab === 'creations'">
      <div
        class="library-filters"
        aria-label="Filtrar creaciones"
      >
        <button
          class="filter-chip"
          type="button"
          :class="{ active: !filterType }"
          :aria-pressed="!filterType"
          @click="filterType = ''"
        >
          Todo
        </button>
        <button
          v-for="type in creationTypes"
          :key="type"
          class="filter-chip"
          type="button"
          :class="{ active: filterType === type }"
          :aria-pressed="filterType === type"
          @click="filterType = type"
        >
          {{ typeLabels[type] }}
        </button>
        <button
          class="filter-chip favorite-filter"
          type="button"
          :class="{ active: favoritesOnly }"
          :aria-pressed="favoritesOnly"
          @click="favoritesOnly = !favoritesOnly"
        >
          <UiIcon
            name="heart"
            :size="13"
          /> Favoritos
        </button>
        <span class="library-count">{{ items.length }} {{ items.length === 1 ? 'creación' : 'creaciones' }}</span>
      </div>

      <BasePanel class="library-content-panel">
        <div
          v-if="loading"
          class="page-loader"
          role="status"
        >
          Cargando tu biblioteca…
        </div>
        <div
          v-else-if="loadError"
          class="empty-state"
          role="alert"
        >
          <div class="empty-state-icon">
            <UiIcon name="library" />
          </div>
          <strong>No se pudo cargar la biblioteca</strong>
          <p>{{ loadError }}</p>
          <BaseButton
            class="retry-button"
            @click="refresh"
          >
            Volver a intentar
          </BaseButton>
        </div>
        <template v-else-if="visibleItems.length">
          <section
            v-if="favoriteItems.length && !recentOnly"
            class="creation-section"
          >
            <div class="creation-section-heading">
              <h2>Favoritos</h2>
              <span>{{ favoriteItems.length }} {{ favoriteItems.length === 1 ? 'creación' : 'creaciones' }}</span>
            </div>
            <div class="creation-grid">
              <LibraryItemCard
                v-for="item in favoriteItems"
                :key="'favorite-' + item.id"
                :item="item"
                :busy="busyItemId === item.id"
                @open="openViewer(item)"
                @favorite="favorite(item)"
                @edit="editMetadata(item)"
                @edit-story="editStory(item)"
                @remove="requestDelete(item)"
              />
            </div>
          </section>

          <section
            v-if="recentOnly"
            class="creation-section history-section"
          >
            <div class="creation-section-heading">
              <div><h2>Historial reciente</h2><p>Ordenado por la fecha real de alta de las referencias guardadas.</p></div>
              <span>{{ visibleItems.length }} elementos</span>
            </div>
            <div class="creation-grid">
              <LibraryItemCard
                v-for="item in visibleItems"
                :key="'recent-' + item.id"
                :item="item"
                :busy="busyItemId === item.id"
                @open="openViewer(item)"
                @favorite="favorite(item)"
                @edit="editMetadata(item)"
                @edit-story="editStory(item)"
                @remove="requestDelete(item)"
              />
            </div>
          </section>

          <template v-else>
            <section
              v-for="type in creationTypes"
              v-show="itemsOfType(type).length"
              :key="type"
              class="creation-section"
            >
              <div class="creation-section-heading">
                <h2>{{ typeLabels[type] }}</h2>
                <span>{{ itemsOfType(type).length }} {{ itemsOfType(type).length === 1 ? 'creación' : 'creaciones' }}</span>
              </div>
              <div class="creation-grid">
                <LibraryItemCard
                  v-for="item in itemsOfType(type)"
                  :key="item.id"
                  :item="item"
                  :busy="busyItemId === item.id"
                  @open="openViewer(item)"
                  @favorite="favorite(item)"
                  @edit="editMetadata(item)"
                  @edit-story="editStory(item)"
                  @remove="requestDelete(item)"
                />
              </div>
            </section>
          </template>
        </template>
        <div
          v-else
          class="empty-state"
        >
          <div class="empty-state-icon">
            <UiIcon name="library" />
          </div>
          <strong>{{ query || filterType || favoritesOnly ? 'No hay coincidencias' : 'Tu biblioteca está esperando nuevas ideas' }}</strong>
          <p>
            {{ query || filterType || favoritesOnly
              ? 'Prueba otra búsqueda o cambia los filtros.'
              : 'Cuando guardes una imagen, cuento o canción, aparecerá aquí.' }}
          </p>
          <RouterLink
            v-if="!query && !filterType && !favoritesOnly"
            class="empty-create-link"
            to="/images"
          >
            Crear una imagen
          </RouterLink>
        </div>
        <div
          v-if="actionError"
          class="library-action-error"
          role="alert"
        >
          {{ actionError }}
        </div>
      </BasePanel>
    </template>
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

    <LibraryItemViewer
      v-model="viewerOpen"
      :item="viewerItem"
    />

    <BaseModal
      v-model="editOpen"
      title="Editar datos guardados"
    >
      <form
        class="library-edit-form"
        @submit.prevent="saveMetadata"
      >
        <BaseInput
          v-model="editForm.name"
          label="Nombre"
          required
          :maxlength="200"
        />
        <label class="form-field">
          <span class="form-label">Descripción</span>
          <textarea
            v-model="editForm.description"
            class="form-control"
            rows="4"
            maxlength="5000"
          />
          <small class="form-hint">{{ editForm.description.length }}/5000</small>
        </label>
        <p
          v-if="editError"
          class="form-error"
          role="alert"
        >
          {{ editError }}
        </p>
        <footer class="modal-footer">
          <BaseButton
            type="button"
            :disabled="savingMetadata"
            @click="editOpen = false"
          >
            Cancelar
          </BaseButton>
          <BaseButton
            type="submit"
            variant="primary"
            :disabled="savingMetadata"
          >
            {{ savingMetadata ? 'Guardando…' : 'Guardar cambios' }}
          </BaseButton>
        </footer>
      </form>
    </BaseModal>

    <BaseModal
      v-model="deleteOpen"
      title="Quitar creación"
    >
      <div class="delete-confirmation">
        <p>¿Quitar <strong>{{ targetItem?.name }}</strong> de tu biblioteca?</p>
        <small>El asset o cuento original no se elimina.</small>
        <p
          v-if="deleteError"
          class="form-error"
          role="alert"
        >
          {{ deleteError }}
        </p>
        <footer class="modal-footer">
          <BaseButton
            :disabled="deleting"
            @click="deleteOpen = false"
          >
            Cancelar
          </BaseButton>
          <BaseButton
            variant="danger"
            :disabled="deleting"
            @click="confirmDelete"
          >
            {{ deleting ? 'Quitando…' : 'Quitar de biblioteca' }}
          </BaseButton>
        </footer>
      </div>
    </BaseModal>
  </div>
</template>

<style scoped>
.library-page-heading { align-items: center; margin-bottom: 15px; }
.library-toolbar { display: flex; min-width: min(465px, 48%); justify-content: flex-end; gap: 8px; }
.library-search-field { display: flex; min-width: 250px; align-items: center; gap: 8px; padding: 0 12px; border: 1px solid rgba(255,255,255,.66); border-radius: 12px; background: rgba(255,255,255,.6); color: var(--text-2); }
.library-search-field:focus-within { border-color: var(--accent-border); box-shadow: 0 0 0 3px rgba(116,84,253,.09); }
.library-search-field input { width: 100%; min-width: 0; min-height: 39px; padding: 0; border: 0; outline: 0; background: transparent; color: var(--text); font-size: 11px; }
.library-tabs { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 13px; }
.library-tabs button { padding: 7px 11px; border: 1px solid transparent; border-radius: 9px; background: transparent; color: var(--text-2); font-size: 9px; font-weight: 700; cursor: pointer; }
.library-tabs button:hover { background: rgba(255,255,255,.35); }
.library-tabs button.active { border-color: rgba(116,84,253,.12); background: rgba(255,255,255,.56); color: var(--accent); }
.library-filters { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; margin: 8px 0 13px; }
.filter-chip { display: inline-flex; min-height: 29px; align-items: center; gap: 5px; padding: 5px 10px; border: 1px solid rgba(255,255,255,.68); border-radius: 999px; background: rgba(255,255,255,.42); color: var(--text-2); font-size: 9px; font-weight: 700; cursor: pointer; }
.filter-chip:hover { border-color: var(--accent-border); color: var(--accent); }
.filter-chip.active { border-color: var(--accent-border); background: rgba(230,219,254,.84); color: var(--accent); }
.favorite-filter { margin-left: auto; }
.library-count { color: var(--text-3); font-size: 8px; }
.library-content-panel { min-height: 400px; }
.creation-section + .creation-section { margin-top: 24px; }
.creation-section-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; margin-bottom: 10px; }
.creation-section-heading h2 { margin: 0; font-size: 15px; font-weight: 700; }
.creation-section-heading p { margin: 4px 0 0; color: var(--text-3); font-size: 9px; }
.creation-section-heading > span { color: var(--text-3); font-size: 8px; white-space: nowrap; }
.creation-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.page-loader { min-height: 300px; }
.empty-create-link { display: inline-flex; margin-top: 12px; padding: 9px 14px; border-radius: 10px; background: linear-gradient(135deg,#6847ff,#9369ff); box-shadow: 0 7px 18px rgba(110,72,255,.2); color: #fff; font-size: 10px; font-weight: 700; }
.retry-button { margin-top: 10px; }
.library-action-error { margin-top: 12px; padding: 10px 12px; border-radius: 10px; background: rgba(224,82,101,.1); color: #a02d40; font-size: 10px; }
.library-edit-form { display: grid; gap: 14px; padding: 18px 20px 0; }
.library-edit-form textarea { resize: vertical; }
.library-edit-form .modal-footer { margin: 0 -20px; }
.delete-confirmation { padding: 8px 20px 0; }
.delete-confirmation > p { color: var(--text-2); font-size: 11px; line-height: 1.5; }
.delete-confirmation > small { color: var(--text-3); font-size: 9px; }
.delete-confirmation .modal-footer { margin: 8px -20px 0; }
.form-error { color: #a02d40; font-size: 10px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; }

@media (max-width: 900px) {
  .creation-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .library-toolbar { min-width: min(410px, 55%); }
}
@media (max-width: 700px) {
  .library-page-heading { align-items: stretch; flex-direction: column; }
  .library-toolbar { width: 100%; min-width: 0; justify-content: stretch; }
  .library-search-field { min-width: 0; flex: 1; }
  .library-count { margin-left: auto; }
}
@media (max-width: 450px) {
  .creation-grid { grid-template-columns: minmax(0, 1fr); gap: 14px; }
  .creation-cover { aspect-ratio: 1.02; }
  .favorite-filter { margin-left: 0; }
}
</style>
