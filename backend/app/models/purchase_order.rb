class PurchaseOrder < ApplicationRecord
  belongs_to :vendor
  has_many :po_items, foreign_key: :po_id
  has_many :grns, foreign_key: :po_id
  has_many :bills, foreign_key: :po_id
end
