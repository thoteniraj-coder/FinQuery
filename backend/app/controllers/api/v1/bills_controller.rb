module Api
  module V1
    class BillsController < BaseController
      def index
        render_success(rows(<<~SQL))
          SELECT b.*, v.name AS vendor_name
          FROM bills b
          JOIN vendors v ON v.id = b.vendor_id
          ORDER BY b.due_date DESC
        SQL
      end

      def show
        bill = row("SELECT b.*, v.name AS vendor_name FROM bills b JOIN vendors v ON v.id = b.vendor_id WHERE b.id = ? OR b.bill_number = ?", params[:id], params[:id])
        return render_error(:not_found, "Bill not found") unless bill

        render_success(bill)
      end

      def three_way_match
        bill = row("SELECT * FROM bills WHERE id = ? OR bill_number = ?", params[:bill_id], params[:bill_id])
        return render_error(:not_found, "Bill not found") unless bill

        purchase_order_column = column_name("bills", "po_id", "purchase_order_id")
        purchase_order_id = bill[purchase_order_column]
        if purchase_order_id
          redirect_to api_v1_purchase_order_match_path(purchase_order_id)
        else
          render_success({ bill_number: bill["bill_number"], total_lines: 0, matched_count: 0, issue_count: 0, lines: [] })
        end
      end

      def review
        render_success({
          document_type: "Bill",
          document_id: params[:bill_id],
          action: params[:action_type],
          comment: params[:comment]
        }, status: :created)
      end
    end
  end
end
