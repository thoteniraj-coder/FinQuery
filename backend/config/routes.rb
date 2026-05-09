Rails.application.routes.draw do
  namespace :api do
    get "health", to: "health#show"
    get "schema", to: "schema#show"
    post "query", to: "queries#create"
    post "generate-sql", to: "queries#generate"
    post "run-sql", to: "queries#run"
    post "financial_documents", to: "financial_documents#create"

    namespace :v1 do
      post "auth/login", to: "auth#login"
      get "auth/me", to: "auth#me"
      delete "auth/logout", to: "auth#logout"

      resources :vendors
      resources :users, only: [:index, :update]
      resources :document_serial_settings, only: [:index, :show, :update]

      resources :purchase_orders, only: [:index, :show] do
        get "match", to: "purchase_orders#three_way_match"
        post "review", to: "purchase_orders#review"
      end

      resources :grns, only: [:index, :show] do
        get "match", to: "grns#three_way_match"
        post "review", to: "grns#review"
      end

      resources :bills, only: [:index, :show] do
        get "match", to: "bills#three_way_match"
        post "review", to: "bills#review"
      end
    end
  end

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  # Defines the root path route ("/")
  # root "posts#index"
end
