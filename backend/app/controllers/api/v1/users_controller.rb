module Api
  module V1
    class UsersController < BaseController
      USERS = [
        { id: 1, name: "Niraj Patel", email: "admin@finquery.com", role: "admin", department: "Finance", active: true, last_login_at: "2026-05-09T09:30:00Z" },
        { id: 2, name: "Meera Iyer", email: "manager@finquery.com", role: "finance_manager", department: "Procurement", active: true, last_login_at: "2026-05-08T17:10:00Z" },
        { id: 3, name: "Anil Sharma", email: "reviewer@finquery.com", role: "reviewer", department: "Accounts Payable", active: true, last_login_at: "2026-05-07T11:42:00Z" },
        { id: 4, name: "Ravi Kumar", email: "ravi.kumar@finquery.com", role: "viewer", department: "Operations", active: false, last_login_at: "2026-04-28T14:25:00Z" }
      ].freeze

      def index
        if connection.data_source_exists?("users")
          render_success(rows("SELECT id, name, email, role, department, avatar_initials, active, last_login_at FROM users ORDER BY name"))
        else
          render_success(USERS)
        end
      end

      def update
        if connection.data_source_exists?("users")
          connection.execute(ActiveRecord::Base.sanitize_sql_array(["UPDATE users SET active = ? WHERE id = ?", ActiveModel::Type::Boolean.new.cast(params[:active]), params[:id]]))
          return render_success(row("SELECT id, name, email, role, department, avatar_initials, active, last_login_at FROM users WHERE id = ?", params[:id]))
        end

        user = USERS.find { |candidate| candidate[:id] == params[:id].to_i }
        return render_error(:not_found, "User not found") unless user

        render_success(user.merge(active: ActiveModel::Type::Boolean.new.cast(params[:active])))
      end
    end
  end
end
