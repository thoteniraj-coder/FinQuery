module Api
  module V1
    class GrnsController < BaseController
      def index
        grn_table = table_name("grns", "grn")
        render_success(rows(<<~SQL))
          SELECT g.*, v.name AS vendor_name
          FROM #{grn_table} g
          JOIN vendors v ON v.id = g.vendor_id
          ORDER BY g.receipt_date DESC
        SQL
      end

      def show
        grn_table = table_name("grns", "grn")
        grn = row("SELECT g.*, v.name AS vendor_name FROM #{grn_table} g JOIN vendors v ON v.id = g.vendor_id WHERE g.id = ? OR g.grn_number = ?", params[:id], params[:id])
        return render_error(:not_found, "GRN not found") unless grn

        render_success(grn)
      end

      def three_way_match
        grn_table = table_name("grns", "grn")
        grn = row("SELECT * FROM #{grn_table} WHERE id = ? OR grn_number = ?", params[:grn_id], params[:grn_id])
        return render_error(:not_found, "GRN not found") unless grn

        purchase_order_column = column_name(grn_table, "po_id", "purchase_order_id")
        purchase_order_id = grn[purchase_order_column]
        if purchase_order_id
          redirect_to api_v1_purchase_order_match_path(purchase_order_id)
        else
          render_success({ grn_number: grn["grn_number"], total_lines: 0, matched_count: 0, issue_count: 0, lines: [] })
        end
      end

      def review
        render_success({
          document_type: "Grn",
          document_id: params[:grn_id],
          action: params[:action_type],
          comment: params[:comment]
        }, status: :created)
      end
    end
  end
end
