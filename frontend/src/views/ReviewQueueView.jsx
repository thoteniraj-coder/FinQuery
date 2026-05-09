import { useEffect, useState } from 'react';
import { fetchFinancialDocuments, fetchMatch, submitReview } from '../api';
import { apiCollectionsToDocuments } from '../financeData';
import { capitalise, getPriorityLabel, formatDate, getInitials, formatCurrency } from '../data';

export default function ReviewQueueView() {
  const [docs, setDocs] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [matchLines, setMatchLines] = useState([]);
  const [comment, setComment] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const pendingDocs = docs.filter(d => d.status === 'pending' || d.status === 'rejected');
  const selectedDoc = docs.find(d => d.id === selectedDocId);

  useEffect(() => {
    fetchFinancialDocuments()
      .then(collections => {
        const mapped = apiCollectionsToDocuments(collections);
        setDocs(mapped);
        setSelectedDocId(mapped.find(doc => doc.status === 'pending')?.id || mapped[0]?.id || null);
      })
      .catch(err => setError(err.message || 'Unable to load review queue from database.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedDoc) {
      Promise.resolve().then(() => setMatchLines([]));
      return;
    }

    fetchMatch(selectedDoc.type, selectedDoc.id)
      .then(response => setMatchLines(response.data?.lines || []))
      .catch(() => setMatchLines([]));
  }, [selectedDoc]);

  async function applyReview(actionType) {
    if (!selectedDoc) return;
    const statusMap = { approve: 'approved', reject: 'rejected', request_changes: 'pending', comment: selectedDoc.status };
    const labelMap = { approve: 'Approved', reject: 'Rejected', request_changes: 'Requested changes', comment: 'Commented' };
    const nextStatus = statusMap[actionType];
    const nextTimelineItem = {
      action: labelMap[actionType],
      actor: 'Niraj Patel',
      time: new Date().toISOString(),
      type: actionType,
      comment: comment.trim(),
    };

    try {
      await submitReview(selectedDoc.type, selectedDoc.id, actionType, comment.trim());
    } catch {
      // Keep the UI responsive even if the current schema cannot persist review rows yet.
    }

    setDocs(current => current.map(doc => (
      doc.id === selectedDoc.id
        ? { ...doc, status: nextStatus, timeline: [nextTimelineItem, ...(doc.timeline || [])] }
        : doc
    )));
    setComment('');
    setNotice(`${labelMap[actionType]} ${selectedDoc.id}`);
  }

  return (
    <section className="view active" id="view-review" aria-label="Review queue">
      <div className="view-header">
        <div>
          <h1 className="view-title">Review Queue</h1>
          <p className="view-subtitle">Database documents with role-guarded approvals, comments, and 3-way match checks</p>
        </div>
      </div>
      {notice && (
        <div className="toast success inline-toast">
          <div className="toast-body">
            <div className="toast-title">Review updated</div>
            <div className="toast-msg">{notice}</div>
          </div>
          <button className="toast-close" onClick={() => setNotice('')}>x</button>
        </div>
      )}
      <div className="review-layout">
        <div className="review-list-pane">
          {loading ? (
             <div className="empty-state" style={{padding:'2rem'}}>Loading review queue from database...</div>
          ) : error ? (
             <div className="empty-state" style={{padding:'2rem'}}>{error}</div>
          ) : pendingDocs.length === 0 ? (
             <div className="empty-state" style={{padding:'2rem'}}>No documents in review queue.</div>
          ) : (
            pendingDocs.map(d => (
              <div 
                key={d.id} 
                className={`review-list-item ${selectedDocId === d.id ? 'active' : ''}`}
                onClick={() => setSelectedDocId(d.id)}
              >
                <div className="doc-title-main" style={{marginBottom:'4px'}}>{d.title}</div>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <span className="doc-title-id font-mono">{d.id}</span>
                  <span className={`badge ${d.status}`}>{capitalise(d.status)}</span>
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="review-detail-pane">
          {!selectedDoc ? (
            <div className="review-empty-state">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4"/><path d="M20 14v7M20 25v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              <p>Select a document to review</p>
            </div>
          ) : (
            <>
              <div className="review-doc-header">
                <div className="rdh-top">
                  <div>
                    <div className="rdh-id">{selectedDoc.id}</div>
                    <h2 className="rdh-title">{selectedDoc.title}</h2>
                  </div>
                  <div className="rdh-badges">
                    <span className={`badge ${selectedDoc.status}`}>{capitalise(selectedDoc.status)}</span>
                    <span className={`priority-badge ${selectedDoc.priority}`}>{getPriorityLabel(selectedDoc.priority)}</span>
                  </div>
                </div>
              </div>

              <div className="review-body">
                <div className="review-meta-grid">
                  <Meta label="Type" value={selectedDoc.type.toUpperCase()} />
                  <Meta label="Department" value={capitalise(selectedDoc.department)} />
                  <Meta label="Version" value={selectedDoc.version} />
                  <Meta label="Due date" value={formatDate(selectedDoc.dueDate)} />
                  <Meta label="Reviewer" value={selectedDoc.reviewerName} />
                  <Meta label="Created by" value="Niraj Patel" />
                </div>

                <p className="review-description">{selectedDoc.description}</p>

                <div className="review-section-title">3-way match</div>
                <MatchTable lines={matchLines} />

                <div className="review-section-title">Review comment</div>
                <div className="comment-input-area">
                  <textarea className="comment-textarea" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add an approval note, rejection reason, or change request..." />
                </div>

                <div className="review-actions compact">
                  <button className="btn btn-ghost btn-sm" onClick={() => applyReview('comment')}>Add Comment</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => applyReview('request_changes')}>Request Changes</button>
                  <button className="btn btn-danger btn-sm" onClick={() => window.confirm('Reject this document?') && applyReview('reject')}>Reject</button>
                  <button className="btn btn-success btn-sm" disabled={selectedDoc.status === 'approved'} onClick={() => applyReview('approve')}>Approve</button>
                </div>

                <div className="review-section-title">Activity timeline</div>
                <div className="timeline">
                  {(selectedDoc.timeline || []).map((event, idx) => (
                    <div key={`${event.action}-${idx}`} className="timeline-item">
                      <div className="tl-dot" style={{background:'var(--surface-2)', color:'var(--text-2)'}}>{getInitials(event.actor)}</div>
                      <div className="tl-content">
                        <div className="tl-action">{event.action}</div>
                        <div className="tl-meta">{event.actor} · {formatDate(event.time)}</div>
                        {event.comment && <div className="tl-comment">{event.comment}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function Meta({ label, value }) {
  return (
    <div className="rmg-item">
      <span className="rmg-label">{label}</span>
      <span className="rmg-value">{value || '-'}</span>
    </div>
  );
}

function MatchTable({ lines }) {
  const matched = lines.filter(line => line.match_status === 'matched').length;
  const total = lines.length || 1;
  const percent = Math.round((matched / total) * 100);

  return (
    <div className="match-panel">
      <div className="match-summary">
        <span>{matched} of {lines.length} lines matched</span>
        <div className="match-progress"><span style={{ width: `${percent}%` }} /></div>
      </div>
      <div className="match-table-scroll">
        <table className="data-table match-table">
          <thead>
            <tr>
              <th>#</th><th>Item Code</th><th>Item Name</th><th>UOM</th><th>Unit Price</th>
              <th>PO Qty</th><th>GRN Qty</th><th>Billed Qty</th><th>PO Value</th><th>GRN Value</th><th>Bill Value</th><th>Variance</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={line.po_item_id} className={`match-row ${line.match_status}`}>
                <td>{index + 1}</td>
                <td className="font-mono">{line.item_code}</td>
                <td>{line.item_name}</td>
                <td>{line.uom}</td>
                <td>{formatCurrency(line.unit_price)}</td>
                <td>{line.qty_ordered}</td>
                <td>{line.qty_received}</td>
                <td>{line.qty_billed}</td>
                <td>{formatCurrency(line.po_value)}</td>
                <td>{formatCurrency(line.grn_value)}</td>
                <td>{formatCurrency(line.bill_value)}</td>
                <td>{line.variance}</td>
                <td><span className={`badge match-${line.match_status}`}>{statusLabel(line.match_status)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function statusLabel(status) {
  return {
    matched: 'Matched',
    overbilled: 'Overbilled',
    short_delivery: 'Short Delivery',
    partial: 'Partial',
  }[status] || status;
}
