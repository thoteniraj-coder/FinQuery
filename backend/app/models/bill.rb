class Bill < ApplicationRecord
  belongs_to :vendor
  belongs_to :purchase_order, foreign_key: :po_id, optional: true
  belongs_to :grn, optional: true
  has_many :bill_items
end
