module Api
  module V1
    class VendorsController < BaseController
      def index
        clauses = []
        binds = []

        if params[:q].present?
          clauses << "(LOWER(name) LIKE ? OR LOWER(gstin) LIKE ? OR LOWER(vendor_code) LIKE ?)"
          term = "%#{params[:q].downcase}%"
          binds += [term, term, term]
        end

        if params[:status].present?
          clauses << "status = ?"
          binds << params[:status]
        end

        where_sql = clauses.any? ? "WHERE #{clauses.join(" AND ")}" : ""
        vendors = rows("SELECT * FROM vendors #{where_sql} ORDER BY name", binds)

        render_success(vendors, meta: { total_count: vendors.length })
      end

      def show
        vendor = row("SELECT * FROM vendors WHERE id = ? OR vendor_code = ?", params[:id], params[:id])
        return render_error(:not_found, "Vendor not found") unless vendor

        render_success(vendor)
      end

      def create
        attrs = vendor_params
        next_code = "VEN-#{(row("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM vendors")["next_id"]).to_s.rjust(4, "0")}"

        connection.execute(ActiveRecord::Base.sanitize_sql_array([
          "INSERT INTO vendors (vendor_code, name, gstin, city, state, contact_name, contact_email, contact_phone, payment_terms, credit_limit, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          next_code, attrs[:name], attrs[:gstin], attrs[:city], attrs[:state], attrs[:contact_name], attrs[:contact_email],
          attrs[:contact_phone], attrs[:payment_terms], attrs[:credit_limit].to_f, attrs[:status].presence || "active"
        ]))

        render_success(row("SELECT * FROM vendors WHERE vendor_code = ?", next_code), status: :created)
      rescue ActiveRecord::StatementInvalid => e
        render_error(:unprocessable_entity, "Vendor could not be saved", errors: [e.message])
      end

      def update
        vendor = row("SELECT * FROM vendors WHERE id = ? OR vendor_code = ?", params[:id], params[:id])
        return render_error(:not_found, "Vendor not found") unless vendor

        attrs = vendor_params
        connection.execute(ActiveRecord::Base.sanitize_sql_array([
          "UPDATE vendors SET name = ?, gstin = ?, city = ?, state = ?, contact_name = ?, contact_email = ?, contact_phone = ?, payment_terms = ?, credit_limit = ?, status = ? WHERE id = ?",
          attrs[:name].presence || vendor["name"], attrs[:gstin].presence || vendor["gstin"], attrs[:city], attrs[:state],
          attrs[:contact_name], attrs[:contact_email], attrs[:contact_phone], attrs[:payment_terms], attrs[:credit_limit].to_f,
          attrs[:status].presence || vendor["status"], vendor["id"]
        ]))

        render_success(row("SELECT * FROM vendors WHERE id = ?", vendor["id"]))
      end

      def destroy
        connection.execute(ActiveRecord::Base.sanitize_sql_array(["UPDATE vendors SET status = 'inactive' WHERE id = ? OR vendor_code = ?", params[:id], params[:id]]))
        render_success({ message: "Vendor marked inactive" })
      end

      private

      def vendor_params
        params.permit(:name, :gstin, :city, :state, :contact_name, :contact_email, :contact_phone, :payment_terms, :credit_limit, :status)
      end
    end
  end
end
