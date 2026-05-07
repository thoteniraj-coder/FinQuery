CREATE TABLE IF NOT EXISTS "schema_migrations" ("version" varchar NOT NULL PRIMARY KEY);
CREATE TABLE IF NOT EXISTS "ar_internal_metadata" ("key" varchar NOT NULL PRIMARY KEY, "value" varchar, "created_at" datetime(6) NOT NULL, "updated_at" datetime(6) NOT NULL);
CREATE TABLE items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT,
  uom TEXT NOT NULL DEFAULT 'Nos',
  std_price REAL NOT NULL DEFAULT 0,
  hsn_code TEXT,
  default_tax_pct REAL NOT NULL DEFAULT 18
);
CREATE TABLE vendors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vendor_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  gstin TEXT UNIQUE,
  city TEXT,
  state TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  payment_terms TEXT DEFAULT 'Net 30',
  credit_limit REAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK(status IN ('active','inactive','blacklisted'))
);
CREATE TABLE purchase_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  po_number TEXT NOT NULL UNIQUE,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id),
  order_date TEXT NOT NULL,
  delivery_date TEXT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK(status IN ('open','partial','closed','cancelled')),
  ship_to_address TEXT,
  subtotal REAL NOT NULL DEFAULT 0,
  tax_amount REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  notes TEXT
);
CREATE TABLE po_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  po_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES items(id),
  line_no INTEGER NOT NULL,
  description TEXT,
  qty_ordered REAL NOT NULL,
  uom TEXT NOT NULL,
  unit_price REAL NOT NULL,
  tax_pct REAL NOT NULL DEFAULT 18,
  tax_amount REAL GENERATED ALWAYS AS
    (ROUND(qty_ordered * unit_price * tax_pct / 100, 2)) VIRTUAL,
  line_total REAL GENERATED ALWAYS AS
    (ROUND(qty_ordered * unit_price, 2)) VIRTUAL
);
CREATE TABLE grn (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  grn_number TEXT NOT NULL UNIQUE,
  po_id INTEGER REFERENCES purchase_orders(id),
  vendor_id INTEGER NOT NULL REFERENCES vendors(id),
  receipt_date TEXT NOT NULL,
  received_by TEXT,
  warehouse TEXT,
  quality_status TEXT NOT NULL DEFAULT 'pending'
    CHECK(quality_status IN ('pending','accepted','partial','rejected')),
  notes TEXT,
  total_received_value REAL NOT NULL DEFAULT 0
);
CREATE TABLE grn_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  grn_id INTEGER NOT NULL REFERENCES grn(id) ON DELETE CASCADE,
  po_item_id INTEGER REFERENCES po_items(id),
  item_id INTEGER NOT NULL REFERENCES items(id),
  qty_received REAL NOT NULL,
  qty_accepted REAL NOT NULL DEFAULT 0,
  qty_rejected REAL NOT NULL DEFAULT 0,
  reject_reason TEXT,
  unit_price REAL NOT NULL,
  line_value REAL GENERATED ALWAYS AS
    (ROUND(qty_accepted * unit_price, 2)) VIRTUAL
);
CREATE TABLE bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bill_number TEXT NOT NULL UNIQUE,
  vendor_bill_ref TEXT,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id),
  po_id INTEGER REFERENCES purchase_orders(id),
  grn_id INTEGER REFERENCES grn(id),
  bill_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  subtotal REAL NOT NULL DEFAULT 0,
  tax_amount REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid'
    CHECK(status IN ('unpaid','paid','overdue','disputed','cancelled')),
  payment_date TEXT,
  payment_ref TEXT
);
CREATE TABLE bill_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  po_item_id INTEGER REFERENCES po_items(id),
  grn_item_id INTEGER REFERENCES grn_items(id),
  item_id INTEGER NOT NULL REFERENCES items(id),
  qty_billed REAL NOT NULL,
  unit_price REAL NOT NULL,
  tax_pct REAL NOT NULL DEFAULT 18,
  tax_amount REAL GENERATED ALWAYS AS
    (ROUND(qty_billed * unit_price * tax_pct / 100, 2)) VIRTUAL,
  line_total REAL GENERATED ALWAYS AS
    (ROUND(qty_billed * unit_price, 2)) VIRTUAL
);
CREATE INDEX idx_po_vendor ON purchase_orders(vendor_id) /*application='Backend'*/;
CREATE INDEX idx_po_status ON purchase_orders(status) /*application='Backend'*/;
CREATE INDEX idx_po_items_po ON po_items(po_id) /*application='Backend'*/;
CREATE INDEX idx_po_items_item ON po_items(item_id) /*application='Backend'*/;
CREATE INDEX idx_grn_po ON grn(po_id) /*application='Backend'*/;
CREATE INDEX idx_grn_vendor ON grn(vendor_id) /*application='Backend'*/;
CREATE INDEX idx_grn_items_grn ON grn_items(grn_id) /*application='Backend'*/;
CREATE INDEX idx_grn_items_poitem ON grn_items(po_item_id) /*application='Backend'*/;
CREATE INDEX idx_grn_items_item ON grn_items(item_id) /*application='Backend'*/;
CREATE INDEX idx_bills_vendor ON bills(vendor_id) /*application='Backend'*/;
CREATE INDEX idx_bills_po ON bills(po_id) /*application='Backend'*/;
CREATE INDEX idx_bills_grn ON bills(grn_id) /*application='Backend'*/;
CREATE INDEX idx_bills_status ON bills(status) /*application='Backend'*/;
CREATE INDEX idx_bill_items_bill ON bill_items(bill_id) /*application='Backend'*/;
CREATE INDEX idx_bill_items_poi ON bill_items(po_item_id) /*application='Backend'*/;
CREATE INDEX idx_bill_items_grni ON bill_items(grn_item_id) /*application='Backend'*/;
INSERT INTO "schema_migrations" (version) VALUES
('20260508000000');

