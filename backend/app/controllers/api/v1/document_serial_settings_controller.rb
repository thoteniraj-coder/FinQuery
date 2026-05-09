module Api
  module V1
    class DocumentSerialSettingsController < BaseController
      DEFAULTS = {
        "po" => { prefix: "PO-2026-", range_start: 1, range_end: 999, current_number: 4, padding: 3 },
        "grn" => { prefix: "GRN-2026-", range_start: 1, range_end: 999, current_number: 3, padding: 3 },
        "bill" => { prefix: "BILL-2026-", range_start: 1, range_end: 999, current_number: 3, padding: 3 }
      }.freeze

      def index
        ensure_defaults!
        settings = rows("SELECT * FROM document_serial_settings ORDER BY CASE doc_type WHEN 'po' THEN 1 WHEN 'grn' THEN 2 WHEN 'bill' THEN 3 ELSE 4 END, doc_type")
        render_success(settings.map { |setting| decorate(setting) })
      end

      def show
        ensure_defaults!
        setting = setting_for(params[:id])
        return render_error(:not_found, "Serial setting not found") unless setting

        render_success(decorate(setting))
      end

      def update
        ensure_defaults!
        setting = setting_for(params[:id])
        return render_error(:not_found, "Serial setting not found") unless setting

        attrs = serial_params
        current_number = attrs[:current_number].presence || setting["current_number"]
        range_start = attrs[:range_start].presence || setting["range_start"]
        range_end = attrs[:range_end].presence || setting["range_end"]
        padding = attrs[:padding].presence || setting["padding"]
        prefix = attrs[:prefix].presence || setting["prefix"]

        return render_error(:unprocessable_entity, "Prefix is required") if prefix.blank?
        return render_error(:unprocessable_entity, "Range end must be greater than or equal to range start") if range_end.to_i < range_start.to_i
        if current_number.to_i < range_start.to_i - 1 || current_number.to_i > range_end.to_i
          return render_error(:unprocessable_entity, "Current number must be between range start - 1 and range end")
        end
        return render_error(:unprocessable_entity, "Padding must be between 1 and 12") unless padding.to_i.between?(1, 12)

        connection.execute(ActiveRecord::Base.sanitize_sql_array([
          <<~SQL.squish,
            UPDATE document_serial_settings
            SET prefix = ?, range_start = ?, range_end = ?, current_number = ?, padding = ?, active = ?, updated_at = ?
            WHERE doc_type = ?
          SQL
          prefix,
          range_start.to_i,
          range_end.to_i,
          current_number.to_i,
          padding.to_i,
          ActiveModel::Type::Boolean.new.cast(attrs.key?("active") ? attrs[:active] : setting["active"]),
          Time.current,
          setting["doc_type"]
        ]))

        render_success(decorate(setting_for(setting["doc_type"])))
      end

      private

      def ensure_defaults!
        DEFAULTS.each do |doc_type, attrs|
          next if setting_for(doc_type)

          connection.execute(ActiveRecord::Base.sanitize_sql_array([
            <<~SQL.squish,
              INSERT INTO document_serial_settings
                (doc_type, prefix, range_start, range_end, current_number, padding, active, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            SQL
            doc_type, attrs[:prefix], attrs[:range_start], attrs[:range_end], attrs[:current_number], attrs[:padding], true, Time.current, Time.current
          ]))
        end
      end

      def setting_for(doc_type)
        row("SELECT * FROM document_serial_settings WHERE doc_type = ? LIMIT 1", doc_type)
      end

      def serial_params
        params.permit(:prefix, :range_start, :range_end, :current_number, :padding, :active)
      end

      def decorate(setting)
        next_number = setting["current_number"].to_i + 1
        setting.merge(
          "next_number" => next_number,
          "next_document_number" => "#{setting["prefix"]}#{next_number.to_s.rjust(setting["padding"].to_i, "0")}",
          "remaining" => [setting["range_end"].to_i - setting["current_number"].to_i, 0].max
        )
      end
    end
  end
end
