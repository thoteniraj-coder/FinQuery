module Finquery
  class QueryGenerator
    def initialize(provider: ENV.fetch("FINQUERY_AI_PROVIDER", "ollama"))
      @provider = provider.to_s.downcase
    end

    def generate_sql(prompt)
      client.generate_sql(prompt)
    end

    private

    attr_reader :provider

    def client
      case provider
      when "ollama"
        Finquery::OllamaClient.new
      when "anthropic", "claude"
        Finquery::AnthropicClient.new
      else
        raise ArgumentError, "Unsupported AI provider: #{provider}"
      end
    end
  end
end
