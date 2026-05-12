import axios from 'axios'

// Base URL for the Spring Boot API.
// In production, nginx proxies /api to the backend, so this becomes just '/api'.
// Vite's dev server has no built-in proxy config here — requests go directly to :8080.
const api = axios.create({
  baseURL: 'http://localhost:8080',
  headers: { 'Content-Type': 'application/json' },
})

export default api
