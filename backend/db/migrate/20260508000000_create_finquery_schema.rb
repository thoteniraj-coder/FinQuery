class CreateFinquerySchema < ActiveRecord::Migration[8.1]
  def up
    create_table :items do |t|
      t.string :item_code, null: false
      t.string :name, null: false
      t.string :category
      t.string :uom, null: false, default: "Nos"
      t.decimal :std_price, precision: 15, scale: 2, null: false, default: 0
      t.string :hsn_code
      t.decimal :default_tax_pct, precision: 8, scale: 2, null: false, default: 18
    end
    add_index :items, :item_code, unique: true

    create_table :vendors do |t|
      t.string :vendor_code, null: false
      t.string :name, null: false
      t.string :gstin
      t.string :city
      t.string :state
      t.string :contact_name
      t.string :contact_email
      t.string :contact_phone
      t.string :payment_terms, default: "Net 30"
      t.decimal :credit_limit, precision: 15, scale: 2, default: 0
      t.string :status, null: false, default: "active"
    end
    add_index :vendors, :vendor_code, unique: true
    add_index :vendors, :gstin, unique: true

    create_table :purchase_orders do |t|
      t.string :po_number, null: false
      t.references :vendor, null: false, foreign_key: true
      t.string :order_date, null: false
      t.string :delivery_date
      t.string :status, null: false, default: "open"
      t.string :ship_to_address
      t.decimal :subtotal, precision: 15, scale: 2, null: false, default: 0
      t.decimal :tax_amount, precision: 15, scale: 2, null: false, default: 0
      t.decimal :total_amount, precision: 15, scale: 2, null: false, default: 0
      t.text :notes
    end
    add_index :purchase_orders, :po_number, unique: true
    add_index :purchase_orders, :status

    create_table :po_items do |t|
      t.references :po, null: false, foreign_key: { to_table: :purchase_orders }, index: true
      t.references :item, null: false, foreign_key: true, index: true
      t.integer :line_no, null: false
      t.string :description
      t.decimal :qty_ordered, precision: 15, scale: 2, null: false
      t.string :uom, null: false
      t.decimal :unit_price, precision: 15, scale: 2, null: false
      t.decimal :tax_pct, precision: 8, scale: 2, null: false, default: 18
    end
    add_generated_column :po_items, :tax_amount, "ROUND(qty_ordered * unit_price * tax_pct / 100, 2)"
    add_generated_column :po_items, :line_total, "ROUND(qty_ordered * unit_price, 2)"

    create_table :grn do |t|
      t.string :grn_number, null: false
      t.references :po, foreign_key: { to_table: :purchase_orders }, index: true
      t.references :vendor, null: false, foreign_key: true, index: true
      t.string :receipt_date, null: false
      t.string :received_by
      t.string :warehouse
      t.string :quality_status, null: false, default: "pending"
      t.text :notes
      t.decimal :total_received_value, precision: 15, scale: 2, null: false, default: 0
    end
    add_index :grn, :grn_number, unique: true

    create_table :grn_items do |t|
      t.references :grn, null: false, foreign_key: { to_table: :grn }, index: true
      t.references :po_item, foreign_key: { to_table: :po_items }, index: true
      t.references :item, null: false, foreign_key: true, index: true
      t.decimal :qty_received, precision: 15, scale: 2, null: false
      t.decimal :qty_accepted, precision: 15, scale: 2, null: false, default: 0
      t.decimal :qty_rejected, precision: 15, scale: 2, null: false, default: 0
      t.string :reject_reason
      t.decimal :unit_price, precision: 15, scale: 2, null: false
    end
    add_generated_column :grn_items, :line_value, "ROUND(qty_accepted * unit_price, 2)"

    create_table :bills do |t|
      t.string :bill_number, null: false
      t.string :vendor_bill_ref
      t.references :vendor, null: false, foreign_key: true, index: true
      t.references :po, foreign_key: { to_table: :purchase_orders }, index: true
      t.references :grn, foreign_key: { to_table: :grn }, index: true
      t.string :bill_date, null: false
      t.string :due_date, null: false
      t.decimal :subtotal, precision: 15, scale: 2, null: false, default: 0
      t.decimal :tax_amount, precision: 15, scale: 2, null: false, default: 0
      t.decimal :total_amount, precision: 15, scale: 2, null: false, default: 0
      t.string :status, null: false, default: "unpaid"
      t.string :payment_date
      t.string :payment_ref
    end
    add_index :bills, :bill_number, unique: true
    add_index :bills, :status

    create_table :bill_items do |t|
      t.references :bill, null: false, foreign_key: true, index: true
      t.references :po_item, foreign_key: { to_table: :po_items }, index: true
      t.references :grn_item, foreign_key: { to_table: :grn_items }, index: true
      t.references :item, null: false, foreign_key: true
      t.decimal :qty_billed, precision: 15, scale: 2, null: false
      t.decimal :unit_price, precision: 15, scale: 2, null: false
      t.decimal :tax_pct, precision: 8, scale: 2, null: false, default: 18
    end
    add_generated_column :bill_items, :tax_amount, "ROUND(qty_billed * unit_price * tax_pct / 100, 2)"
    add_generated_column :bill_items, :line_total, "ROUND(qty_billed * unit_price, 2)"
  end

  def down
    drop_table :bill_items, if_exists: true
    drop_table :bills, if_exists: true
    drop_table :grn_items, if_exists: true
    drop_table :grn, if_exists: true
    drop_table :po_items, if_exists: true
    drop_table :purchase_orders, if_exists: true
    drop_table :vendors, if_exists: true
    drop_table :items, if_exists: true
  end

  private

  def add_generated_column(table, column, expression)
    type = mysql_adapter? ? "DECIMAL(15,2)" : "REAL"
    execute <<~SQL.squish
      ALTER TABLE #{table}
      ADD COLUMN #{column} #{type}
      GENERATED ALWAYS AS (#{expression}) VIRTUAL
    SQL
  end

  def mysql_adapter?
    connection.adapter_name.downcase.include?("mysql")
  end
end
