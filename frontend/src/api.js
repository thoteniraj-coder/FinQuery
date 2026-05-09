const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function authHeader() {
  const token = localStorage.getItem('fq_token') || sessionStorage.getItem('fq_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(),
      ...options.headers,
    },
    ...options,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Request failed')
  }

  return data
}

export function fetchHealth() {
  return request('/api/health')
}

export function fetchSchema() {
  return request('/api/schema')
}

export function askFinquery(prompt) {
  return request('/api/query', {
    method: 'POST',
    body: JSON.stringify({ prompt }),
  })
}

export function runSql(sql) {
  return request('/api/run-sql', {
    method: 'POST',
    body: JSON.stringify({ sql }),
  })
}

export function createFinancialDocument(data) {
  return request('/api/financial_documents', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function login(email, password) {
  return request('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function fetchVendors(params = {}) {
  const query = new URLSearchParams(params).toString()
  return request(`/api/v1/vendors${query ? `?${query}` : ''}`)
}

export function saveVendor(vendor) {
  const id = vendor.id || vendor.vendor_code
  return request(id ? `/api/v1/vendors/${id}` : '/api/v1/vendors', {
    method: id ? 'PUT' : 'POST',
    body: JSON.stringify(vendor),
  })
}

export function fetchUsers() {
  return request('/api/v1/users')
}

export function updateUser(id, attrs) {
  return request(`/api/v1/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(attrs),
  })
}

export function fetchDocumentSerialSettings() {
  return request('/api/v1/document_serial_settings')
}

export function fetchDocumentSerialSetting(docType) {
  return request(`/api/v1/document_serial_settings/${docType}`)
}

export function updateDocumentSerialSetting(docType, attrs) {
  return request(`/api/v1/document_serial_settings/${docType}`, {
    method: 'PUT',
    body: JSON.stringify(attrs),
  })
}

export function fetchPurchaseOrders(params = {}) {
  const query = new URLSearchParams(params).toString()
  return request(`/api/v1/purchase_orders${query ? `?${query}` : ''}`)
}

export function fetchGrns(params = {}) {
  const query = new URLSearchParams(params).toString()
  return request(`/api/v1/grns${query ? `?${query}` : ''}`)
}

export function fetchBills(params = {}) {
  const query = new URLSearchParams(params).toString()
  return request(`/api/v1/bills${query ? `?${query}` : ''}`)
}

export async function fetchFinancialDocuments() {
  const [purchaseOrders, grns, bills] = await Promise.all([
    fetchPurchaseOrders(),
    fetchGrns(),
    fetchBills(),
  ])

  return {
    purchaseOrders: purchaseOrders.data || [],
    grns: grns.data || [],
    bills: bills.data || [],
  }
}

export function fetchMatch(documentType, id) {
  const resource = documentType === 'grn' ? 'grns' : documentType === 'bill' ? 'bills' : 'purchase_orders'
  return request(`/api/v1/${resource}/${id}/match`)
}

export function submitReview(documentType, id, actionType, comment) {
  const resource = documentType === 'grn' ? 'grns' : documentType === 'bill' ? 'bills' : 'purchase_orders'
  return request(`/api/v1/${resource}/${id}/review`, {
    method: 'POST',
    body: JSON.stringify({ action_type: actionType, comment }),
  })
}
