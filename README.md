# Tale Star frontend

Vue 3, TypeScript, Vite, Vue Router and Pinia frontend for the Tale Star API.

## Local development

Install Node.js, copy .env.example to .env, and keep VITE_API_BASE_URL pointed at the backend API prefix. The default is http://127.0.0.1:8000/api/v1.

From this directory run npm install, then npm run dev. The Vite app uses http://127.0.0.1:5173, an origin allowed by the backend's example CORS settings. Start the backend and database using the backend README before using authenticated features. The API documentation is available from that service at /docs.

npm run build creates the production bundle, npm run type-check validates Vue and TypeScript types, and npm run lint runs ESLint.

Authentication uses the backend's short-lived bearer access token. The token is kept in the current browser tab's session storage, restored through GET /api/v1/auth/me, and removed locally when the user signs out. The API has no refresh-token or logout endpoint.
