-- Add payment status control to services table
-- This replaces the individual visit payment control with service-level payment control

-- Add status_pagamento column to services table
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS status_pagamento TEXT 
CHECK (status_pagamento IN ('pendente', 'pendente_plataforma', 'pago_parcialmente', 'pago')) 
DEFAULT 'pendente';

-- Add comment for the new column
COMMENT ON COLUMN services.status_pagamento IS 'Status do pagamento do serviço: pendente, pendente_plataforma, pago_parcialmente ou pago';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_services_status_pagamento ON services(status_pagamento);

-- Update existing services to have default payment status
UPDATE services 
SET status_pagamento = 'pendente' 
WHERE status_pagamento IS NULL;

-- Verify the column was added
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'services' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show current structure of services table
\d services;
