require "test_helper"

module Finquery
  class SqlGuardTest < ActiveSupport::TestCase
    test "allows read only select queries" do
      assert_equal "SELECT * FROM vendors", SqlGuard.validate!("SELECT * FROM vendors;")
    end

    test "rejects mutating queries" do
      error = assert_raises(ArgumentError) do
        SqlGuard.validate!("DELETE FROM vendors")
      end

      assert_equal "Only SELECT or WITH queries can be executed", error.message
    end

    test "rejects stacked statements" do
      error = assert_raises(ArgumentError) do
        SqlGuard.validate!("SELECT * FROM vendors; DROP TABLE vendors")
      end

      assert_equal "Only one SQL statement is allowed", error.message
    end
  end
end
