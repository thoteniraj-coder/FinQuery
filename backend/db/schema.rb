# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_05_10_000000) do
  create_table "bill_items", force: :cascade do |t|
    t.bigint "bill_id", null: false
    t.bigint "po_item_id"
    t.bigint "grn_item_id"
    t.bigint "item_id", null: false
    t.decimal "qty_billed", precision: 15, scale: 2, null: false
    t.decimal "unit_price", precision: 15, scale: 2, null: false
    t.decimal "tax_pct", precision: 8, scale: 2, null: false, default: "18.0"
    t.index ["bill_id"], name: "index_bill_items_on_bill_id"
    t.index ["grn_item_id"], name: "index_bill_items_on_grn_item_id"
    t.index ["item_id"], name: "index_bill_items_on_item_id"
    t.index ["po_item_id"], name: "index_bill_items_on_po_item_id"
  end

  create_table "bills", force: :cascade do |t|
    t.string "bill_number", null: false
    t.string "vendor_bill_ref"
    t.bigint "vendor_id", null: false
    t.bigint "po_id"
    t.bigint "grn_id"
    t.string "bill_date", null: false
    t.string "due_date", null: false
    t.decimal "subtotal", precision: 15, scale: 2, null: false, default: "0.0"
    t.decimal "tax_amount", precision: 15, scale: 2, null: false, default: "0.0"
    t.decimal "total_amount", precision: 15, scale: 2, null: false, default: "0.0"
    t.string "status", null: false, default: "unpaid"
    t.string "payment_date"
    t.string "payment_ref"
    t.index ["bill_number"], name: "index_bills_on_bill_number", unique: true
    t.index ["grn_id"], name: "index_bills_on_grn_id"
    t.index ["po_id"], name: "index_bills_on_po_id"
    t.index ["status"], name: "index_bills_on_status"
    t.index ["vendor_id"], name: "index_bills_on_vendor_id"
  end

  create_table "document_serial_settings", force: :cascade do |t|
    t.string "doc_type", null: false
    t.string "prefix", null: false
    t.integer "range_start", null: false, default: 1
    t.integer "range_end", null: false, default: 999999
    t.integer "current_number", null: false, default: 0
    t.integer "padding", null: false, default: 3
    t.boolean "active", null: false, default: true
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["doc_type"], name: "index_document_serial_settings_on_doc_type", unique: true
  end

  create_table "grn", force: :cascade do |t|
    t.string "grn_number", null: false
    t.bigint "po_id"
    t.bigint "vendor_id", null: false
    t.string "receipt_date", null: false
    t.string "received_by"
    t.string "warehouse"
    t.string "quality_status", null: false, default: "pending"
    t.text "notes"
    t.decimal "total_received_value", precision: 15, scale: 2, null: false, default: "0.0"
    t.index ["grn_number"], name: "index_grn_on_grn_number", unique: true
    t.index ["po_id"], name: "index_grn_on_po_id"
    t.index ["vendor_id"], name: "index_grn_on_vendor_id"
  end

  create_table "grn_items", force: :cascade do |t|
    t.bigint "grn_id", null: false
    t.bigint "po_item_id"
    t.bigint "item_id", null: false
    t.decimal "qty_received", precision: 15, scale: 2, null: false
    t.decimal "qty_accepted", precision: 15, scale: 2, null: false, default: "0.0"
    t.decimal "qty_rejected", precision: 15, scale: 2, null: false, default: "0.0"
    t.string "reject_reason"
    t.decimal "unit_price", precision: 15, scale: 2, null: false
    t.index ["grn_id"], name: "index_grn_items_on_grn_id"
    t.index ["item_id"], name: "index_grn_items_on_item_id"
    t.index ["po_item_id"], name: "index_grn_items_on_po_item_id"
  end

  create_table "items", force: :cascade do |t|
    t.string "item_code", null: false
    t.string "name", null: false
    t.string "category"
    t.string "uom", null: false, default: "Nos"
    t.decimal "std_price", precision: 15, scale: 2, null: false, default: "0.0"
    t.string "hsn_code"
    t.decimal "default_tax_pct", precision: 8, scale: 2, null: false, default: "18.0"
    t.index ["item_code"], name: "index_items_on_item_code", unique: true
  end

  create_table "po_items", force: :cascade do |t|
    t.bigint "po_id", null: false
    t.bigint "item_id", null: false
    t.integer "line_no", null: false
    t.string "description"
    t.decimal "qty_ordered", precision: 15, scale: 2, null: false
    t.string "uom", null: false
    t.decimal "unit_price", precision: 15, scale: 2, null: false
    t.decimal "tax_pct", precision: 8, scale: 2, null: false, default: "18.0"
    t.index ["item_id"], name: "index_po_items_on_item_id"
    t.index ["po_id"], name: "index_po_items_on_po_id"
  end

  create_table "purchase_orders", force: :cascade do |t|
    t.string "po_number", null: false
    t.bigint "vendor_id", null: false
    t.string "order_date", null: false
    t.string "delivery_date"
    t.string "status", null: false, default: "open"
    t.string "ship_to_address"
    t.decimal "subtotal", precision: 15, scale: 2, null: false, default: "0.0"
    t.decimal "tax_amount", precision: 15, scale: 2, null: false, default: "0.0"
    t.decimal "total_amount", precision: 15, scale: 2, null: false, default: "0.0"
    t.text "notes"
    t.index ["po_number"], name: "index_purchase_orders_on_po_number", unique: true
    t.index ["status"], name: "index_purchase_orders_on_status"
    t.index ["vendor_id"], name: "index_purchase_orders_on_vendor_id"
  end

  create_table "vendors", force: :cascade do |t|
    t.string "vendor_code", null: false
    t.string "name", null: false
    t.string "gstin"
    t.string "city"
    t.string "state"
    t.string "contact_name"
    t.string "contact_email"
    t.string "contact_phone"
    t.string "payment_terms", default: "Net 30"
    t.decimal "credit_limit", precision: 15, scale: 2, default: "0.0"
    t.string "status", null: false, default: "active"
    t.index ["gstin"], name: "index_vendors_on_gstin", unique: true
    t.index ["vendor_code"], name: "index_vendors_on_vendor_code", unique: true
  end

  add_foreign_key "bill_items", "bills"
  add_foreign_key "bill_items", "grn_items", column: "grn_item_id"
  add_foreign_key "bill_items", "items"
  add_foreign_key "bill_items", "po_items", column: "po_item_id"
  add_foreign_key "bills", "grn", column: "grn_id"
  add_foreign_key "bills", "purchase_orders", column: "po_id"
  add_foreign_key "bills", "vendors"
  add_foreign_key "grn", "purchase_orders", column: "po_id"
  add_foreign_key "grn", "vendors"
  add_foreign_key "grn_items", "grn", column: "grn_id"
  add_foreign_key "grn_items", "items"
  add_foreign_key "grn_items", "po_items", column: "po_item_id"
  add_foreign_key "po_items", "items"
  add_foreign_key "po_items", "purchase_orders", column: "po_id"
  add_foreign_key "purchase_orders", "vendors"
end
