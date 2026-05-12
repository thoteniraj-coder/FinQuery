require "json"
require "net/http"

module Finquery
  class OllamaClient
    DEFAULT_BASE_URL = "http://localhost:11434".freeze
    DEFAULT_MODEL = "qwen2:7b".freeze

    def initialize(base_url: ENV.fetch("OLLAMA_BASE_URL", DEFAULT_BASE_URL), model: ENV.fetch("OLLAMA_MODEL", DEFAULT_MODEL))
      @base_url = base_url
      @model = model
    end

    def generate_sql(prompt)
      response = post_generate(prompt)
      sql = extract_sql(response.fetch("response", ""))

      {
        sql: sql,
        model: "ollama/#{response["model"] || model}"
      }
    end

    private

    attr_reader :base_url, :model

    def post_generate(prompt)
      uri = URI.join(base_url, "/api/generate")
      request = Net::HTTP::Post.new(uri)
      request["Content-Type"] = "application/json"
      request.body = {
        model: model,
        prompt: prompt_body(prompt),
        stream: false,
        options: {
          temperature: 0.1,
          top_p: 0.9
        }
      }.to_json

      response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == "https", read_timeout: 120, open_timeout: 5) do |http|
        http.request(request)
      end

      parsed = JSON.parse(response.body)
      return parsed if response.is_a?(Net::HTTPSuccess)

      message = parsed["error"].presence || response.body
      raise StandardError, "Ollama API Error: #{message}"
    rescue Errno::ECONNREFUSED, Net::OpenTimeout
      raise Finquery::UpstreamUnavailableError, "Ollama is not reachable at #{base_url}. Start Ollama or update OLLAMA_BASE_URL."
    rescue Socket::ResolutionError, SocketError
      raise Finquery::UpstreamUnavailableError, "Ollama host cannot be resolved: #{base_url}. If this is a trycloudflare.com URL, create a new tunnel and update OLLAMA_BASE_URL."
    rescue JSON::ParserError
      raise StandardError, "Ollama returned an invalid response."
    end

    def prompt_body(prompt)
      <<~PROMPT
        #{Finquery::SystemPrompt::PROMPT}

        Current database adapter: #{database_adapter}.
        Adapter-specific rule:
        - For MySQL/Mysql2 month grouping, use DATE_FORMAT(date_col, '%Y-%m').
        - For SQLite month grouping, use strftime('%Y-%m', date_col).

        User question:
        #{prompt}

        Return ONLY one read-only SQL query. Do not include markdown fences or explanation.
      PROMPT
    end

    def extract_sql(text)
      sql = text.to_s.strip
      sql = sql.sub(/\A```sql\s*/i, "").sub(/\A```\s*/, "").sub(/```\z/, "").strip
      first_sql_keyword = sql.match(/\b(SELECT|WITH)\b/i)
      sql = sql[first_sql_keyword.begin(0)..] if first_sql_keyword
      sql = "#{sql.split(";").first};" if sql.include?(";")

      Finquery::SqlGuard.validate!(sql)
    end

    def database_adapter
      ActiveRecord::Base.connection.adapter_name
    rescue StandardError
      "unknown"
    end
  end
end
