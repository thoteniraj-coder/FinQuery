module Api
  class SchemaController < ApplicationController
    INTERNAL_TABLES = %w[ar_internal_metadata schema_migrations].freeze

    def show
      tables = ActiveRecord::Base.connection.tables
        .reject { |table| INTERNAL_TABLES.include?(table) }
        .sort
        .to_h { |table| [table, columns_for(table)] }

      render json: {
        tables: tables,
        prompt: Finquery::SystemPrompt::PROMPT,
        examples: examples
      }
    end

    private

    def columns_for(table)
      ActiveRecord::Base.connection.columns(table).map do |column|
        {
          name: column.name,
          type: column.sql_type,
          default: column.default,
          null: column.null
        }
      end
    end

    def examples
      [
        "Show unpaid bills with vendor name and due date",
        "Compare PO, GRN and bill quantities for PO-2026-002",
        "Find GRNs that do not have bills",
        "Show vendor-wise PO, GRN and bill summary"
      ]
    end
  end
end
