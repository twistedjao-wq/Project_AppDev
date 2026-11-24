const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const API_ORIGIN = API_URL.replace(/\/api\/?$/, '')
const TOKEN_KEY = 'findmate_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

// Uploaded photos are stored on the API server, so they need the full address.
export const imageUrl = (path) => (path?.startsWith('/uploads/') ? `${API_ORIGIN}${path}` : path)

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {}
  let payload

  if (body instanceof FormData) {
    payload = body // the browser sets the multipart header itself
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  const token = auth ? getToken() : null
  if (token) headers.Authorization = `Bearer ${token}`

  let response
  try {
    response = await fetch(`${API_URL}${path}`, { method, headers, body: payload })
  } catch {
    throw new Error('Cannot reach the server. Make sure the API is running.')
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong. Please try again.')
  }
  return data
}

export const api = {
  requestLink: (email) => request('/auth/request-link', { method: 'POST', body: { email }, auth: false }),
  verifyLink: (token) => request('/auth/verify', { method: 'POST', body: { token }, auth: false }),
  me: () => request('/auth/me'),
  updateMe: (fields) => request('/auth/me', { method: 'PATCH', body: fields }),

  listItems: (params = {}) => request(`/items?${new URLSearchParams(params)}`),
  getItem: (id) => request(`/items/${id}`),
  createItem: (formData) => request('/items', { method: 'POST', body: formData }),
  updateItem: (id, fields) => request(`/items/${id}`, { method: 'PATCH', body: fields }),
  deleteItem: (id) => request(`/items/${id}`, { method: 'DELETE' }),

  claimItem: (id, proofDescription) =>
    request(`/items/${id}/claims`, { method: 'POST', body: { proofDescription } }),
  myClaims: () => request('/claims/mine'),
  listClaims: (status) => request(`/claims${status ? `?status=${status}` : ''}`),
  reviewClaim: (id, status) => request(`/claims/${id}`, { method: 'PATCH', body: { status } }),

  dashboard: () => request('/admin/dashboard'),
  deletionLogs: () => request('/admin/deletion-logs'),
  inviteAdmin: (email) => request('/admin/invites', { method: 'POST', body: { email } }),
}
