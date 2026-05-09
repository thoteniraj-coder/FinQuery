import { useEffect, useMemo, useState } from 'react';
import { fetchDocumentSerialSettings, fetchUsers, fetchVendors, saveVendor, updateDocumentSerialSetting, updateUser } from '../api';
import { capitalise, formatCurrency, formatDate, getInitials } from '../data';

const STATES = ['Maharashtra', 'Karnataka', 'Gujarat', 'Delhi', 'Tamil Nadu', 'Telangana', 'West Bengal', 'Rajasthan'];
const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export function VendorsView() {
  const [vendors, setVendors] = useState([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchVendors()
      .then(response => setVendors(response.data || []))
      .catch(err => setError(err.message || 'Unable to load vendors from database.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = vendors.filter(vendor => {
    const text = `${vendor.name} ${vendor.gstin} ${vendor.vendor_code}`.toLowerCase();
    return (status === 'all' || vendor.status === status) && text.includes(query.toLowerCase());
  });

  return (
    <section className="view active" aria-label="Vendors">
      <div className="view-header">
        <div>
          <h1 className="view-title">Vendors</h1>
          <p className="view-subtitle">GSTIN, payment terms, contacts, and banking details</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setEditing({})}>New Vendor</button>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <div className="search-box">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/><path d="M10 10l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            <input className="search-input-sm" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search vendors..." />
          </div>
          <select className="select-sm" value={status} onChange={event => setStatus(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="blacklisted">Blacklisted</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th><th>Vendor</th><th>GSTIN</th><th>City</th><th>Payment Terms</th><th>Credit Limit</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="8"><div className="empty-state">Loading vendors from database...</div></td></tr>}
            {error && <tr><td colSpan="8"><div className="empty-state">{error}</div></td></tr>}
            {!loading && !error && filtered.length === 0 && <tr><td colSpan="8"><div className="empty-state">No vendors found in the database.</div></td></tr>}
            {!loading && !error && filtered.map(vendor => (
              <tr key={vendor.id}>
                <td className="font-mono">{vendor.vendor_code}</td>
                <td>
                  <div className="doc-title-cell">
                    <span className="doc-title-main">{vendor.name}</span>
                    <span className="doc-title-id">{vendor.contact_name} · {vendor.contact_phone}</span>
                  </div>
                </td>
                <td className="font-mono">{vendor.gstin}</td>
                <td>{vendor.city}, {vendor.state}</td>
                <td>{vendor.payment_terms}</td>
                <td>{formatCurrency(vendor.credit_limit)}</td>
                <td><span className={`badge ${vendor.status === 'active' ? 'approved' : vendor.status === 'blacklisted' ? 'rejected' : 'draft'}`}>{capitalise(vendor.status)}</span></td>
                <td><button className="btn btn-ghost btn-sm" onClick={() => setEditing(vendor)}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <VendorForm
          vendor={editing}
          onCancel={() => setEditing(null)}
          onSave={async (vendor) => {
            const response = await saveVendor(vendor);
            const saved = response.data;
            setVendors(current => vendor.id || vendor.vendor_code
              ? current.map(item => item.id === saved.id ? saved : item)
              : [saved, ...current]);
            setEditing(null);
          }}
        />
      )}
    </section>
  );
}

function VendorForm({ vendor, onCancel, onSave }) {
  const [form, setForm] = useState({
    status: 'active',
    payment_terms: 'Net 30',
    state: 'Maharashtra',
    credit_limit: 0,
    ...vendor,
  });
  const errors = useMemo(() => ({
    gstin: form.gstin && !GSTIN_RE.test(form.gstin) ? 'Invalid GSTIN format' : '',
    bank_ifsc: form.bank_ifsc && !IFSC_RE.test(form.bank_ifsc) ? 'Invalid IFSC format' : '',
    pin: form.pin && !/^\d{6}$/.test(form.pin) ? 'PIN must be 6 digits' : '',
    contact_phone: form.contact_phone && !/^\d{10}$/.test(form.contact_phone) ? 'Phone must be 10 digits' : '',
  }), [form]);
  const hasErrors = Object.values(errors).some(Boolean);

  function setField(name, value) {
    setForm(current => ({ ...current, [name]: name === 'gstin' || name === 'pan' || name === 'bank_ifsc' ? value.toUpperCase() : value }));
  }

  function submit(event) {
    event.preventDefault();
    if (!hasErrors) onSave(form);
  }

  return (
    <div className="modal-backdrop">
      <form className="modal-panel wide" onSubmit={submit}>
        <div className="modal-header">
          <h2>{form.id ? 'Edit Vendor' : 'New Vendor'}</h2>
          <button type="button" className="row-btn" onClick={onCancel}>x</button>
        </div>
        <div className="form-grid-2">
          <Field label="Vendor Code" value={form.vendor_code || 'Auto-generated'} readOnly />
          <Field label="Name" required value={form.name || ''} onChange={value => setField('name', value)} />
          <Field label="GSTIN" required value={form.gstin || ''} error={errors.gstin} onChange={value => setField('gstin', value)} />
          <Field label="PAN" value={form.pan || ''} onChange={value => setField('pan', value)} />
          <Field label="Address" value={form.address || ''} onChange={value => setField('address', value)} className="full-width" />
          <Field label="City" value={form.city || ''} onChange={value => setField('city', value)} />
          <Select label="State" value={form.state} options={STATES} onChange={value => setField('state', value)} />
          <Field label="PIN" value={form.pin || ''} error={errors.pin} onChange={value => setField('pin', value)} />
          <Field label="Contact Name" value={form.contact_name || ''} onChange={value => setField('contact_name', value)} />
          <Field label="Contact Email" type="email" value={form.contact_email || ''} onChange={value => setField('contact_email', value)} />
          <Field label="Contact Phone" value={form.contact_phone || ''} error={errors.contact_phone} onChange={value => setField('contact_phone', value)} />
          <Select label="Payment Terms" value={form.payment_terms} options={['Net 30', 'Net 60', 'Net 90', 'Immediate']} onChange={value => setField('payment_terms', value)} />
          <Field label="Credit Limit" type="number" value={form.credit_limit} onChange={value => setField('credit_limit', Number(value))} />
          <Select label="Status" value={form.status} options={['active', 'inactive', 'blacklisted']} onChange={value => setField('status', value)} />
          <Field label="Bank Account No" value={form.bank_account_no || ''} onChange={value => setField('bank_account_no', value)} />
          <Field label="IFSC" value={form.bank_ifsc || ''} error={errors.bank_ifsc} onChange={value => setField('bank_ifsc', value)} />
          <Field label="Bank Name" value={form.bank_name || ''} onChange={value => setField('bank_name', value)} className="full-width" />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" disabled={hasErrors}>Save Vendor</button>
        </div>
      </form>
    </div>
  );
}

export function UsersView() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers()
      .then(response => setUsers(response.data || []))
      .catch(err => setError(err.message || 'Unable to load users from database.'))
      .finally(() => setLoading(false));
  }, []);

  async function toggleActive(user) {
    if (!window.confirm(`${user.active ? 'Deactivate' : 'Reactivate'} ${user.name}?`)) return;
    const response = await updateUser(user.id, { active: !user.active });
    setUsers(current => current.map(item => item.id === user.id ? response.data : item));
  }

  return (
    <section className="view active" aria-label="Users">
      <div className="view-header">
        <div>
          <h1 className="view-title">User Management</h1>
          <p className="view-subtitle">Admin controls for roles, departments, and account status</p>
        </div>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Avatar</th><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Status</th><th>Last Login</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="8"><div className="empty-state">Loading users from database...</div></td></tr>}
            {error && <tr><td colSpan="8"><div className="empty-state">{error}</div></td></tr>}
            {!loading && !error && users.length === 0 && <tr><td colSpan="8"><div className="empty-state">No users found in the database.</div></td></tr>}
            {!loading && !error && users.map(user => (
              <tr key={user.id}>
                <td><div className="avatar-xs">{getInitials(user.name)}</div></td>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td><RoleBadge role={user.role} /></td>
                <td>{user.department}</td>
                <td><span className={`badge ${user.active ? 'approved' : 'draft'}`}>{user.active ? 'Active' : 'Inactive'}</span></td>
                <td>{formatDate(user.last_login_at)}</td>
                <td>
                  <button className={`btn ${user.active ? 'btn-danger' : 'btn-success'} btn-sm`} onClick={() => toggleActive(user)}>
                    {user.active ? 'Deactivate' : 'Reactivate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function SerialSettingsView() {
  const [settings, setSettings] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    fetchDocumentSerialSettings()
      .then(response => setSettings(response.data || []))
      .catch(err => setError(err.message || 'Unable to load document serial settings.'))
      .finally(() => setLoading(false));
  }, []);

  async function saveSetting(setting) {
    const response = await updateDocumentSerialSetting(setting.doc_type, setting);
    const saved = response.data;
    setSettings(current => current.map(item => item.doc_type === saved.doc_type ? saved : item));
    setEditing(null);
    setNotice(`${labelForDocType(saved.doc_type)} serial settings saved.`);
  }

  return (
    <section className="view active" aria-label="Document serial settings">
      <div className="view-header">
        <div>
          <h1 className="view-title">Document Serial Settings</h1>
          <p className="view-subtitle">Set prefix, range, and current number for auto-generated document IDs</p>
        </div>
      </div>

      {notice && (
        <div className="toast success inline-toast">
          <div className="toast-body">
            <div className="toast-title">Saved</div>
            <div className="toast-msg">{notice}</div>
          </div>
          <button className="toast-close" onClick={() => setNotice('')}>x</button>
        </div>
      )}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Document</th><th>Prefix</th><th>Range</th><th>Current</th><th>Next Number</th><th>Remaining</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="8"><div className="empty-state">Loading serial settings...</div></td></tr>}
            {error && <tr><td colSpan="8"><div className="empty-state">{error}</div></td></tr>}
            {!loading && !error && settings.map(setting => (
              <tr key={setting.doc_type}>
                <td>{labelForDocType(setting.doc_type)}</td>
                <td className="font-mono">{setting.prefix}</td>
                <td className="font-mono">{setting.range_start} - {setting.range_end}</td>
                <td className="font-mono">{setting.current_number}</td>
                <td className="font-mono">{setting.next_document_number}</td>
                <td>{setting.remaining}</td>
                <td><span className={`badge ${setting.active ? 'approved' : 'draft'}`}>{setting.active ? 'Active' : 'Inactive'}</span></td>
                <td><button className="btn btn-ghost btn-sm" onClick={() => setEditing(setting)}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <SerialForm
          setting={editing}
          onCancel={() => setEditing(null)}
          onSave={saveSetting}
        />
      )}
    </section>
  );
}

function SerialForm({ setting, onCancel, onSave }) {
  const [form, setForm] = useState({ ...setting });
  const nextNumber = Number(form.current_number || 0) + 1;
  const preview = `${form.prefix || ''}${String(nextNumber).padStart(Number(form.padding || 0), '0')}`;
  const invalidRange = Number(form.range_start) > Number(form.range_end);
  const invalidCurrent = Number(form.current_number) < Number(form.range_start) - 1 || Number(form.current_number) > Number(form.range_end);

  function setField(name, value) {
    setForm(current => ({ ...current, [name]: value }));
  }

  function submit(event) {
    event.preventDefault();
    if (!invalidRange && !invalidCurrent) onSave(form);
  }

  return (
    <div className="modal-backdrop">
      <form className="modal-panel" onSubmit={submit}>
        <div className="modal-header">
          <h2>{labelForDocType(form.doc_type)} Serial</h2>
          <button type="button" className="row-btn" onClick={onCancel}>x</button>
        </div>
        <div className="form-grid-2">
          <Field label="Document Type" value={labelForDocType(form.doc_type)} readOnly />
          <Field label="Prefix" required value={form.prefix || ''} onChange={value => setField('prefix', value.toUpperCase())} />
          <Field label="Range Start" type="number" required value={form.range_start} onChange={value => setField('range_start', Number(value))} error={invalidRange ? 'Start must be before end' : ''} />
          <Field label="Range End" type="number" required value={form.range_end} onChange={value => setField('range_end', Number(value))} error={invalidRange ? 'End must be after start' : ''} />
          <Field label="Current Number" type="number" required value={form.current_number} onChange={value => setField('current_number', Number(value))} error={invalidCurrent ? 'Current must stay inside range' : ''} />
          <Field label="Padding" type="number" required value={form.padding} onChange={value => setField('padding', Number(value))} />
          <div className="field-group full-width">
            <label className="remember-row">
              <input type="checkbox" checked={Boolean(form.active)} onChange={event => setField('active', event.target.checked)} />
              Active
            </label>
            <span className="field-hint">Next generated number: <span className="font-mono">{preview}</span></span>
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" disabled={invalidRange || invalidCurrent}>Save Serial</button>
        </div>
      </form>
    </div>
  );
}

function labelForDocType(type) {
  return { po: 'Purchase Order', grn: 'GRN', bill: 'Bill / Invoice' }[type] || type;
}

function RoleBadge({ role }) {
  const className = { admin: 'role-admin', finance_manager: 'role-manager', reviewer: 'role-reviewer', viewer: 'role-viewer' }[role];
  return <span className={`role-badge ${className}`}>{role.replace('_', ' ')}</span>;
}

function Field({ label, value, onChange, error, required, readOnly, type = 'text', className = '' }) {
  return (
    <div className={`field-group ${className}`}>
      <label className={`field-label ${required ? 'required' : ''}`}>{label}</label>
      <input className={`field-input ${error ? 'error' : ''}`} type={type} value={value} readOnly={readOnly} onChange={event => onChange?.(event.target.value)} />
      <span className="field-error">{error || ''}</span>
    </div>
  );
}

function Select({ label, value, options, onChange }) {
  return (
    <div className="field-group">
      <label className="field-label">{label}</label>
      <select className="field-select" value={value} onChange={event => onChange(event.target.value)}>
        {options.map(option => <option key={option} value={option}>{capitalise(option)}</option>)}
      </select>
      <span className="field-error" />
    </div>
  );
}
