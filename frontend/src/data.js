export const CURRENT_USER = {
  id: 1,
  name: 'Niraj Patel',
  email: 'admin@finquery.com',
  role: 'admin',
  department: 'Finance',
  avatar_initials: 'NP',
  active: true,
}

export const SAMPLE_USERS = [
  { id: 1, name: 'Niraj Patel', email: 'admin@finquery.com', role: 'admin', department: 'Finance', active: true, last_login_at: '2026-05-09T09:30:00' },
  { id: 2, name: 'Meera Iyer', email: 'manager@finquery.com', role: 'finance_manager', department: 'Procurement', active: true, last_login_at: '2026-05-08T17:10:00' },
  { id: 3, name: 'Anil Sharma', email: 'reviewer@finquery.com', role: 'reviewer', department: 'Accounts Payable', active: true, last_login_at: '2026-05-07T11:42:00' },
  { id: 4, name: 'Ravi Kumar', email: 'ravi.kumar@finquery.com', role: 'viewer', department: 'Operations', active: false, last_login_at: '2026-04-28T14:25:00' },
]

export const SAMPLE_VENDORS = [
  {
    id: 1, vendor_code: 'VEN-0001', name: 'Tata Steel Supplies', gstin: '27AAACT2727Q1ZW', pan: 'AAACT2727Q',
    address: 'Lower Parel business district', city: 'Mumbai', state: 'Maharashtra', pin: '400013',
    contact_name: 'Anita Rao', contact_email: 'anita@tatasteel.example', contact_phone: '9000010001',
    payment_terms: 'Net 30', credit_limit: 1500000, bank_account_no: '009912340001', bank_ifsc: 'HDFC0001234',
    bank_name: 'HDFC Bank', status: 'active',
  },
  {
    id: 2, vendor_code: 'VEN-0002', name: 'Bharat Electrical Traders', gstin: '29AABCB1234C1Z7', pan: 'AABCB1234C',
    address: 'Peenya Industrial Area', city: 'Bengaluru', state: 'Karnataka', pin: '560058',
    contact_name: 'Rohit Menon', contact_email: 'rohit@bharatelectrical.example', contact_phone: '9000010002',
    payment_terms: 'Net 60', credit_limit: 850000, bank_account_no: '008812340002', bank_ifsc: 'ICIC0004567',
    bank_name: 'ICICI Bank', status: 'active',
  },
  {
    id: 3, vendor_code: 'VEN-0003', name: 'Western Industrial Oils', gstin: '24AACFW9988P1Z5', pan: 'AACFW9988P',
    address: 'Vatva GIDC', city: 'Ahmedabad', state: 'Gujarat', pin: '382445',
    contact_name: 'Neha Shah', contact_email: 'neha@wio.example', contact_phone: '9000010003',
    payment_terms: 'Immediate', credit_limit: 350000, bank_account_no: '007712340003', bank_ifsc: 'SBIN0007890',
    bank_name: 'State Bank of India', status: 'inactive',
  },
]

export const MATCH_LINES = [
  {
    po_item_id: 1, item_code: 'ITM-001', item_name: 'M.S. Steel Rod 12mm', uom: 'Kg',
    unit_price: 62.5, tax_pct: 18, qty_ordered: 5000, qty_received: 5000, qty_billed: 5000,
    po_value: 312500, grn_value: 312500, bill_value: 312500, variance: 0, match_status: 'matched',
  },
  {
    po_item_id: 2, item_code: 'ITM-002', item_name: 'Copper Wire 2.5 sqmm', uom: 'Mtr',
    unit_price: 38, tax_pct: 18, qty_ordered: 5000, qty_received: 4000, qty_billed: 4500,
    po_value: 190000, grn_value: 152000, bill_value: 171000, variance: 500, match_status: 'overbilled',
  },
  {
    po_item_id: 3, item_code: 'ITM-003', item_name: 'Industrial Lubricant', uom: 'Ltr',
    unit_price: 210, tax_pct: 18, qty_ordered: 400, qty_received: 300, qty_billed: 300,
    po_value: 84000, grn_value: 63000, bill_value: 63000, variance: 0, match_status: 'short_delivery',
  },
]

export const SAMPLE_DOCS = [
  {
    id: 'FQ-2024-001', title: 'Purchase Order — Tata Steel Q1 2025',
    type: 'po', department: 'procurement', category: 'vendor',
    priority: 'high', status: 'approved', version: '1.0',
    dueDate: '2025-02-15', reviewer: 'anil.sharma', reviewerName: 'Anil Sharma',
    description: 'Quarterly purchase order for steel rods and sheets from Tata Steel Ltd.',
    tags: ['steel', 'Q1-2025', 'vendor'], notes: 'Approved after 3-way match verification.',
    createdAt: '2024-12-10T09:22:00', files: [],
    timeline: [
      { action: 'Document created', actor: 'Niraj Patel', time: '2024-12-10T09:22:00', type: 'create' },
      { action: 'Submitted for review', actor: 'Niraj Patel', time: '2024-12-11T10:00:00', type: 'submit' },
      { action: 'Approved', actor: 'Anil Sharma', time: '2024-12-13T14:30:00', type: 'approve', comment: 'All line items verified.' },
    ]
    , matchLines: [MATCH_LINES[0]]
  },
  {
    id: 'FQ-2024-002', title: 'GRN — Infosys Supplies IT Equipment',
    type: 'grn', department: 'it', category: 'vendor',
    priority: 'medium', status: 'pending', version: '1.0',
    dueDate: '2025-01-20', reviewer: 'priya.nair', reviewerName: 'Priya Nair',
    description: 'Goods receipt note for IT equipment delivered by Infosys Supplies.',
    tags: ['IT', 'hardware', 'GRN'], notes: 'QC pending for 3 laptops.',
    createdAt: '2024-12-18T11:45:00', files: [],
    timeline: [
      { action: 'Document created', actor: 'Niraj Patel', time: '2024-12-18T11:45:00', type: 'create' },
      { action: 'Submitted for review', actor: 'Niraj Patel', time: '2024-12-19T09:00:00', type: 'submit' },
    ]
    , matchLines: [MATCH_LINES[1], MATCH_LINES[2]]
  },
  {
    id: 'FQ-2024-003', title: 'Invoice — Mahindra Parts Q4 2024',
    type: 'bill', department: 'finance', category: 'financial',
    priority: 'critical', status: 'rejected', version: '2.0',
    dueDate: '2024-12-31', reviewer: 'ravi.kumar', reviewerName: 'Ravi Kumar',
    description: 'Vendor invoice from Mahindra Parts for engine components.',
    tags: ['invoice', 'mahindra', 'dispute'], notes: 'Returned to vendor for correction.',
    createdAt: '2024-12-05T08:30:00', files: [],
    timeline: [
      { action: 'Document created', actor: 'Niraj Patel', time: '2024-12-05T08:30:00', type: 'create' },
      { action: 'Rejected', actor: 'Ravi Kumar', time: '2024-12-08T16:00:00', type: 'reject', comment: 'Quantity mismatch.' },
    ]
    , matchLines: [MATCH_LINES[1]]
  }
];

export const ACTIVITY_SEED = [
  { actor: 'Anil Sharma', actorInitials: 'AS', action: 'approved', doc: 'FQ-2024-001', time: '14:30', color: '#16A34A', bg: '#F0FDF4' },
  { actor: 'Niraj Patel', actorInitials: 'NP', action: 'created', doc: 'FQ-2024-005', time: '10:00', color: '#2563EB', bg: '#EFF6FF' },
  { actor: 'Ravi Kumar', actorInitials: 'RK', action: 'rejected', doc: 'FQ-2024-003', time: 'Yesterday', color: '#DC2626', bg: '#FEF2F2' },
];

export function capitalise(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

export function getTypeLabel(type) {
  const map = { po:'Purchase Order', grn:'GRN', bill:'Bill/Invoice', contract:'Contract', policy:'Policy', report:'Report', other:'Other' };
  return map[type] || type;
}

export function getTypeColor(type) {
  const map = { po:'stat-icon--blue', grn:'stat-icon--green', bill:'stat-icon--amber', contract:'stat-icon--purple', report:'stat-icon--red', policy:'', other:'' };
  return map[type] || '';
}

export function getPriorityLabel(p) {
  const m = { low:'Low', medium:'Medium', high:'High', critical:'Critical' };
  return m[p] || p;
}

export function getInitials(name) {
  return (name || '').split(' ').map(w => w[0]).join('').substring(0,2).toUpperCase();
}

export function formatCurrency(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  });
}

export function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
