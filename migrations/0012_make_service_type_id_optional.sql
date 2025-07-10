
-- Make service_type_id nullable since we're using unified_service_id now
ALTER TABLE services ALTER COLUMN service_type_id DROP NOT NULL;
