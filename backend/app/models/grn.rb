class Grn < ApplicationRecord
  self.table_name = 'grn'
  
  belongs_to :vendor
  belongs_to :purchase_order, foreign_key: :po_id, optional: true
  has_many :grn_items
  has_many :bills
end
