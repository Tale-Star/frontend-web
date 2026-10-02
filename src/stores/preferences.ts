import { defineStore } from 'pinia'
import { ref } from 'vue'

const CHILD_MODE_KEY = 'tale-star-child-mode'

function readChildMode(): boolean {
  try {
    return window.sessionStorage.getItem(CHILD_MODE_KEY) === 'true'
  } catch {
    return false
  }
}

export const usePreferencesStore = defineStore('preferences', () => {
  const childMode = ref(readChildMode())

  function enterChildMode(): void {
    childMode.value = true
    try {
      window.sessionStorage.setItem(CHILD_MODE_KEY, 'true')
    } catch {
      // Child mode remains active in memory when storage is unavailable.
    }
  }

  function leaveChildMode(): void {
    childMode.value = false
    try {
      window.sessionStorage.removeItem(CHILD_MODE_KEY)
    } catch {
      // Child mode is still cleared in memory.
    }
  }

  return { childMode, enterChildMode, leaveChildMode }
})
