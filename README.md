# Tale Star Web

Frontend de Tale Star construido con Vue 3, TypeScript, Vite, Composition API y `<script setup lang="ts">`. Usa Vue Router para las rutas y Pinia para sesión, avisos y el estado compartido del modo infantil.

## Instalación

Requiere Node.js 22 o compatible con Vite 6.

```sh
npm install
```

Crea `.env` desde `.env.example` y configura la URL de la API:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

`VITE_API_BASE_URL` debe incluir el prefijo `/api/v1`. No guardes secretos en variables `VITE_*`: Vite las incluye en el bundle del navegador.

## Desarrollo local

1. Sigue el README de [Tale Star Backend](https://github.com/Tale-Star/backend) para preparar su base de datos y entorno.
2. Inicia el backend en `http://127.0.0.1:8000` o actualiza `VITE_API_BASE_URL`.
3. Inicia el frontend:

```sh
npm run dev
```

Vite sirve la aplicación en `http://127.0.0.1:5173`. El backend permite ese origen en su configuración CORS local predeterminada. La referencia OpenAPI del backend está en `/docs`.

## Rutas principales

- `/images` — generación de imágenes y selección de recursos reales.
- `/stories` — cuentos y páginas.
- `/music` — composición y generación de música.
- `/library` — imágenes, cuentos y música guardados.
- `/profile` — cuenta, PIN parental y modo infantil.
- `/login` y `/register` — acceso y registro.

Las rutas de trabajo requieren sesión. Si no hay sesión válida, la aplicación lleva al login y conserva la ruta solicitada para volver después.

En los prompts de imágenes y en las páginas de cuentos puedes escribir `@` para elegir un personaje guardado. Al generar una ilustración, el backend resuelve la mención con la descripción del personaje y traduce el prompt en español al inglés.

## Arquitectura

- `src/api/` contiene el cliente HTTP y clientes por recurso. Todos añaden el bearer token y normalizan los errores del backend.
- `src/composables/` coordina carga, edición, polling, media y cleanup de recursos.
- `src/stores/` mantiene la sesión autenticada, avisos y estado de modo infantil compartido con el layout.
- `src/components/` contiene controles, navegación, modales, tarjetas y viewers reutilizables.
- `src/views/` compone las páginas de Vue Router.
- `src/types/api.ts` declara los DTOs usados por los schemas del backend.

El token de acceso vive en `sessionStorage` y se comprueba con `GET /api/v1/auth/me`. El backend no ofrece refresh token ni endpoint de logout; cerrar sesión limpia el token localmente. El PIN parental nunca se persiste. El modo infantil conserva solo un indicador de interfaz en `sessionStorage` para mantener la salida protegida al recargar; la salida valida el PIN con el backend.

## Comprobaciones

```sh
npm run build
npm run type-check
npm run lint
```

El proyecto no define un script `npm run test`.
