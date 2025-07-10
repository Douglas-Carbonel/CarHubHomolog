
-- Migration to cleanup service logic and use only service_types

-- 1. Migrate any services that are using unified_service_id back to service_type_id
UPDATE services 
SET service_type_id = (
  SELECT st.id 
  FROM service_types st 
  JOIN unified_services us ON st.name = us.name 
  WHERE us.id = services.unified_service_id
)
WHERE unified_service_id IS NOT NULL AND service_type_id IS NULL;

-- 2. Make service_type_id required again
ALTER TABLE services ALTER COLUMN service_type_id SET NOT NULL;

-- 3. Drop the unified_service_id column
ALTER TABLE services DROP COLUMN IF EXISTS unified_service_id;

-- 4. Drop the service_items table
DROP TABLE IF EXISTS service_items;

-- 5. Drop the service_extras_items table
DROP TABLE IF EXISTS service_extras_items;

-- 6. Drop the service_extras table
DROP TABLE IF EXISTS service_extras;

-- 7. Drop the unified_services table
DROP TABLE IF EXISTS unified_services;

-- Now we only have service_types table for all service types
