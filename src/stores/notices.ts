import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Notice {
  id: number
  message: string
  kind: 'error' | 'success'
}

let nextId = 1

export const useNoticesStore = defineStore('notices', () => {
  const notices = ref<Notice[]>([])

  function push(message: string, kind: Notice['kind'] = 'success'): void {
    const id = nextId++
    notices.value.push({ id, message, kind })
    window.setTimeout(() => dismiss(id), 5000)
  }

  function dismiss(id: number): void {
    notices.value = notices.value.filter((notice) => notice.id !== id)
  }

  return { notices, push, dismiss }
})
