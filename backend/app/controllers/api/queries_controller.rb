module Api
  class QueriesController < ApplicationController
    rescue_from StandardError, with: :render_server_error
    rescue_from Finquery::UpstreamUnavailableError, with: :render_upstream_unavailable
    rescue_from ArgumentError, with: :render_bad_request

    def create
      prompt = required_param(:prompt)
      generated = Finquery::QueryGenerator.new.generate_sql(prompt)
      sql = Finquery::SqlGuard.validate!(generated[:sql])
      result = Finquery::SqlRunner.call(sql)

      render json: generated.merge(sql: sql, result: result)
    end

    def generate
      prompt = required_param(:prompt)

      render json: Finquery::QueryGenerator.new.generate_sql(prompt)
    end

    def run
      sql = required_param(:sql)

      render json: {
        sql: Finquery::SqlGuard.validate!(sql),
        result: Finquery::SqlRunner.call(sql)
      }
    end

    private

    def required_param(name)
      value = params[name]
      raise ArgumentError, "#{name} is required" if value.blank?

      value
    end

    def render_bad_request(error)
      render json: { error: error.message }, status: :bad_request
    end

    def render_upstream_unavailable(error)
      Rails.logger.error("#{error.class}: #{error.message}")
      render json: { error: error.message }, status: :service_unavailable
    end

    def render_server_error(error)
      Rails.logger.error("#{error.class}: #{error.message}")
      render json: { error: error.message }, status: :internal_server_error
    end
  end
end
