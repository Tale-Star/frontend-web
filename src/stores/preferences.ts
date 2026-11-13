import { defineStore } from 'pinia'
import { ref } from 'vue'

const CHILD_MODE_KEY = 'tale-star-child-mode'
const CHILD_MODE_ITEM_KEY = 'tale-star-child-mode-item'

function readChildMode(): boolean {
  try {
    return window.sessionStorage.getItem(CHILD_MODE_KEY) === 'true'
  } catch {
    return false
  }
}

export const usePreferencesStore = defineStore('preferences', () => {
  const childMode = ref(readChildMode())
  const childModeItemId = ref<string | null>(readPresentedItem())

  function readPresentedItem(): string | null {
    try {
      return childMode.value ? window.sessionStorage.getItem(CHILD_MODE_ITEM_KEY) : null
    } catch {
      return null
    }
  }

  function enterChildMode(itemId: string | null = null): void {
    childMode.value = true
    childModeItemId.value = itemId
    try {
      window.sessionStorage.setItem(CHILD_MODE_KEY, 'true')
      if (itemId) window.sessionStorage.setItem(CHILD_MODE_ITEM_KEY, itemId)
      else window.sessionStorage.removeItem(CHILD_MODE_ITEM_KEY)
    } catch {
      // Child mode remains active in memory when storage is unavailable.
    }
  }

  function leaveChildMode(): void {
    childMode.value = false
    childModeItemId.value = null
    try {
      window.sessionStorage.removeItem(CHILD_MODE_KEY)
      window.sessionStorage.removeItem(CHILD_MODE_ITEM_KEY)
    } catch {
      // Child mode is still cleared in memory.
    }
  }

  return { childMode, childModeItemId, enterChildMode, leaveChildMode }
})
