require "test_helper"

module Finquery
  class OllamaClientTest < ActiveSupport::TestCase
    test "extracts sql from markdown responses" do
      client = OllamaClient.new

      sql = client.send(:extract_sql, "```sql\nSELECT * FROM vendors;\n```")

      assert_equal "SELECT * FROM vendors", sql
    end

    test "rejects non read only responses" do
      client = OllamaClient.new

      assert_raises(ArgumentError) do
        client.send(:extract_sql, "DELETE FROM vendors;")
      end
    end
  end
end
