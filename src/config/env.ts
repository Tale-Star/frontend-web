const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()

export const environment = {
  apiBaseUrl: (configuredBaseUrl || 'http://127.0.0.1:8000/api/v1').replace(/\/+$/, ''),
}
