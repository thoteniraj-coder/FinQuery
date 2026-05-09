import { useEffect, useState } from 'react';
import { fetchBills, fetchGrns, fetchMatch, fetchPurchaseOrders } from '../api';
import { capitalise, formatCurrency, formatDate } from '../data';

export function POView({ setCurrentView }) {
  const { rows: purchaseOrders, loading, error } = useApiRows(fetchPurchaseOrders);

  return (
    <FinanceTable
      title="Purchase Orders"
      subtitle="PO status, review state, and spend exposure"
      rows={purchaseOrders}
      loading={loading}
      error={error}
      columns={[
        ['PO Number', row => row.po_number],
        ['Vendor', row => row.vendor_name],
        ['Order Date', row => formatDate(row.order_date)],
        ['Delivery Date', row => formatDate(row.delivery_date)],
        ['Status', row => <span className="type-label">{capitalise(row.status)}</span>],
        ['Review', row => <span className={`badge ${reviewStatus(row.review_status, row.status)}`}>{capitalise(reviewStatus(row.review_status, row.status))}</span>],
        ['Amount', row => formatCurrency(row.total_amount)],
      ]}
      action={<button className="btn btn-primary btn-sm" onClick={() => setCurrentView('create')}>Create PO</button>}
      footer={<MatchSnapshot purchaseOrders={purchaseOrders} />}
    />
  );
}

export function GRNView({ setCurrentView }) {
  const { rows: grns, loading, error } = useApiRows(fetchGrns);

  return (
    <FinanceTable
      title="Goods Receipt Notes"
      subtitle="Accepted quantity, QC status, warehouse, and review state"
      rows={grns}
      loading={loading}
      error={error}
      columns={[
        ['GRN Number', row => row.grn_number],
        ['Vendor', row => row.vendor_name],
        ['Receipt Date', row => formatDate(row.receipt_date)],
        ['Warehouse', row => row.warehouse],
        ['Quality', row => <span className="type-label">{capitalise(row.quality_status)}</span>],
        ['Review', row => <span className={`badge ${reviewStatus(row.review_status, row.quality_status)}`}>{capitalise(reviewStatus(row.review_status, row.quality_status))}</span>],
        ['Accepted Value', row => formatCurrency(row.total_received_value)],
      ]}
      action={<button className="btn btn-primary btn-sm" onClick={() => setCurrentView('create')}>Create GRN</button>}
    />
  );
}

export function BillsView({ setCurrentView }) {
  const { rows: bills, loading, error } = useApiRows(fetchBills);

  return (
    <FinanceTable
      title="Bills & Invoices"
      subtitle="Vendor bills, due dates, payment status, and approval progress"
      rows={bills}
      loading={loading}
      error={error}
      columns={[
        ['Bill Number', row => row.bill_number],
        ['Vendor', row => row.vendor_name],
        ['Vendor Ref', row => row.vendor_bill_ref],
        ['Bill Date', row => formatDate(row.bill_date)],
        ['Due Date', row => formatDate(row.due_date)],
        ['Status', row => <span className={`badge ${row.status === 'paid' ? 'approved' : row.status === 'overdue' || row.status === 'disputed' ? 'rejected' : 'pending'}`}>{capitalise(row.status)}</span>],
        ['Review', row => <span className={`badge ${reviewStatus(row.review_status, row.status)}`}>{capitalise(reviewStatus(row.review_status, row.status))}</span>],
        ['Amount', row => formatCurrency(row.total_amount)],
      ]}
      action={<button className="btn btn-primary btn-sm" onClick={() => setCurrentView('create')}>Create Bill</button>}
    />
  );
}

function FinanceTable({ title, subtitle, rows, columns, action, footer, loading, error }) {
  return (
    <section className="view active" aria-label={title}>
      <div className="view-header">
        <div>
          <h1 className="view-title">{title}</h1>
          <p className="view-subtitle">{subtitle}</p>
        </div>
        {action}
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>{columns.map(([label]) => <th key={label}>{label}</th>)}</tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={columns.length}><div className="empty-state">Loading database rows...</div></td></tr>}
            {error && <tr><td colSpan={columns.length}><div className="empty-state">{error}</div></td></tr>}
            {!loading && !error && rows.length === 0 && <tr><td colSpan={columns.length}><div className="empty-state">No records found in the database.</div></td></tr>}
            {!loading && !error && rows.map((row, index) => (
              <tr key={row.id || row.po_number || row.grn_number || row.bill_number || index}>
                {columns.map(([label, render]) => <td key={label}>{render(row) || '-'}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer}
    </section>
  );
}

function MatchSnapshot({ purchaseOrders }) {
  const [lines, setLines] = useState([]);

  useEffect(() => {
    const openPo = purchaseOrders.find(row => row.status !== 'closed' && row.status !== 'cancelled') || purchaseOrders[0];
    if (!openPo) {
      Promise.resolve().then(() => setLines([]));
      return;
    }

    fetchMatch('po', openPo.po_number || openPo.id)
      .then(response => setLines(response.data?.lines || []))
      .catch(() => setLines([]));
  }, [purchaseOrders]);

  const issueCount = lines.filter(line => line.match_status !== 'matched').length;

  return (
    <div className="finance-snapshot">
      <div>
        <h2 className="panel-title">3-way match snapshot</h2>
        <p className="view-subtitle">{issueCount} line items need review across open purchase orders.</p>
      </div>
      <div className="snapshot-lines">
        {lines.length === 0 && <div className="empty-state" style={{ padding: 'var(--sp-4)' }}>No match data available.</div>}
        {lines.map(line => (
          <div key={line.po_item_id} className={`snapshot-line ${line.match_status}`}>
            <span className="font-mono">{line.item_code}</span>
            <span>{line.item_name}</span>
            <strong>{capitalise(line.match_status.replace('_', ' '))}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function useApiRows(fetcher) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    fetcher()
      .then(response => {
        if (!ignore) setRows(response.data || []);
      })
      .catch(err => {
        if (!ignore) setError(err.message || 'Unable to load database rows.');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [fetcher]);

  return { rows, loading, error };
}

function reviewStatus(review_status, nativeStatus) {
  if (review_status) return review_status;
  if (['closed', 'paid', 'accepted'].includes(nativeStatus)) return 'approved';
  if (['cancelled', 'disputed', 'rejected'].includes(nativeStatus)) return 'rejected';
  return 'pending';
}
