import { useEffect, useState } from 'react';
import { fetchFinancialDocuments } from '../api';
import { apiCollectionsToDocuments } from '../financeData';
import { ACTIVITY_SEED, getTypeColor, capitalise, formatDate } from '../data';

export default function DashboardView({ setCurrentView }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinancialDocuments()
      .then(collections => setDocs(apiCollectionsToDocuments(collections)))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  }, []);

  const total = docs.length;
  const pending = docs.filter(d => d.status === 'pending').length;
  const approved = docs.filter(d => d.status === 'approved').length;
  const rejected = docs.filter(d => d.status === 'rejected').length;

  const recent = [...docs].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0,5);

  return (
    <section className="view active" id="view-dashboard" aria-label="Dashboard">
      <div className="view-header">
        <div>
          <h1 className="view-title">Dashboard</h1>
          <p className="view-subtitle">Financial document workflow overview</p>
        </div>
        <div className="view-header-actions">
          <span className="topbar-date">{new Date().toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'long', year:'numeric' })}</span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="stats-grid" id="stats-grid">
        <div className="stat-card" style={{'--delay':'0ms'}}>
          <div className="stat-icon stat-icon--blue">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M10.5 1.5H4.5A1.5 1.5 0 003 3v12a1.5 1.5 0 001.5 1.5h9A1.5 1.5 0 0015 15V6l-4.5-4.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M10.5 1.5V6H15" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{total}</span>
            <span className="stat-label">Total Documents</span>
          </div>
          <div className="stat-trend up">{loading ? 'Loading database' : `+${total} this week`}</div>
        </div>
        <div className="stat-card" style={{'--delay':'60ms'}}>
          <div className="stat-icon stat-icon--amber">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.4"/><path d="M9 5v4l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{pending}</span>
            <span className="stat-label">Pending Review</span>
          </div>
          <div className="stat-trend neutral">Awaiting action</div>
        </div>
        <div className="stat-card" style={{'--delay':'120ms'}}>
          <div className="stat-icon stat-icon--green">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.4"/><path d="M5.5 9.5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{approved}</span>
            <span className="stat-label">Approved</span>
          </div>
          <div className="stat-trend up">+{approved} this month</div>
        </div>
        <div className="stat-card" style={{'--delay':'180ms'}}>
          <div className="stat-icon stat-icon--red">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.4"/><path d="M6 6l6 6M12 6l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{rejected}</span>
            <span className="stat-label">Rejected</span>
          </div>
          <div className="stat-trend neutral">Needs revision</div>
        </div>
      </div>

      {/* Recent Documents + Activity */}
      <div className="dashboard-grid">
        <div className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Recent Documents</h2>
            <button className="panel-link" style={{border:'none', background:'transparent', cursor:'pointer'}} onClick={() => setCurrentView('documents')}>View all →</button>
          </div>
          <div className="recent-list">
            {recent.map(d => (
              <div key={d.id} className="recent-item" role="button" tabIndex="0" onClick={() => setCurrentView('documents')}>
                <div className={`recent-item-icon ${getTypeColor(d.type)}`} style={{background:'var(--surface-2)'}}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M8 1H3a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V5L8 1z" stroke="currentColor" strokeWidth="1.3"/><path d="M8 1v4h4" stroke="currentColor" strokeWidth="1.3"/></svg>
                </div>
                <div className="recent-item-body">
                  <div className="recent-item-title">{d.title}</div>
                  <div className="recent-item-meta">{d.id} · {formatDate(d.createdAt)}</div>
                </div>
                <span className={`badge ${d.status}`}>{capitalise(d.status)}</span>
              </div>
            ))}
            {!loading && recent.length === 0 && (
              <div className="empty-state" style={{ padding: 'var(--sp-5)' }}>No database documents found.</div>
            )}
          </div>
        </div>
        <div className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Activity Feed</h2>
          </div>
          <div className="activity-feed">
            {ACTIVITY_SEED.map((a, i) => (
              <div key={i} className="activity-item">
                <div className="activity-dot" style={{background: a.bg, color: a.color}}>{a.actorInitials}</div>
                <div className="activity-content">
                  <div className="activity-text"><strong>{a.actor}</strong> {a.action} <span style={{color:'var(--accent)', fontFamily:"'DM Mono',monospace", fontSize:'12px'}}>{a.doc}</span></div>
                  <div className="activity-time">{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
