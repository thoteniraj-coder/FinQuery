Rails.application.routes.draw do
  namespace :api do
    get "health", to: "health#show"
    get "schema", to: "schema#show"
    post "query", to: "queries#create"
    post "generate-sql", to: "queries#generate"
    post "run-sql", to: "queries#run"
  end

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Defines the root path route ("/")
  # root "posts#index"
end
