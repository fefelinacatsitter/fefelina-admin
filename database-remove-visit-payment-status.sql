-- Remove payment status control from visits table
-- Payment control is now only at service level

-- Remove index on status_pagamento if it exists
DROP INDEX IF EXISTS idx_visits_status_pagamento;

-- Remove the status_pagamento column from visits table
ALTER TABLE visits DROP COLUMN IF EXISTS status_pagamento;

-- Remove comment references to status_pagamento if they exist
COMMENT ON COLUMN visits.status IS 'Status da visita: agendada, realizada ou cancelada';

-- Update any views or triggers that might reference the old column
-- (Add specific updates here if there are any views/triggers that use status_pagamento)

-- Verify the column was removed
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'visits' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show current structure of visits table
\d visits;
