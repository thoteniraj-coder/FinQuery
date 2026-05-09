class CreateDocumentSerialSettings < ActiveRecord::Migration[8.1]
  def up
    create_table :document_serial_settings do |t|
      t.string :doc_type, null: false
      t.string :prefix, null: false
      t.integer :range_start, null: false, default: 1
      t.integer :range_end, null: false, default: 999_999
      t.integer :current_number, null: false, default: 0
      t.integer :padding, null: false, default: 3
      t.boolean :active, null: false, default: true
      t.timestamps
    end

    add_index :document_serial_settings, :doc_type, unique: true

    now = "CURRENT_TIMESTAMP"
    execute <<~SQL.squish
      INSERT INTO document_serial_settings
        (doc_type, prefix, range_start, range_end, current_number, padding, active, created_at, updated_at)
      VALUES
        ('po', 'PO-2026-', 1, 999, 4, 3, 1, #{now}, #{now}),
        ('grn', 'GRN-2026-', 1, 999, 3, 3, 1, #{now}, #{now}),
        ('bill', 'BILL-2026-', 1, 999, 3, 3, 1, #{now}, #{now})
    SQL
  end

  def down
    drop_table :document_serial_settings, if_exists: true
  end
end
