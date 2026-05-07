module Finquery
  class SqlGuard
    MUTATING_KEYWORDS = /\b(ALTER|ATTACH|CREATE|DELETE|DETACH|DROP|INSERT|PRAGMA|REINDEX|REPLACE|TRUNCATE|UPDATE|VACUUM)\b/i

    def self.validate!(sql)
      normalized = sql.to_s.strip
      raise ArgumentError, "SQL cannot be blank" if normalized.blank?
      raise ArgumentError, "Only SELECT or WITH queries can be executed" unless normalized.match?(/\A(SELECT|WITH)\b/i)
      raise ArgumentError, "Only one SQL statement is allowed" if normalized.delete_suffix(";").include?(";")
      raise ArgumentError, "Only read-only SQL is allowed" if normalized.match?(MUTATING_KEYWORDS)

      normalized.delete_suffix(";")
    end
  end
end
