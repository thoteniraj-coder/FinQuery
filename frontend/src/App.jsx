import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { askFinquery, fetchDocumentSerialSetting, fetchHealth, fetchSchema, runSql, createFinancialDocument, fetchVendors } from './api'
import './App.css'

import DashboardView from './views/DashboardView'
import DocumentsView from './views/DocumentsView'
import ReviewQueueView from './views/ReviewQueueView'
import { POView, GRNView, BillsView } from './views/FinanceViews'
import { SerialSettingsView, UsersView, VendorsView } from './views/AdminViews'
import { CURRENT_USER, formatCurrency } from './data'

const EXAMPLE_PROMPTS = [
  'Show outstanding bills with vendor name and due date',
  'Compare PO, GRN and bill quantities for PO-2026-002',
  'Find GRNs that do not have bills',
  'Show vendor-wise PO, GRN and bill summary',
]

const SAMPLE_SQL = `SELECT v.name AS vendor, b.bill_number, b.status, b.total_amount, b.due_date
FROM bills b
JOIN vendors v ON b.vendor_id = v.id
ORDER BY b.total_amount DESC
LIMIT 100`

function App() {
  const [currentView, setCurrentView] = useState('dashboard')
  const [auth, setAuth] = useState(() => {
    const stored = localStorage.getItem('fq_token') || sessionStorage.getItem('fq_token')
    return stored ? { user: CURRENT_USER, token: stored } : null
  })

  // Dashboard state
  const [mode, setMode] = useState('ai')
  const [prompt, setPrompt] = useState(EXAMPLE_PROMPTS[0])
  const [sql, setSql] = useState(SAMPLE_SQL)
  const [result, setResult] = useState(null)
  const [model, setModel] = useState('')
  const [schema, setSchema] = useState(null)
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [toastMessage, setToastMessage] = useState('')

  useEffect(() => {
    refreshMeta()
  }, [])

  async function refreshMeta() {
    try {
      setError('')
      const [healthData, schemaData] = await Promise.all([
        fetchHealth(),
        fetchSchema(),
      ])
      setHealth(healthData)
      setSchema(schemaData)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function submitAi(event) {
    if (event) event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const data = await askFinquery(prompt)
      setSql(data.sql)
      setModel(data.model)
      setResult(data.result)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  async function submitSql(event) {
    if (event) event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const data = await runSql(sql)
      setSql(data.sql)
      setModel('')
      setResult(data.result)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  function exportCsv() {
    if (!result?.rows?.length) return

    const csv = [result.columns, ...result.rows]
      .map((row) => row.map(escapeCsvCell).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'finquery-result.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const chartData = useMemo(() => buildChartData(result), [result])
  const tableCount = schema ? Object.keys(schema.tables).length : 0
  const columnCount = schema
    ? Object.values(schema.tables).reduce((total, columns) => total + columns.length, 0)
    : 0

  if (!auth) {
    return <LoginPage onLogin={(remember) => {
      const token = 'demo-jwt-token'
      const storage = remember ? localStorage : sessionStorage
      storage.setItem('fq_token', token)
      setAuth({ user: CURRENT_USER, token })
    }} />
  }

  function logout() {
    localStorage.removeItem('fq_token')
    sessionStorage.removeItem('fq_token')
    setAuth(null)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" role="navigation" aria-label="Main navigation">
        <div className="sidebar-brand">
          <div className="brand-logo">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <rect width="22" height="22" rx="6" fill="var(--accent)"/>
              <path d="M6 7h10M6 11h7M6 15h9" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="brand-name">FinQuery</span>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-group">
            <span className="nav-label">Overview</span>
            <button className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`} onClick={() => setCurrentView('dashboard')}>
              <svg className="nav-icon" width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/></svg>
              Dashboard
            </button>
            <button className={`nav-item ${currentView === 'documents' ? 'active' : ''}`} onClick={() => setCurrentView('documents')}>
              <svg className="nav-icon" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M9 1H3a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V5L9 1z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M9 1v4h4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M5 9h6M5 12h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              Documents
              <span className="nav-badge" id="nav-badge-docs">6</span>
            </button>
            <button className={`nav-item ${currentView === 'vendors' ? 'active' : ''}`} onClick={() => setCurrentView('vendors')}>
              <svg className="nav-icon" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 13V5l6-3 6 3v8" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M5 13V8h6v5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
              Vendors
            </button>
          </div>

          <div className="nav-group">
            <span className="nav-label">Actions</span>
            <button className={`nav-item ${currentView === 'create' ? 'active' : ''}`} onClick={() => setCurrentView('create')}>
              <svg className="nav-icon" width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4"/><path d="M8 5v6M5 8h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              Create Document
            </button>
            <button className={`nav-item ${currentView === 'review' ? 'active' : ''}`} onClick={() => setCurrentView('review')}>
              <svg className="nav-icon" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M14 10c0 2.21-2.686 4-6 4S2 12.21 2 10s2.686-4 6-4 6 1.79 6 4z" stroke="currentColor" strokeWidth="1.4"/><path d="M8 10h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M8 2v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              Review Queue
              <span className="nav-badge pending" id="nav-badge-review">2</span>
            </button>
            <button className={`nav-item ${currentView === 'users' ? 'active' : ''}`} onClick={() => setCurrentView('users')}>
              <svg className="nav-icon" width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="3" stroke="currentColor" strokeWidth="1.4"/><path d="M1.5 14c.6-2.6 2.2-4 4.5-4s3.9 1.4 4.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M11 3.5c1.6.2 2.5 1.2 2.5 2.7S12.6 8.7 11 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              Users
            </button>
            <button className={`nav-item ${currentView === 'serial-settings' ? 'active' : ''}`} onClick={() => setCurrentView('serial-settings')}>
              <svg className="nav-icon" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 2h10v12H3V2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M5.5 6h5M5.5 9h3M11 12h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              Serial Settings
            </button>
          </div>

          <div className="nav-group">
            <span className="nav-label">Finance</span>
            <button className={`nav-item ${currentView === 'po' ? 'active' : ''}`} onClick={() => setCurrentView('po')}>
              <svg className="nav-icon" width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M1 6h14" stroke="currentColor" strokeWidth="1.4"/><path d="M5 10h2M10 10h1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              Purchase Orders
            </button>
            <button className={`nav-item ${currentView === 'grn' ? 'active' : ''}`} onClick={() => setCurrentView('grn')}>
              <svg className="nav-icon" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4l6-3 6 3v8l-6 3-6-3V4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M8 1v14M2 4l6 3 6-3" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
              GRN
            </button>
            <button className={`nav-item ${currentView === 'bills' ? 'active' : ''}`} onClick={() => setCurrentView('bills')}>
              <svg className="nav-icon" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2h12v12l-2-1.5L10 14l-2-1.5L6 14 4 12.5 2 14V2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M5 6h6M5 9h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              Bills / Invoices
            </button>
          </div>

          <div className="nav-group">
            <span className="nav-label">FinQuery AI</span>
            <button className={`nav-item ${currentView === 'ai-query' ? 'active' : ''}`} onClick={() => setCurrentView('ai-query')}>
              <svg className="nav-icon" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1v14M1 8h14M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              AI Queries
            </button>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar" style={{background:'var(--surface-2)', color:'var(--text)'}}>NP</div>
            <div className="user-info">
              <span className="user-name">{auth.user.name}</span>
              <span className="user-role">{auth.user.role.replace('_', ' ')}</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar" role="banner">
          <div className="topbar-search">
            <svg className="search-icon" width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.4"/><path d="M11 11l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
            <input
              type="text"
              placeholder="Search documents..."
              className="search-input"
              aria-label="Search schema"
            />
            <kbd className="search-kbd">⌘K</kbd>
          </div>
          <div className="topbar-actions">
            <button className="btn btn-primary btn-sm" onClick={() => setCurrentView('create')}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              New Document
            </button>
            <button className="btn btn-ghost btn-sm" onClick={logout}>Logout</button>
          </div>
        </header>

        <main className="views-container" style={{ position: 'relative' }}>

          {toastMessage && (
            <div className="toast success" style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 999 }}>
              <span className="toast-icon">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="#16A34A" strokeWidth="1.4"/><path d="M5 8.5l2 2 4-4" stroke="#16A34A" strokeWidth="1.4" strokeLinecap="round"/></svg>
              </span>
              <div className="toast-body">
                <div className="toast-title">Success</div>
                <div className="toast-msg">{toastMessage}</div>
              </div>
              <button className="toast-close" onClick={() => setToastMessage('')} style={{background:'transparent', border:'none', cursor:'pointer', color:'var(--text-3)'}}>×</button>
            </div>
          )}

          {currentView === 'dashboard' && <DashboardView setCurrentView={setCurrentView} />}
          {currentView === 'documents' && <DocumentsView setCurrentView={setCurrentView} />}
          {currentView === 'review' && <ReviewQueueView />}
          {currentView === 'vendors' && <VendorsView />}
          {currentView === 'users' && <UsersView />}
          {currentView === 'serial-settings' && <SerialSettingsView />}
          {currentView === 'po' && <POView setCurrentView={setCurrentView} />}
          {currentView === 'grn' && <GRNView setCurrentView={setCurrentView} />}
          {currentView === 'bills' && <BillsView setCurrentView={setCurrentView} />}

          {currentView === 'ai-query' && (
            <section className="view active">
              <div className="view-header">
                <div>
                  <h1 className="view-title">FinQuery AI</h1>
                  <p className="view-subtitle">Ask questions in natural language, inspect SQL, and analyze results.</p>
                </div>
                <div className="view-header-actions">
                  <button className="btn btn-ghost btn-sm" onClick={refreshMeta}>Refresh Schema</button>
                </div>
              </div>

              {error && (
                <div className="toast error" style={{ position: 'relative', margin: '0 0 var(--sp-6) 0', width: '100%', right: 0, bottom: 0, animation: 'none' }}>
                  <span className="toast-icon">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="#DC2626" strokeWidth="1.4"/><path d="M6 6l4 4M10 6l-4 4" stroke="#DC2626" strokeWidth="1.4" strokeLinecap="round"/></svg>
                  </span>
                  <div className="toast-body">
                    <div className="toast-title">Query Error</div>
                    <div className="toast-msg">{error}</div>
                  </div>
                </div>
              )}

              <div className="stats-grid">
                <div className="stat-card">
                  <div className={`stat-icon ${health?.status === 'ok' ? 'stat-icon--green' : 'stat-icon--red'}`}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.4"/><path d="M5.5 9.5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div className="stat-content">
                    <span className="stat-value" style={{textTransform: 'uppercase'}}>{health?.status || 'OFFLINE'}</span>
                    <span className="stat-label">API Connection</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon stat-icon--blue">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="3" y="3" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M3 7h12M7 3v12" stroke="currentColor" strokeWidth="1.4"/></svg>
                  </div>
                  <div className="stat-content">
                    <span className="stat-value">{tableCount || '-'}</span>
                    <span className="stat-label">Database Tables</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon stat-icon--amber">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 4h12M3 9h12M3 14h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                  </div>
                  <div className="stat-content">
                    <span className="stat-value">{columnCount || '-'}</span>
                    <span className="stat-label">Mapped Columns</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: 'var(--purple-bg)', color: 'var(--purple)' }}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 1L2 5v8l7 4 7-4V5l-7-4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M2 5l7 4 7-4M9 9v8" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
                  </div>
                  <div className="stat-content">
                    <span className="stat-value">{result?.row_count !== undefined ? result.row_count : '-'}</span>
                    <span className="stat-label">Result Rows</span>
                  </div>
                </div>
              </div>

              <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 380px', marginBottom: 'var(--sp-6)' }}>
                <div className="panel">
                  <div className="panel-header" style={{ display: 'flex', gap: '8px' }}>
                    <button className={`btn ${mode === 'ai' ? 'btn-primary' : 'btn-ghost'} btn-sm`} onClick={() => setMode('ai')}>AI Assistant</button>
                    <button className={`btn ${mode === 'sql' ? 'btn-primary' : 'btn-ghost'} btn-sm`} onClick={() => setMode('sql')}>SQL Editor</button>
                  </div>
                  <div style={{ padding: 'var(--sp-5)' }}>
                    {mode === 'ai' ? (
                      <form onSubmit={submitAi}>
                        <div className="field-group full-width">
                          <label className="field-label" htmlFor="prompt">What would you like to know?</label>
                          <textarea
                            id="prompt"
                            className="field-textarea"
                            rows={4}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Type your question here..."
                          />
                        </div>
                        <button className="btn btn-primary" disabled={loading} type="submit" style={{ marginTop: 'var(--sp-2)' }}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 1L13 7 3 13V1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
                          {loading ? 'Thinking...' : 'Run AI Query'}
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={submitSql}>
                        <div className="field-group full-width">
                          <label className="field-label" htmlFor="sql">Execute Custom SQL</label>
                          <textarea
                            id="sql"
                            className="field-textarea font-mono"
                            style={{ fontFamily: "'DM Mono', monospace", fontSize: '13px', backgroundColor: 'var(--surface-2)' }}
                            rows={6}
                            value={sql}
                            onChange={(e) => setSql(e.target.value)}
                          />
                        </div>
                        <button className="btn btn-primary" disabled={loading} type="submit" style={{ marginTop: 'var(--sp-2)' }}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 1L13 7 3 13V1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
                          {loading ? 'Running...' : 'Run SQL'}
                        </button>
                      </form>
                    )}
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <h2 className="panel-title">Example Prompts</h2>
                  </div>
                  <div className="recent-list">
                    {EXAMPLE_PROMPTS.map((item, idx) => (
                      <div
                        key={idx}
                        className="recent-item"
                        onClick={() => { setMode('ai'); setPrompt(item); }}
                        role="button"
                        tabIndex="0"
                      >
                        <div className="recent-item-icon" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                        </div>
                        <div className="recent-item-body">
                          <div className="recent-item-title" style={{ whiteSpace: 'normal', fontSize: '12.5px', lineHeight: '1.4' }}>{item}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="panel">
                  <div className="panel-header">
                    <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 3h10M2 7h6M2 11h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      Generated SQL {model && <span className="badge draft" style={{ marginLeft: 'var(--sp-2)' }}>{model}</span>}
                    </h2>
                  </div>
                  <div style={{ padding: 'var(--sp-4)' }}>
                    <pre style={{
                      margin: 0,
                      padding: 'var(--sp-4)',
                      background: 'var(--surface-2)',
                      borderRadius: 'var(--r-md)',
                      fontFamily: "'DM Mono', monospace",
                      fontSize: '12px',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      color: 'var(--text)'
                    }}>
                      {sql || 'No SQL generated yet.'}
                    </pre>
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-header">
                    <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 12V2M12 12H2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M5 9l2-3 2 1 3-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Numeric Preview
                    </h2>
                  </div>
                  <div style={{ padding: 'var(--sp-4)' }}>
                    {chartData.length > 0 ? (
                      <ResponsiveContainer height={200} width="100%">
                        <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                          <CartesianGrid stroke="var(--border)" vertical={false} />
                          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
                          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
                          <Tooltip
                            contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-sm)' }}
                            itemStyle={{ color: 'var(--text)', fontSize: '13px', fontWeight: 600 }}
                            labelStyle={{ color: 'var(--text-2)', fontSize: '12px', marginBottom: '4px' }}
                            cursor={{ fill: 'var(--surface-2)' }}
                          />
                          <Bar dataKey="value" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="empty-state" style={{ height: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <p className="empty-sub">No numeric column found in results</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="table-container" style={{ marginTop: 'var(--sp-6)', overflowX: 'auto' }}>
                <div className="panel-header">
                  <h2 className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="3" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1.5"/><path d="M2 6h10M5 3v8" stroke="currentColor" strokeWidth="1.5"/></svg>
                    Result Table
                  </h2>
                  {result?.rows?.length > 0 && (
                    <button className="btn btn-ghost btn-sm" onClick={exportCsv}>Export</button>
                  )}
                </div>
                <table className="data-table" role="table">
                  <thead>
                    <tr>
                      {result?.columns ? result.columns.map((column) => (
                        <th scope="col" key={column}>{column}</th>
                      )) : (
                        <th scope="col">Data</th>
                      )}
                    </tr>
                  </thead>
                  <tbody id="doc-table-body">
                    {!result ? (
                      <tr><td colSpan="100%" className="empty-state" style={{ padding: '3rem 1rem' }}><p className="empty-sub">Run a query to see results</p></td></tr>
                    ) : result.rows.length === 0 ? (
                      <tr><td colSpan="100%" className="empty-state" style={{ padding: '3rem 1rem' }}><p className="empty-sub">0 rows returned</p></td></tr>
                    ) : (
                      result.rows.map((row, rowIndex) => (
                        <tr key={`${row.join('-')}-${rowIndex}`}>
                          {row.map((value, columnIndex) => (
                            <td key={`${result.columns[columnIndex]}-${columnIndex}`}>
                              <span className={typeof value === 'number' ? 'font-mono' : ''}>
                                {formatCell(value)}
                              </span>
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {currentView === 'create' && (
            <CreateDocumentView
              onCreated={(msg) => {
                setToastMessage(msg)
                setCurrentView('dashboard')
              }}
            />
          )}

        </main>
      </div>
    </div>
  )
}

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('admin@finquery.com')
  const [password, setPassword] = useState('password123')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  function submit(event) {
    event.preventDefault()
    if (!email || !password) {
      setError('Email and password are required.')
      return
    }
    if (!email.includes('@')) {
      setError('Enter a valid email address.')
      return
    }
    setError('')
    onLogin(remember)
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          <div className="brand-logo">
            <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
              <rect width="30" height="30" rx="8" fill="var(--accent)"/>
              <path d="M8 10h14M8 15h10M8 20h12" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <h1>FinQuery</h1>
            <p>Finance workflow console</p>
          </div>
        </div>

        <div className="field-group">
          <label className="field-label required">Email</label>
          <input className="field-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <div className="field-group">
          <label className="field-label required">Password</label>
          <div className="password-field">
            <input className="field-input" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} />
            <button type="button" className="row-btn" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        <label className="remember-row">
          <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
          Remember me
        </label>
        {error && <div className="field-error login-error">{error}</div>}
        <button className="btn btn-primary btn-full" type="submit">Log in</button>
        <p className="login-help">Contact your administrator to create an account.</p>
      </form>
    </div>
  )
}

function CreateDocumentView({ onCreated }) {
  const [formData, setFormData] = useState({
    title: '',
    docId: '',
    type: 'po',
    vendorId: '',
    department: 'procurement',
    priority: 'medium',
    description: '',
    notes: '',
    orderDate: new Date().toISOString().slice(0, 10),
    deliveryDate: '',
    shipToAddress: '',
    poId: '',
    receiptDate: new Date().toISOString().slice(0, 10),
    warehouse: '',
    receivedBy: '',
    qualityStatus: 'pending',
    vendorBillRef: '',
    billDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
    billStatus: 'unpaid',
  })
  const [items, setItems] = useState([newLineItem()])
  const [vendors, setVendors] = useState([])
  const [serialSetting, setSerialSetting] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const selectedVendor = vendors.find(vendor => String(vendor.id) === String(formData.vendorId))
  const subtotal = items.reduce((total, item) => total + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0)
  const taxAmount = items.reduce((total, item) => total + Number(item.quantity || 0) * Number(item.unitPrice || 0) * Number(item.taxPct || 0) / 100, 0)
  const totalAmount = subtotal + taxAmount

  useEffect(() => {
    fetchVendors({ status: 'active' })
      .then(response => setVendors(response.data || []))
      .catch(err => setError(err.message || 'Unable to load vendors from database.'))
  }, [])

  useEffect(() => {
    fetchDocumentSerialSetting(formData.type)
      .then(response => {
        setSerialSetting(response.data)
        setFormData(current => ({ ...current, docId: response.data?.next_document_number || '' }))
      })
      .catch(err => setError(err.message || 'Unable to load serial number settings.'))
  }, [formData.type])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleItemChange = (index, field, value) => {
    const newItems = [...items]
    newItems[index][field] = value
    setItems(newItems)
  }

  const addItem = () => {
    setItems([...items, newLineItem()])
  }

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.vendorId) {
      setError('Select a vendor before saving this document.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const response = await createFinancialDocument({ ...formData, items, subtotal, taxAmount, totalAmount })
      const generatedNumber = response.document_number ? ` (${response.document_number})` : ''
      onCreated(`Document created successfully${generatedNumber}!`)
    } catch (err) {
      setError(err.message || 'Failed to create document')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="view active">
      <div className="view-header">
        <div>
          <h1 className="view-title">Create Document</h1>
          <p className="view-subtitle">Create PO, GRN, and Bill records with vendor and line item details</p>
        </div>
      </div>

      {error && (
        <div className="toast error" style={{ position: 'relative', margin: '0 0 var(--sp-6) 0', width: '100%', right: 0, bottom: 0, animation: 'none' }}>
          <span className="toast-icon">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="#DC2626" strokeWidth="1.4"/><path d="M6 6l4 4M10 6l-4 4" stroke="#DC2626" strokeWidth="1.4" strokeLinecap="round"/></svg>
          </span>
          <div className="toast-body">
            <div className="toast-title">Error</div>
            <div className="toast-msg">{error}</div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--sp-6)' }}>
        <div className="form-main" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
          <div className="panel" style={{ padding: 'var(--sp-5)' }}>
            <h3 className="form-section-title" style={{ marginBottom: 'var(--sp-4)' }}>Basic Information</h3>
            <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
              <div className="field-group" style={{ gridColumn: '1 / -1' }}>
                <label className="field-label required">Document Title</label>
                <input type="text" name="title" value={formData.title} onChange={handleChange} className="field-input" placeholder="e.g. Purchase Order — Tata Steel Q1 2025" required />
              </div>
              <div className="field-group">
                <label className="field-label required">{documentNumberLabel(formData.type)}</label>
                <input type="text" name="docId" value={formData.docId} className="field-input font-mono" placeholder="Auto-generated" readOnly required />
                <span className="field-hint">
                  Auto generated from {serialSetting ? `${serialSetting.prefix}${serialSetting.range_start}-${serialSetting.range_end}` : 'Admin serial settings'} when saved.
                </span>
              </div>
              <div className="field-group">
                <label className="field-label required">Document Type</label>
                <select name="type" value={formData.type} onChange={handleChange} className="field-select" required>
                  <option value="po">Purchase Order (PO)</option>
                  <option value="grn">Goods Receipt Note (GRN)</option>
                  <option value="bill">Bill / Invoice</option>
                </select>
              </div>
              <div className="field-group" style={{ gridColumn: '1 / -1' }}>
                <label className="field-label required">Vendor</label>
                <select name="vendorId" value={formData.vendorId} onChange={handleChange} className="field-select" required>
                  <option value="">Select vendor...</option>
                  {vendors.map(vendor => (
                    <option key={vendor.id} value={vendor.id}>{vendor.vendor_code} - {vendor.name}</option>
                  ))}
                </select>
                {selectedVendor && (
                  <span className="field-hint">
                    GSTIN {selectedVendor.gstin} · {selectedVendor.payment_terms} · Limit {formatCurrency(selectedVendor.credit_limit)}
                  </span>
                )}
              </div>
              <div className="field-group" style={{ gridColumn: '1 / -1' }}>
                <label className="field-label required">Description</label>
                <textarea name="description" value={formData.description} onChange={handleChange} className="field-textarea" placeholder="Provide a clear description..." rows={4} required></textarea>
              </div>
            </div>
          </div>

          <div className="panel" style={{ padding: 'var(--sp-5)' }}>
            <h3 className="form-section-title" style={{ marginBottom: 'var(--sp-4)' }}>{typeDetailsTitle(formData.type)}</h3>
            <TypeSpecificFields formData={formData} handleChange={handleChange} />
          </div>

          <div className="panel" style={{ padding: 'var(--sp-5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
              <h3 className="form-section-title" style={{ margin: 0 }}>Line Items</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={addItem}>+ Add Item</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
              {items.map((item, index) => (
                <div key={index} className="line-item-grid">
                  <div className="field-group" style={{ marginBottom: 0 }}>
                    <label className="field-label required" style={{ fontSize: '11px' }}>Item</label>
                    <select required value={item.itemId} onChange={(e) => handleItemChange(index, 'itemId', e.target.value)} className="field-select">
                      <option value="">Select item...</option>
                      <option value="1">ITM-001 - M.S. Steel Rod 12mm</option>
                      <option value="2">ITM-002 - Copper Wire 2.5 sqmm</option>
                      <option value="3">ITM-003 - Industrial Lubricant</option>
                      <option value="4">ITM-004 - Safety Helmet</option>
                      <option value="5">ITM-005 - Packaging Film</option>
                    </select>
                  </div>
                  <div className="field-group" style={{ marginBottom: 0 }}>
                    <label className="field-label required" style={{ fontSize: '11px' }}>{quantityLabel(formData.type)}</label>
                    <input type="number" step="0.01" required value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} className="field-input" placeholder="0.00" />
                  </div>
                  {formData.type === 'grn' && (
                    <>
                      <div className="field-group" style={{ marginBottom: 0 }}>
                        <label className="field-label required" style={{ fontSize: '11px' }}>Accepted</label>
                        <input type="number" step="0.01" required value={item.acceptedQty} onChange={(e) => handleItemChange(index, 'acceptedQty', e.target.value)} className="field-input" placeholder="0.00" />
                      </div>
                      <div className="field-group" style={{ marginBottom: 0 }}>
                        <label className="field-label" style={{ fontSize: '11px' }}>Rejected</label>
                        <input type="number" step="0.01" value={item.rejectedQty} onChange={(e) => handleItemChange(index, 'rejectedQty', e.target.value)} className="field-input" placeholder="0.00" />
                      </div>
                    </>
                  )}
                  <div className="field-group" style={{ marginBottom: 0 }}>
                    <label className="field-label required" style={{ fontSize: '11px' }}>Unit Price (INR)</label>
                    <input type="number" step="0.01" required value={item.unitPrice} onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)} className="field-input" placeholder="0.00" />
                  </div>
                  <div className="field-group" style={{ marginBottom: 0 }}>
                    <label className="field-label" style={{ fontSize: '11px' }}>Tax %</label>
                    <input type="number" step="0.01" value={item.taxPct} onChange={(e) => handleItemChange(index, 'taxPct', e.target.value)} className="field-input" placeholder="18" />
                  </div>
                  <div className="field-group line-description" style={{ marginBottom: 0 }}>
                    <label className="field-label" style={{ fontSize: '11px' }}>Description / Reject Reason</label>
                    <input type="text" value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} className="field-input" placeholder="Line note..." />
                  </div>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => removeItem(index)} disabled={items.length === 1} style={{ height: '36px' }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 3.5h9M5 3.5V2.5h3v1M10 3.5l-.7 7H3.7L3 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="form-sidebar">
          <div className="panel" style={{ padding: 'var(--sp-5)' }}>
            <h3 className="form-section-title" style={{ marginBottom: 'var(--sp-4)' }}>Workflow & Meta</h3>
            <div className="field-group" style={{ marginBottom: 'var(--sp-4)' }}>
              <label className="field-label">Internal Notes</label>
              <textarea name="notes" value={formData.notes} onChange={handleChange} className="field-textarea" placeholder="Internal notes..." rows={3}></textarea>
            </div>
            <div className="field-group" style={{ marginBottom: 'var(--sp-6)' }}>
              <label className="field-label required">Priority</label>
              <select name="priority" value={formData.priority} onChange={handleChange} className="field-select" style={{ width: '100%', padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="doc-preview-card" style={{ marginBottom: 'var(--sp-5)' }}>
              <div className="preview-id">Summary</div>
              <div className="preview-title">{items.length} line item{items.length === 1 ? '' : 's'}</div>
              <div className="preview-meta">
                <span className="type-label">Subtotal {formatCurrency(subtotal)}</span>
                <span className="type-label">Tax {formatCurrency(taxAmount)}</span>
                <span className="badge approved">Total {formatCurrency(totalAmount)}</span>
              </div>
            </div>

            <button className="btn btn-primary btn-full" disabled={loading} type="submit" style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '10px' }}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 7l3 3 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              {loading ? 'Saving...' : 'Save Document'}
            </button>
          </div>
        </aside>
      </form>
    </section>
  )
}

function TypeSpecificFields({ formData, handleChange }) {
  if (formData.type === 'po') {
    return (
      <div className="form-grid-2">
        <FormInput label="Order Date" name="orderDate" type="date" value={formData.orderDate} onChange={handleChange} required />
        <FormInput label="Delivery Date" name="deliveryDate" type="date" value={formData.deliveryDate} onChange={handleChange} />
        <FormInput label="Department" name="department" value={formData.department} onChange={handleChange} />
        <FormInput label="Ship To Address" name="shipToAddress" value={formData.shipToAddress} onChange={handleChange} className="full-width" required />
      </div>
    )
  }

  if (formData.type === 'grn') {
    return (
      <div className="form-grid-2">
        <FormInput label="Linked PO ID / Number" name="poId" value={formData.poId} onChange={handleChange} placeholder="Optional, e.g. PO-2026-002" />
        <FormInput label="Receipt Date" name="receiptDate" type="date" value={formData.receiptDate} onChange={handleChange} required />
        <FormInput label="Received By" name="receivedBy" value={formData.receivedBy} onChange={handleChange} required />
        <FormInput label="Warehouse" name="warehouse" value={formData.warehouse} onChange={handleChange} required />
        <div className="field-group">
          <label className="field-label required">Quality Status</label>
          <select name="qualityStatus" value={formData.qualityStatus} onChange={handleChange} className="field-select" required>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="partial">Partial</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>
    )
  }

  return (
    <div className="form-grid-2">
      <FormInput label="Vendor Bill Ref" name="vendorBillRef" value={formData.vendorBillRef} onChange={handleChange} required />
      <FormInput label="Linked PO ID / Number" name="poId" value={formData.poId} onChange={handleChange} placeholder="Optional" />
      <FormInput label="Linked GRN ID / Number" name="grnId" value={formData.grnId || ''} onChange={handleChange} placeholder="Optional" />
      <FormInput label="Bill Date" name="billDate" type="date" value={formData.billDate} onChange={handleChange} required />
      <FormInput label="Due Date" name="dueDate" type="date" value={formData.dueDate} onChange={handleChange} required />
      <div className="field-group">
        <label className="field-label required">Bill Status</label>
        <select name="billStatus" value={formData.billStatus} onChange={handleChange} className="field-select" required>
          <option value="unpaid">Unpaid</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="disputed">Disputed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
    </div>
  )
}

function FormInput({ label, name, value, onChange, type = 'text', placeholder = '', required = false, className = '' }) {
  return (
    <div className={`field-group ${className}`}>
      <label className={`field-label ${required ? 'required' : ''}`}>{label}</label>
      <input className="field-input" name={name} type={type} value={value} onChange={onChange} placeholder={placeholder} required={required} />
    </div>
  )
}

function newLineItem() {
  return {
    itemId: '',
    quantity: '',
    acceptedQty: '',
    rejectedQty: '0',
    unitPrice: '',
    taxPct: '18',
    description: '',
  }
}

function documentNumberLabel(type) {
  return { po: 'PO Number', grn: 'GRN Number', bill: 'Bill Number' }[type] || 'Document Number'
}

function typeDetailsTitle(type) {
  return { po: 'Purchase Order Details', grn: 'Receipt & QC Details', bill: 'Bill & Payment Details' }[type] || 'Document Details'
}

function quantityLabel(type) {
  return { po: 'Ordered Qty', grn: 'Received Qty', bill: 'Billed Qty' }[type] || 'Quantity'
}

function buildChartData(result) {
  if (!result?.rows?.length) return []

  const numericIndex = result.rows[0].findIndex((value) => typeof value === 'number')
  if (numericIndex === -1) return []

  const labelIndex = result.rows[0].findIndex((value, index) => index !== numericIndex && value != null)

  return result.rows.slice(0, 8).map((row, index) => ({
    label: String(row[labelIndex] || `Row ${index + 1}`).slice(0, 18),
    value: Number(row[numericIndex] || 0),
  }))
}

function formatCell(value) {
  if (value == null) return '—'
  if (typeof value === 'number') return value.toLocaleString('en-IN')
  return String(value)
}

function escapeCsvCell(value) {
  if (value == null) return ''
  const cell = String(value)
  return /[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell
}

export default App
