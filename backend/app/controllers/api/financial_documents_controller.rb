class Api::FinancialDocumentsController < ApplicationController
  skip_before_action :verify_authenticity_token, raise: false

  def create
    doc_type = params[:type]
    notes = params[:notes] || params[:description]
    items = params[:items] || []
    vendor_id = params[:vendorId].presence || params[:vendor_id]

    return render json: { error: "Unsupported document type for financial documents" }, status: :bad_request unless %w[po grn bill].include?(doc_type)
    return render json: { error: "Vendor is required" }, status: :unprocessable_entity if vendor_id.blank?

    doc_id = nil
    ActiveRecord::Base.transaction do
      doc_id = allocate_document_number(doc_type)

      case doc_type
      when 'po'
        order_date = params[:orderDate].presence || Date.today.to_s
        delivery_date = params[:deliveryDate].presence || params[:dueDate].presence
        totals = totals_for(items)
        po_fk = column_name("po_items", "po_id", "purchase_order_id")

        ActiveRecord::Base.connection.execute(
          ActiveRecord::Base.sanitize_sql_array([
            "INSERT INTO purchase_orders (po_number, vendor_id, order_date, delivery_date, ship_to_address, subtotal, tax_amount, total_amount, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            doc_id, vendor_id, order_date, delivery_date, params[:shipToAddress], totals[:subtotal], totals[:tax_amount], totals[:total_amount], notes
          ])
        )
        
        inserted_id = last_insert_id
        
        items.each_with_index do |item, index|
          ActiveRecord::Base.connection.execute(
            ActiveRecord::Base.sanitize_sql_array([
              "INSERT INTO po_items (#{po_fk}, item_id, line_no, description, qty_ordered, uom, unit_price, tax_pct) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
              inserted_id, item[:itemId] || 1, index + 1, item[:description], item[:quantity].to_f, item[:uom].presence || 'Nos', item[:unitPrice].to_f, item[:taxPct].presence || 18
            ])
          )
        end
        
      when 'grn'
        po_id = resolve_id("purchase_orders", "po_number", params[:poId])
        receipt_date = params[:receiptDate].presence || Date.today.to_s
        total_received_value = items.sum { |item| accepted_quantity(item) * item[:unitPrice].to_f }
        grn_table = table_name("grns", "grn")
        grn_po_column = column_name(grn_table, "po_id", "purchase_order_id")

        ActiveRecord::Base.connection.execute(
          ActiveRecord::Base.sanitize_sql_array([
            "INSERT INTO #{grn_table} (grn_number, #{grn_po_column}, vendor_id, receipt_date, received_by, warehouse, quality_status, notes, total_received_value) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            doc_id, po_id, vendor_id, receipt_date, params[:receivedBy], params[:warehouse], params[:qualityStatus].presence || 'pending', notes, total_received_value
          ])
        )
        
        inserted_id = last_insert_id
        
        items.each do |item|
          ActiveRecord::Base.connection.execute(
            ActiveRecord::Base.sanitize_sql_array([
              "INSERT INTO grn_items (grn_id, po_item_id, item_id, qty_received, qty_accepted, qty_rejected, reject_reason, unit_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
              inserted_id, item[:poItemId], item[:itemId] || 1, item[:quantity].to_f, accepted_quantity(item), item[:rejectedQty].to_f, item[:description], item[:unitPrice].to_f
            ])
          )
        end

      when 'bill'
        po_id = resolve_id("purchase_orders", "po_number", params[:poId])
        grn_table = table_name("grns", "grn")
        grn_id = resolve_id(grn_table, "grn_number", params[:grnId])
        bill_date = params[:billDate].presence || Date.today.to_s
        due_date = params[:dueDate].presence || bill_date
        totals = totals_for(items)
        bill_po_column = column_name("bills", "po_id", "purchase_order_id")
        bill_grn_column = column_name("bills", "grn_id")

        ActiveRecord::Base.connection.execute(
          ActiveRecord::Base.sanitize_sql_array([
            "INSERT INTO bills (bill_number, vendor_bill_ref, vendor_id, #{bill_po_column}, #{bill_grn_column}, bill_date, due_date, subtotal, tax_amount, total_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            doc_id, params[:vendorBillRef], vendor_id, po_id, grn_id, bill_date, due_date, totals[:subtotal], totals[:tax_amount], totals[:total_amount], params[:billStatus].presence || 'unpaid'
          ])
        )
        
        inserted_id = last_insert_id
        
        items.each do |item|
          ActiveRecord::Base.connection.execute(
            ActiveRecord::Base.sanitize_sql_array([
              "INSERT INTO bill_items (bill_id, po_item_id, grn_item_id, item_id, qty_billed, unit_price, tax_pct) VALUES (?, ?, ?, ?, ?, ?, ?)",
              inserted_id, item[:poItemId], item[:grnItemId], item[:itemId] || 1, item[:quantity].to_f, item[:unitPrice].to_f, item[:taxPct].presence || 18
            ])
          )
        end

      end
    end

    render json: { success: true, message: "Document created successfully", document_number: doc_id }
  rescue => e
    render json: { error: e.message }, status: :internal_server_error
  end

  private

  SERIAL_DEFAULTS = {
    "po" => { prefix: "PO-2026-", range_start: 1, range_end: 999, current_number: 4, padding: 3 },
    "grn" => { prefix: "GRN-2026-", range_start: 1, range_end: 999, current_number: 3, padding: 3 },
    "bill" => { prefix: "BILL-2026-", range_start: 1, range_end: 999, current_number: 3, padding: 3 }
  }.freeze

  def connection
    ActiveRecord::Base.connection
  end

  def table_name(*candidates)
    candidates.find { |candidate| connection.data_source_exists?(candidate.to_s) }&.to_s
  end

  def column_name(table, *candidates)
    columns = connection.columns(table.to_s).map(&:name)
    candidates.find { |candidate| columns.include?(candidate.to_s) }&.to_s
  end

  def allocate_document_number(doc_type)
    return params[:docId] if !connection.data_source_exists?("document_serial_settings") && params[:docId].present?

    ensure_serial_default!(doc_type)
    lock_clause = connection.adapter_name.downcase.include?("mysql") ? " FOR UPDATE" : ""
    setting = connection.exec_query(
      ActiveRecord::Base.sanitize_sql_array(["SELECT * FROM document_serial_settings WHERE doc_type = ? LIMIT 1#{lock_clause}", doc_type])
    ).first

    raise "Document serial setting not found for #{doc_type}" unless setting
    raise "Document serial setting is inactive for #{doc_type}" unless ActiveModel::Type::Boolean.new.cast(setting["active"])

    next_number = setting["current_number"].to_i + 1
    if next_number > setting["range_end"].to_i
      raise "Document serial range exhausted for #{doc_type.upcase}. Update the range in Admin settings."
    end

    connection.execute(ActiveRecord::Base.sanitize_sql_array([
      "UPDATE document_serial_settings SET current_number = ?, updated_at = ? WHERE doc_type = ?",
      next_number, Time.current, doc_type
    ]))

    "#{setting["prefix"]}#{next_number.to_s.rjust(setting["padding"].to_i, "0")}"
  end

  def ensure_serial_default!(doc_type)
    return if connection.exec_query(ActiveRecord::Base.sanitize_sql_array(["SELECT 1 FROM document_serial_settings WHERE doc_type = ? LIMIT 1", doc_type])).first

    attrs = SERIAL_DEFAULTS.fetch(doc_type) { { prefix: "#{doc_type.upcase}-", range_start: 1, range_end: 999_999, current_number: 0, padding: 4 } }
    connection.execute(ActiveRecord::Base.sanitize_sql_array([
      <<~SQL.squish,
        INSERT INTO document_serial_settings
          (doc_type, prefix, range_start, range_end, current_number, padding, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      SQL
      doc_type, attrs[:prefix], attrs[:range_start], attrs[:range_end], attrs[:current_number], attrs[:padding], true, Time.current, Time.current
    ]))
  end

  def last_insert_id
    sql = connection.adapter_name.downcase.include?("mysql") ? "SELECT LAST_INSERT_ID() AS id" : "SELECT last_insert_rowid() AS id"
    connection.exec_query(sql).first["id"]
  end

  def totals_for(items)
    subtotal = items.sum { |item| item[:quantity].to_f * item[:unitPrice].to_f }
    tax_amount = items.sum { |item| item[:quantity].to_f * item[:unitPrice].to_f * item[:taxPct].to_f / 100 }

    {
      subtotal: subtotal.round(2),
      tax_amount: tax_amount.round(2),
      total_amount: (subtotal + tax_amount).round(2)
    }
  end

  def accepted_quantity(item)
    item[:acceptedQty].presence ? item[:acceptedQty].to_f : item[:quantity].to_f
  end

  def resolve_id(table, number_column, value)
    return nil if value.blank?
    return value.to_i if value.to_s.match?(/\A\d+\z/)

    result = connection.exec_query(
      ActiveRecord::Base.sanitize_sql_array(["SELECT id FROM #{table} WHERE #{number_column} = ? LIMIT 1", value])
    ).first
    result && result["id"]
  end
end
