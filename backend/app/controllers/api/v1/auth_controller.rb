module Api
  module V1
    class AuthController < BaseController
      DEMO_USERS = {
        "admin@finquery.com" => {
          id: 1,
          name: "Niraj Patel",
          email: "admin@finquery.com",
          role: "admin",
          department: "Finance",
          avatar_initials: "NP",
          active: true
        }
      }.freeze

      def login
        user = database_user(params[:email]) || DEMO_USERS[params[:email].to_s.downcase]

        return render_error(:unauthorized, "Invalid email or password") unless user && params[:password].present?

        render_success({
          token: "demo-jwt-token",
          user: user.merge(last_login_at: Time.current)
        })
      end

      def me
        render_success(database_user(params[:email]) || DEMO_USERS.values.first)
      end

      def logout
        render_success({ message: "Logged out" })
      end

      private

      def database_user(email)
        return nil unless connection.data_source_exists?("users")

        row = row("SELECT id, name, email, role, department, avatar_initials, active, last_login_at FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1", email)
        return nil unless row

        row.symbolize_keys.merge(active: ActiveModel::Type::Boolean.new.cast(row["active"]))
      end
    end
  end
end
