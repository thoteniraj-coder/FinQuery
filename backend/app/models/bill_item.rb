class BillItem < ApplicationRecord
  belongs_to :bill
  belongs_to :po_item, optional: true
  belongs_to :grn_item, optional: true
  belongs_to :item
end
