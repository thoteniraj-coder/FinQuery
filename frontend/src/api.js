const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
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
