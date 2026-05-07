# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
# Example:
#
#   ["Action", "Comedy", "Drama", "Horror"].each do |genre_name|
#     MovieGenre.find_or_create_by!(name: genre_name)
#   end
connection = ActiveRecord::Base.connection

%w[bill_items bills grn_items grn po_items purchase_orders vendors items].each do |table|
  connection.execute("DELETE FROM #{table}")
  connection.execute("DELETE FROM sqlite_sequence WHERE name='#{table}'")
end

seed_sql = <<~SQL
  INSERT INTO items (item_code, name, category, uom, std_price, hsn_code, default_tax_pct) VALUES
    ('ITM-001', 'M.S. Steel Rod 12mm', 'Raw Material', 'Kg', 62.50, '7214', 18),
    ('ITM-002', 'Copper Wire 2.5 sqmm', 'Electrical', 'Mtr', 38.00, '7408', 18),
    ('ITM-003', 'Industrial Lubricant', 'Consumable', 'Ltr', 210.00, '2710', 18),
    ('ITM-004', 'Safety Helmet', 'Safety', 'Nos', 440.00, '6506', 12),
    ('ITM-005', 'Packaging Film', 'Packing', 'Kg', 132.00, '3920', 18);

  INSERT INTO vendors (vendor_code, name, gstin, city, state, contact_name, contact_email, contact_phone, payment_terms, credit_limit, status) VALUES
    ('VEN-001', 'Tata Steel Supplies', '27AAACT2727Q1ZW', 'Mumbai', 'Maharashtra', 'Anita Rao', 'anita@tatasteel.example', '+91-90000-10001', 'Net 30', 1500000, 'active'),
    ('VEN-002', 'Bharat Electrical Traders', '29AABCB1234C1Z7', 'Bengaluru', 'Karnataka', 'Rohit Menon', 'rohit@bharatelectrical.example', '+91-90000-10002', 'Net 60', 850000, 'active'),
    ('VEN-003', 'Western Industrial Oils', '24AACFW9988P1Z5', 'Ahmedabad', 'Gujarat', 'Neha Shah', 'neha@wio.example', '+91-90000-10003', 'Immediate', 350000, 'active'),
    ('VEN-004', 'SafeWorks India', '07AAECS4455M1Z2', 'Delhi', 'Delhi', 'Kabir Singh', 'kabir@safeworks.example', '+91-90000-10004', 'Net 30', 250000, 'inactive');

  INSERT INTO purchase_orders (po_number, vendor_id, order_date, delivery_date, status, ship_to_address, subtotal, tax_amount, total_amount, notes) VALUES
    ('PO-2026-001', 1, '2026-01-10', '2026-01-20', 'closed', 'Main Store, Pune', 312500, 56250, 368750, 'Monthly steel replenishment'),
    ('PO-2026-002', 2, '2026-02-04', '2026-02-18', 'partial', 'Electrical Store, Pune', 190000, 34200, 224200, 'Copper wire for panel assembly'),
    ('PO-2026-003', 3, '2026-02-20', '2026-02-25', 'open', 'Maintenance Store, Pune', 84000, 15120, 99120, 'Lubricant stock'),
    ('PO-2026-004', 4, '2026-03-02', '2026-03-12', 'cancelled', 'Safety Store, Pune', 44000, 5280, 49280, 'Cancelled after vendor inactive review');

  INSERT INTO po_items (po_id, item_id, line_no, description, qty_ordered, uom, unit_price, tax_pct) VALUES
    (1, 1, 1, 'M.S. Steel Rod 12mm', 5000, 'Kg', 62.50, 18),
    (2, 2, 1, 'Copper Wire 2.5 sqmm', 5000, 'Mtr', 38.00, 18),
    (3, 3, 1, 'Industrial Lubricant', 400, 'Ltr', 210.00, 18),
    (4, 4, 1, 'Safety Helmet', 100, 'Nos', 440.00, 12);

  INSERT INTO grn (grn_number, po_id, vendor_id, receipt_date, received_by, warehouse, quality_status, notes, total_received_value) VALUES
    ('GRN-2026-001', 1, 1, '2026-01-19', 'Priya Nair', 'Main Store', 'accepted', 'Full quantity accepted', 312500),
    ('GRN-2026-002', 2, 2, '2026-02-16', 'Arjun Mehta', 'Electrical Store', 'partial', 'Short delivery against PO', 152000),
    ('GRN-2026-003', NULL, 3, '2026-03-01', 'Priya Nair', 'Maintenance Store', 'pending', 'Unplanned receipt, QC pending', 0);

  INSERT INTO grn_items (grn_id, po_item_id, item_id, qty_received, qty_accepted, qty_rejected, reject_reason, unit_price) VALUES
    (1, 1, 1, 5000, 5000, 0, NULL, 62.50),
    (2, 2, 2, 4200, 4000, 200, 'Damaged insulation', 38.00),
    (3, NULL, 5, 250, 0, 0, NULL, 132.00);

  INSERT INTO bills (bill_number, vendor_bill_ref, vendor_id, po_id, grn_id, bill_date, due_date, subtotal, tax_amount, total_amount, status, payment_date, payment_ref) VALUES
    ('BILL-2026-001', 'TS-INV-7781', 1, 1, 1, '2026-01-21', '2026-02-20', 312500, 56250, 368750, 'paid', '2026-02-12', 'UTR-20260212-001'),
    ('BILL-2026-002', 'BET-INV-234', 2, 2, 2, '2026-02-19', '2026-04-19', 171000, 30780, 201780, 'disputed', NULL, NULL),
    ('BILL-2026-003', 'WIO-INV-901', 3, NULL, NULL, '2026-02-10', '2026-02-10', 42000, 7560, 49560, 'overdue', NULL, NULL);

  INSERT INTO bill_items (bill_id, po_item_id, grn_item_id, item_id, qty_billed, unit_price, tax_pct) VALUES
    (1, 1, 1, 1, 5000, 62.50, 18),
    (2, 2, 2, 2, 4500, 38.00, 18),
    (3, NULL, NULL, 3, 200, 210.00, 18);
SQL

seed_sql.split(";").each do |statement|
  connection.execute(statement) if statement.strip.present?
end
