require 'net/http'
require 'json'

module Finquery
  class AnthropicClient
    def generate_sql(prompt)
      api_key = ENV['ANTHROPIC_API_KEY']
      
      if api_key.blank?
        # Mocking for local dev when no API key is set
        return {
          sql: "SELECT v.name AS vendor, b.bill_number, b.status, b.total_amount, b.due_date\nFROM bills b\nJOIN vendors v ON b.vendor_id = v.id\nORDER BY b.total_amount DESC\nLIMIT 100",
          model: "mock-model (No API Key)"
        }
      end

      uri = URI("https://api.anthropic.com/v1/messages")
      req = Net::HTTP::Post.new(uri)
      req["x-api-key"] = api_key
      req["anthropic-version"] = "2023-06-01"
      req["content-type"] = "application/json"

      payload = {
        model: "claude-3-haiku-20240307",
        max_tokens: 1024,
        system: Finquery::SystemPrompt::PROMPT,
        messages: [{ role: "user", content: prompt }]
      }
      
      req.body = payload.to_json
      res = Net::HTTP.start(uri.hostname, uri.port, use_ssl: true) do |http|
        http.request(req)
      end
      
      if res.is_a?(Net::HTTPSuccess)
        parsed = JSON.parse(res.body)
        sql = parsed.dig("content", 0, "text") || ""
        { sql: sql.strip, model: parsed["model"] }
      else
        raise StandardError, "Anthropic API Error: #{res.body}"
      end
    end
  end
end
