module Finquery
  class SqlRunner
    def self.call(sql)
      result = ActiveRecord::Base.connection.exec_query(sql)
      {
        columns: result.columns,
        rows: result.rows,
        row_count: result.rows.length
      }
    rescue => e
      raise ArgumentError, "SQL Execution Error: #{e.message}"
    end
  end
end
