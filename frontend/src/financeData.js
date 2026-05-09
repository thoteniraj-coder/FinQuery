export function apiCollectionsToDocuments({ purchaseOrders = [], grns = [], bills = [] }) {
  return [
    ...purchaseOrders.map(poToDocument),
    ...grns.map(grnToDocument),
    ...bills.map(billToDocument),
  ].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
}

export function poToDocument(row) {
  return {
    id: row.po_number || `PO-${row.id}`,
    recordId: row.id,
    title: `Purchase Order - ${row.vendor_name || 'Vendor'}`,
    type: 'po',
    department: 'procurement',
    category: 'vendor',
    priority: priorityFromAmount(row.total_amount),
    status: reviewStatus(row.review_status, row.status),
    version: '1.0',
    dueDate: row.delivery_date,
    reviewerName: 'Finance Reviewer',
    description: row.notes || `Purchase order for ${row.vendor_name || 'selected vendor'}`,
    createdAt: row.order_date,
    totalAmount: Number(row.total_amount || 0),
    vendorName: row.vendor_name,
    timeline: [
      { action: 'Document created', actor: 'System', time: row.order_date, type: 'create' },
    ],
  }
}

export function grnToDocument(row) {
  return {
    id: row.grn_number || `GRN-${row.id}`,
    recordId: row.id,
    title: `GRN - ${row.vendor_name || 'Vendor'}`,
    type: 'grn',
    department: 'stores',
    category: 'vendor',
    priority: row.quality_status === 'rejected' ? 'high' : 'medium',
    status: reviewStatus(row.review_status, row.quality_status),
    version: '1.0',
    dueDate: row.receipt_date,
    reviewerName: 'QC Reviewer',
    description: row.notes || `Goods receipt for ${row.vendor_name || 'selected vendor'}`,
    createdAt: row.receipt_date,
    totalAmount: Number(row.total_received_value || 0),
    vendorName: row.vendor_name,
    timeline: [
      { action: 'Goods received', actor: row.received_by || 'System', time: row.receipt_date, type: 'create' },
    ],
  }
}

export function billToDocument(row) {
  return {
    id: row.bill_number || `BILL-${row.id}`,
    recordId: row.id,
    title: `Bill - ${row.vendor_name || row.vendor_bill_ref || 'Vendor'}`,
    type: 'bill',
    department: 'finance',
    category: 'financial',
    priority: row.status === 'overdue' || row.status === 'disputed' ? 'critical' : priorityFromAmount(row.total_amount),
    status: reviewStatus(row.review_status, row.status),
    version: '1.0',
    dueDate: row.due_date,
    reviewerName: 'AP Reviewer',
    description: row.vendor_bill_ref ? `Vendor bill reference ${row.vendor_bill_ref}` : `Bill from ${row.vendor_name || 'selected vendor'}`,
    createdAt: row.bill_date,
    totalAmount: Number(row.total_amount || 0),
    vendorName: row.vendor_name,
    timeline: [
      { action: 'Bill recorded', actor: 'System', time: row.bill_date, type: 'create' },
    ],
  }
}

export function reviewStatus(review_status, nativeStatus) {
  if (review_status) return review_status
  if (['closed', 'paid', 'accepted'].includes(nativeStatus)) return 'approved'
  if (['cancelled', 'disputed', 'rejected'].includes(nativeStatus)) return 'rejected'
  return 'pending'
}

export function priorityFromAmount(amount) {
  const value = Number(amount || 0)
  if (value >= 300000) return 'high'
  if (value >= 100000) return 'medium'
  return 'low'
}
