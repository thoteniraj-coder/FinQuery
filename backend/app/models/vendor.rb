class Vendor < ApplicationRecord
  has_many :purchase_orders
  has_many :grns
  has_many :bills
end
