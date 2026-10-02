import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppShell from '@/layouts/AppShell.vue'
import LoginView from '@/views/LoginView.vue'
import RegisterView from '@/views/RegisterView.vue'
import NotFoundView from '@/views/NotFoundView.vue'
import ImagesView from '@/views/ImagesView.vue'
import StoriesView from '@/views/StoriesView.vue'
import MusicView from '@/views/MusicView.vue'
import LibraryView from '@/views/LibraryView.vue'
import ProfileView from '@/views/ProfileView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: AppShell,
      meta: { requiresAuth: true },
      children: [
        { path: '', redirect: '/images' },
        { path: 'images', name: 'images', component: ImagesView, meta: { title: 'Imágenes' } },
        { path: 'stories', name: 'stories', component: StoriesView, meta: { title: 'Cuentos' } },
        { path: 'music', name: 'music', component: MusicView, meta: { title: 'Música' } },
        { path: 'library', name: 'library', component: LibraryView, meta: { title: 'Biblioteca' } },
        { path: 'profile', name: 'profile', component: ProfileView, meta: { title: 'Perfil' } },
      ],
    },
    { path: '/login', name: 'login', component: LoginView, meta: { publicOnly: true } },
    { path: '/register', name: 'register', component: RegisterView, meta: { publicOnly: true } },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth) {
    await auth.restoreSession()
    if (!auth.isAuthenticated) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }
  }
  if (to.meta.publicOnly) {
    await auth.restoreSession()
    if (auth.isAuthenticated) return { name: 'images' }
  }
  return true
})
