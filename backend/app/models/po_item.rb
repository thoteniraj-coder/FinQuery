class PoItem < ApplicationRecord
  belongs_to :purchase_order, foreign_key: :po_id
  belongs_to :item
end
