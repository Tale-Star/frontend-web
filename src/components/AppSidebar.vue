<script setup lang="ts">
import UiIcon, { type IconName } from '@/components/UiIcon.vue'

interface NavigationEntry {
  path: string
  label: string
  icon: IconName
}

const primaryNavigation: NavigationEntry[] = [
  { path: '/images', label: 'Imágenes', icon: 'images' },
  { path: '/stories', label: 'Cuentos', icon: 'stories' },
  { path: '/music', label: 'Música', icon: 'music' },
  { path: '/library', label: 'Biblioteca', icon: 'library' },
]

const profileNavigation: NavigationEntry = {
  path: '/profile',
  label: 'Perfil',
  icon: 'profile',
}

</script>

<template>
  <aside
    class="sidebar"
    aria-label="Navegación principal"
  >
    <RouterLink
      class="brand"
      to="/images"
      aria-label="Tale Star, inicio"
    >
      <img
        class="brand-logo-image"
        src="/assets/tale-star-mark.png"
        alt=""
      >
      <span class="brand-copy">
        <strong>Tale Star</strong>
        <small>Creative Studio</small>
      </span>
    </RouterLink>

    <nav class="main-nav">
      <RouterLink
        v-for="entry in primaryNavigation"
        :key="entry.path"
        class="nav-item"
        :to="entry.path"
        :aria-label="entry.label"
        active-class="active"
      >
        <UiIcon :name="entry.icon" />
        <span>{{ entry.label }}</span>
      </RouterLink>
      <div class="sidebar-spacer" />
      <RouterLink
        class="nav-item profile-nav"
        :to="profileNavigation.path"
        :aria-label="profileNavigation.label"
        active-class="active"
      >
        <UiIcon :name="profileNavigation.icon" />
        <span>{{ profileNavigation.label }}</span>
      </RouterLink>
    </nav>
  </aside>
</template>

<style scoped>
.sidebar {
  position: sticky;
  top: 0;
  display: flex;
  width: var(--sidebar);
  height: 100vh;
  flex-direction: column;
  padding: 16px 10px 12px;
  border-right: 1px solid rgba(31, 25, 56, 0.08);
  background: rgba(249, 249, 252, 0.97);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 7px 22px;
}

.brand-logo-image {
  width: 39px;
  height: 39px;
  flex: 0 0 auto;
  border-radius: 12px;
  box-shadow: 0 5px 15px rgba(91, 61, 250, 0.14);
  object-fit: cover;
}

.brand-copy {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.brand-copy strong {
  font-family: var(--font-display);
  font-size: 16px;
  line-height: 1;
}

.brand-copy small {
  overflow: hidden;
  color: var(--text-3);
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.main-nav {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 6px;
}

.nav-item {
  display: flex;
  min-height: 42px;
  align-items: center;
  gap: 10px;
  padding: 0 11px;
  border-radius: 12px;
  color: var(--text-2);
  font-size: 12px;
  font-weight: 700;
  transition: background 0.16s ease, color 0.16s ease;
}

.nav-item:hover {
  background: rgba(116, 84, 253, 0.07);
  color: var(--text);
}

.nav-item.active {
  background: rgba(116, 84, 253, 0.1);
  color: var(--accent);
}

.nav-item :deep(.ui-icon) {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
}

.sidebar-spacer {
  flex: 1;
}

.profile-nav {
  margin-top: auto;
}

@media (max-width: 900px) {
  .sidebar {
    padding-inline: 8px;
  }

  .brand {
    justify-content: center;
    padding-inline: 0;
  }

  .brand-copy,
  .nav-item span {
    display: none;
  }

  .nav-item {
    justify-content: center;
    padding-inline: 0;
  }

}

@media (max-width: 700px) {
  .sidebar {
    position: fixed;
    z-index: 40;
    inset: auto 0 0;
    width: 100%;
    height: 66px;
    padding: 5px max(8px, env(safe-area-inset-right)) calc(5px + env(safe-area-inset-bottom))
      max(8px, env(safe-area-inset-left));
    border-top: 1px solid rgba(31, 25, 56, 0.08);
    border-right: 0;
    background: rgba(250, 250, 252, 0.94);
    backdrop-filter: blur(20px);
  }

  .brand {
    display: none;
  }

  .main-nav {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    align-items: stretch;
    gap: 4px;
  }

  .nav-item {
    min-height: 54px;
    flex-direction: column;
    justify-content: center;
    gap: 3px;
    border-radius: 11px;
    font-size: 9px;
  }

  .nav-item span {
    display: block;
  }

  .nav-item :deep(.ui-icon) {
    width: 18px;
    height: 18px;
  }

  .sidebar-spacer {
    display: none;
  }

  .profile-nav {
    margin-top: 0;
  }
}
</style>
