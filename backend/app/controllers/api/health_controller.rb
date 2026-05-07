module Api
  class HealthController < ApplicationController
    def show
      ActiveRecord::Base.connection.execute("SELECT 1")

      render json: {
        status: "ok",
        service: "finquery-api",
        database: true
      }
    end
  end
end
