import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  BarChart3,
  Database,
  Download,
  Play,
  RefreshCw,
  Sparkles,
  Table2,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { askFinquery, fetchHealth, fetchSchema, runSql } from './api'
import './App.css'

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
  const [mode, setMode] = useState('ai')
  const [prompt, setPrompt] = useState(EXAMPLE_PROMPTS[0])
  const [sql, setSql] = useState(SAMPLE_SQL)
  const [result, setResult] = useState(null)
  const [model, setModel] = useState('')
  const [schema, setSchema] = useState(null)
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
    event.preventDefault()
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
    event.preventDefault()
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

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Database size={22} />
          </div>
          <div>
            <h1>FinQuery AI</h1>
            <p>Procurement intelligence</p>
          </div>
        </div>

        <div className="status-panel">
          <StatusItem label="API" value={health?.status || 'offline'} active={health?.status === 'ok'} />
          <StatusItem label="Tables" value={tableCount || '-'} />
          <StatusItem label="Columns" value={columnCount || '-'} />
        </div>

        <div className="examples">
          {EXAMPLE_PROMPTS.map((item) => (
            <button
              className="example-button"
              key={item}
              onClick={() => {
                setMode('ai')
                setPrompt(item)
              }}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>

        <button className="ghost-button" onClick={refreshMeta} type="button">
          <RefreshCw size={16} />
          Refresh
        </button>
      </aside>

      <section className="workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">Financial document query</p>
            <h2>Ask, inspect SQL, and export results</h2>
          </div>
          <div className="mode-switch" aria-label="Query mode">
            <button
              className={mode === 'ai' ? 'active' : ''}
              onClick={() => setMode('ai')}
              type="button"
            >
              <Sparkles size={16} />
              AI
            </button>
            <button
              className={mode === 'sql' ? 'active' : ''}
              onClick={() => setMode('sql')}
              type="button"
            >
              <Database size={16} />
              SQL
            </button>
          </div>
        </header>

        {error && (
          <div className="error-banner">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {mode === 'ai' ? (
          <form className="query-panel" onSubmit={submitAi}>
            <label htmlFor="prompt">Question</label>
            <textarea
              id="prompt"
              onChange={(event) => setPrompt(event.target.value)}
              rows={4}
              value={prompt}
            />
            <button className="primary-button" disabled={loading} type="submit">
              <Play size={17} />
              {loading ? 'Running' : 'Run AI Query'}
            </button>
          </form>
        ) : (
          <form className="query-panel" onSubmit={submitSql}>
            <label htmlFor="sql">SQL</label>
            <textarea
              className="sql-input"
              id="sql"
              onChange={(event) => setSql(event.target.value)}
              rows={8}
              value={sql}
            />
            <button className="primary-button" disabled={loading} type="submit">
              <Play size={17} />
              {loading ? 'Running' : 'Run SQL'}
            </button>
          </form>
        )}

        <section className="result-grid">
          <div className="sql-panel">
            <div className="panel-title">
              <Database size={17} />
              Generated SQL
              {model && <span>{model}</span>}
            </div>
            <pre>{sql}</pre>
          </div>

          <div className="chart-panel">
            <div className="panel-title">
              <BarChart3 size={17} />
              Numeric Preview
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer height={260} width="100%">
                <BarChart data={chartData}>
                  <CartesianGrid stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} />
                  <YAxis tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0f766e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">No numeric column</div>
            )}
          </div>
        </section>

        <section className="table-panel">
          <div className="table-toolbar">
            <div className="panel-title">
              <Table2 size={17} />
              Result Table
              {result && <span>{result.row_count} rows</span>}
            </div>
            <button
              className="icon-button"
              disabled={!result?.rows?.length}
              onClick={exportCsv}
              title="Export CSV"
              type="button"
            >
              <Download size={17} />
            </button>
          </div>
          <ResultTable result={result} />
        </section>
      </section>
    </main>
  )
}

function StatusItem({ active = false, label, value }) {
  return (
    <div className="status-item">
      <span>{label}</span>
      <strong className={active ? 'active' : ''}>{value}</strong>
    </div>
  )
}

function ResultTable({ result }) {
  if (!result) {
    return <div className="empty-state">No result</div>
  }

  if (result.rows.length === 0) {
    return <div className="empty-state">0 rows</div>
  }

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {result.columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, rowIndex) => (
            <tr key={`${row.join('-')}-${rowIndex}`}>
              {row.map((value, columnIndex) => (
                <td key={`${result.columns[columnIndex]}-${columnIndex}`}>{formatCell(value)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
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
  if (value == null) return '-'
  if (typeof value === 'number') return value.toLocaleString('en-IN')
  return String(value)
}

function escapeCsvCell(value) {
  if (value == null) return ''
  const cell = String(value)
  return /[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell
}

export default App
