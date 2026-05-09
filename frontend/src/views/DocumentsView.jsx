import { useEffect, useState } from 'react';
import { fetchFinancialDocuments } from '../api';
import { apiCollectionsToDocuments } from '../financeData';
import { getTypeLabel, capitalise, getPriorityLabel, formatDate, getInitials } from '../data';

export default function DocumentsView({ setCurrentView }) {
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table');
  const [search, setSearch] = useState('');
  const [allDocs, setAllDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFinancialDocuments()
      .then(collections => setAllDocs(apiCollectionsToDocuments(collections)))
      .catch(err => setError(err.message || 'Unable to load documents from database.'))
      .finally(() => setLoading(false));
  }, []);

  const docs = allDocs.filter(d => {
    if (filter !== 'all' && d.status !== filter) return false;
    if (search && !d.title.toLowerCase().includes(search.toLowerCase()) && !d.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <section className="view active" id="view-documents" aria-label="Documents">
      <div className="view-header">
        <div>
          <h1 className="view-title">Documents</h1>
          <p className="view-subtitle">All financial documents in one place</p>
        </div>
        <div className="view-header-actions">
          <button className="btn btn-primary btn-sm" onClick={() => setCurrentView('create')}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            New
          </button>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <div className="search-box">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/><path d="M10 10l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            <input type="text" className="search-input-sm" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search documents" />
          </div>
          <div className="filter-chips">
            {['all', 'draft', 'pending', 'approved', 'rejected'].map(f => (
              <button key={f} className={`chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {capitalise(f) || 'All'}
              </button>
            ))}
          </div>
        </div>
        <div className="toolbar-right">
          <div className="view-toggle" role="group" aria-label="View mode">
            <button className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')} aria-label="Table view">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="3" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="1" y="6" width="12" height="3" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="1" y="11" width="12" height="2" rx="1" stroke="currentColor" strokeWidth="1.3"/></svg>
            </button>
            <button className={`view-toggle-btn ${viewMode === 'cards' ? 'active' : ''}`} onClick={() => setViewMode('cards')} aria-label="Card view">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/></svg>
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="table-container">
          <table className="data-table" role="table">
            <thead>
              <tr>
                <th scope="col">Document</th>
                <th scope="col">Type</th>
                <th scope="col">Department</th>
                <th scope="col">Status</th>
                <th scope="col">Priority</th>
                <th scope="col">Due Date</th>
                <th scope="col">Reviewer</th>
                <th scope="col"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8">
                    <div className="empty-state" style={{padding:'2rem'}}>Loading documents from database...</div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="8">
                    <div className="empty-state" style={{padding:'2rem'}}>{error}</div>
                  </td>
                </tr>
              ) : docs.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    <div className="empty-state" style={{padding:'2rem'}}>No documents found.</div>
                  </td>
                </tr>
              ) : (
                docs.map(d => (
                  <tr key={d.id} onClick={() => setCurrentView('review')} style={{cursor:'pointer'}}>
                    <td>
                      <div className="doc-title-cell">
                        <span className="doc-title-main">{d.title}</span>
                        <span className="doc-title-id font-mono">{d.id}</span>
                      </div>
                    </td>
                    <td><span className="type-label">{getTypeLabel(d.type)}</span></td>
                    <td><span style={{fontSize:'13px', color:'var(--text-2)'}}>{capitalise(d.department)}</span></td>
                    <td><span className={`badge ${d.status}`}>{capitalise(d.status)}</span></td>
                    <td><span className={`priority-badge ${d.priority}`}>{getPriorityLabel(d.priority)}</span></td>
                    <td><span className="date-cell">{formatDate(d.dueDate)}</span></td>
                    <td>
                      <div className="reviewer-cell">
                        <div className="avatar-xs">{getInitials(d.reviewerName || d.reviewer)}</div>
                        {d.reviewerName || d.reviewer}
                      </div>
                    </td>
                    <td></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="cards-grid">
          {loading ? (
            <div className="empty-state" style={{gridColumn:'1/-1', padding:'2rem'}}>Loading documents from database...</div>
          ) : error ? (
            <div className="empty-state" style={{gridColumn:'1/-1', padding:'2rem'}}>{error}</div>
          ) : docs.length === 0 ? (
            <div className="empty-state" style={{gridColumn:'1/-1', padding:'2rem'}}>No documents found.</div>
          ) : (
            docs.map(d => (
              <div key={d.id} className="doc-card" onClick={() => setCurrentView('review')} role="button" tabIndex="0">
                <div className="doc-card-header">
                  <span className="doc-card-id font-mono">{d.id}</span>
                  <span className={`badge ${d.status}`}>{capitalise(d.status)}</span>
                </div>
                <div className="doc-card-title">{d.title}</div>
                <div className="doc-card-footer">
                  <div className="reviewer-cell">
                    <div className="avatar-xs">{getInitials(d.reviewerName || d.reviewer)}</div>
                    <span style={{fontSize:'12px'}}>{d.reviewerName || d.reviewer}</span>
                  </div>
                  <span className={`priority-badge ${d.priority}`}>{getPriorityLabel(d.priority)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
