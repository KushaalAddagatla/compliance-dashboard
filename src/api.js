import axios from 'axios'

// In production, nginx proxies /api/* → app:8080, so baseURL is '' (relative).
// In dev, VITE_API_BASE_URL=http://localhost:8080 (set in .env.local).
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  headers: { 'Content-Type': 'application/json' },
})

export default api
