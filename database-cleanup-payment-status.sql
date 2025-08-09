-- Remove payment status from visits table and update services status values
-- This script completes the migration from visit-level to service-level payment control

-- Step 1: Remove payment status from visits table
-- Remove index on status_pagamento if it exists
DROP INDEX IF EXISTS idx_visits_status_pagamento;

-- Remove the status_pagamento column from visits table
ALTER TABLE visits DROP COLUMN IF EXISTS status_pagamento;

-- Update comment for visits status to clarify it only tracks visit execution
COMMENT ON COLUMN visits.status IS 'Status da execução da visita: agendada, realizada ou cancelada (sem controle de pagamento)';

-- Step 2: Update services table to remove 'pago' from status field constraint
-- First remove the old constraint
ALTER TABLE services DROP CONSTRAINT IF EXISTS services_status_check;

-- Add new constraint without 'pago' option (payment is now controlled by status_pagamento)
ALTER TABLE services ADD CONSTRAINT services_status_check 
CHECK (status IN ('pendente', 'em_andamento', 'concluido'));

-- Update any existing services that have status = 'pago' to 'concluido' and status_pagamento = 'pago'
UPDATE services 
SET status = 'concluido', status_pagamento = 'pago' 
WHERE status = 'pago' AND status_pagamento IS NULL;

-- Update any existing services that have status = 'pago' but already have a status_pagamento
UPDATE services 
SET status = 'concluido' 
WHERE status = 'pago' AND status_pagamento IS NOT NULL;

-- Update comment for services status
COMMENT ON COLUMN services.status IS 'Status de execução do serviço: pendente, em_andamento ou concluido (sem controle de pagamento)';

-- Verify changes were applied
SELECT 'visits_columns' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'visits' AND table_schema = 'public'
AND column_name LIKE '%status%'
ORDER BY ordinal_position;

SELECT 'services_columns' as table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'services' AND table_schema = 'public'
AND column_name LIKE '%status%'
ORDER BY ordinal_position;

-- Show visits table structure
SELECT 
    'visits' as table_name,
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'visits' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show services table structure
SELECT 
    'services' as table_name,
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'services' 
AND table_schema = 'public'
ORDER BY ordinal_position;
