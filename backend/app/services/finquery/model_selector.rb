module Finquery
  class ModelSelector
    COMPLEX_PATTERN = /3.?way|match|reconcil|compare.*vs|overbill|shortage|across|vendor.*summary|pivot/i

    def self.call(prompt)
      if prompt.to_s.match?(COMPLEX_PATTERN)
        ENV.fetch("FINQUERY_COMPLEX_MODEL", "claude-sonnet-4-20250514")
      else
        ENV.fetch("FINQUERY_SIMPLE_MODEL", "claude-haiku-4-5-20251001")
      end
    end
  end
end
