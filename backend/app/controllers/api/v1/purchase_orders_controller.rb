module Api
  module V1
    class PurchaseOrdersController < BaseController
      def index
        render_success(rows(<<~SQL))
          SELECT po.*, v.name AS vendor_name
          FROM purchase_orders po
          JOIN vendors v ON v.id = po.vendor_id
          ORDER BY po.order_date DESC
        SQL
      end

      def show
        purchase_order = row(<<~SQL, params[:id], params[:id])
          SELECT po.*, v.name AS vendor_name
          FROM purchase_orders po
          JOIN vendors v ON v.id = po.vendor_id
          WHERE po.id = ? OR po.po_number = ?
        SQL
        return render_error(:not_found, "Purchase order not found") unless purchase_order

        render_success(purchase_order)
      end

      def three_way_match
        purchase_order = row("SELECT po.*, v.name AS vendor_name FROM purchase_orders po JOIN vendors v ON v.id = po.vendor_id WHERE po.id = ? OR po.po_number = ?", params[:purchase_order_id], params[:purchase_order_id])
        return render_error(:not_found, "Purchase order not found") unless purchase_order

        po_fk = column_name("po_items", "po_id", "purchase_order_id")
        lines = rows(<<~SQL, purchase_order["id"])
          SELECT
            poi.id AS po_item_id,
            i.name AS item_name,
            i.item_code,
            poi.uom,
            poi.unit_price,
            poi.tax_pct,
            poi.qty_ordered,
            COALESCE(SUM(gi.qty_accepted), 0) AS qty_received,
            COALESCE(SUM(bi.qty_billed), 0) AS qty_billed
          FROM po_items poi
          JOIN items i ON i.id = poi.item_id
          LEFT JOIN grn_items gi ON gi.po_item_id = poi.id
          LEFT JOIN bill_items bi ON bi.po_item_id = poi.id
          WHERE poi.#{po_fk} = ?
          GROUP BY poi.id, i.name, i.item_code, poi.uom, poi.unit_price, poi.tax_pct, poi.qty_ordered
          ORDER BY poi.line_no
        SQL

        decorated = lines.map { |line| decorate_match_line(line) }
        render_success({
          po_number: purchase_order["po_number"],
          vendor_name: purchase_order["vendor_name"],
          total_lines: decorated.length,
          matched_count: decorated.count { |line| line[:match_status] == "matched" },
          issue_count: decorated.count { |line| line[:match_status] != "matched" },
          lines: decorated
        })
      end

      def review
        render_success({
          document_type: "PurchaseOrder",
          document_id: params[:purchase_order_id],
          action: params[:action_type],
          comment: params[:comment],
          status_after: review_status_for(params[:action_type])
        }, status: :created)
      end

      private

      def decorate_match_line(line)
        qty_ordered = line["qty_ordered"].to_f
        qty_received = line["qty_received"].to_f
        qty_billed = line["qty_billed"].to_f
        unit_price = line["unit_price"].to_f

        status =
          if qty_billed == qty_received && qty_received == qty_ordered
            "matched"
          elsif qty_billed > qty_received
            "overbilled"
          elsif qty_received < qty_ordered
            "short_delivery"
          else
            "partial"
          end

        line.symbolize_keys.merge(
          qty_ordered: qty_ordered,
          qty_received: qty_received,
          qty_billed: qty_billed,
          po_value: (qty_ordered * unit_price).round(2),
          grn_value: (qty_received * unit_price).round(2),
          bill_value: (qty_billed * unit_price).round(2),
          variance: (qty_billed - qty_received).round(2),
          match_status: status
        )
      end

      def review_status_for(action)
        { "approve" => "approved", "reject" => "rejected", "request_changes" => "pending", "comment" => nil }[action]
      end
    end
  end
end
