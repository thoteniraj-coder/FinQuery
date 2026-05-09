module Api
  module V1
    class BaseController < ApplicationController
      skip_before_action :verify_authenticity_token, raise: false

      private

      def render_success(data, status: :ok, meta: {})
        render json: { data: data, meta: meta }, status: status
      end

      def render_error(status, message, errors: nil)
        render json: { error: message, errors: errors }.compact, status: status
      end

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

      def rows(sql, binds = [])
        sanitized = ActiveRecord::Base.sanitize_sql_array([sql, *binds])
        connection.exec_query(sanitized).to_a
      end

      def row(sql, binds = [])
        rows(sql, binds).first
      end
    end
  end
end
