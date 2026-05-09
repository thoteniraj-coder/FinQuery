class GrnItem < ApplicationRecord
  belongs_to :grn
  belongs_to :po_item, optional: true
  belongs_to :item
end
