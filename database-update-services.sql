-- Script de atualização do banco de dados para Serviços e Visitas
-- Execute este script no SQL Editor do Supabase

-- 1. Atualizar tabela services
-- Adicionar campos para melhor controle dos serviços
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS nome_servico TEXT,
ADD COLUMN IF NOT EXISTS desconto_plataforma_default DECIMAL(5,2) DEFAULT 0;

-- Comentário para documentar os campos
COMMENT ON COLUMN services.nome_servico IS 'Nome/descrição do serviço prestado';
COMMENT ON COLUMN services.desconto_plataforma_default IS 'Percentual de desconto padrão da plataforma para este serviço';

-- 2. Atualizar tabela visits
-- Adicionar novos campos para controle detalhado das visitas
ALTER TABLE visits 
ADD COLUMN IF NOT EXISTS tipo_visita TEXT CHECK (tipo_visita IN ('inteira', 'meia')) NOT NULL DEFAULT 'inteira',
ADD COLUMN IF NOT EXISTS status_pagamento TEXT CHECK (status_pagamento IN ('pendente_plataforma', 'pendente', 'pago')) DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS desconto_plataforma DECIMAL(5,2) DEFAULT 0;

-- Comentários para documentar os novos campos
COMMENT ON COLUMN visits.tipo_visita IS 'Tipo da visita: inteira (valor diário completo) ou meia (metade do valor de 2 visitas)';
COMMENT ON COLUMN visits.status_pagamento IS 'Status do pagamento: pendente_plataforma, pendente ou pago';
COMMENT ON COLUMN visits.desconto_plataforma IS 'Percentual de desconto da plataforma aplicado nesta visita';

-- 3. Criar índices adicionais para performance
CREATE INDEX IF NOT EXISTS idx_visits_tipo_visita ON visits(tipo_visita);
CREATE INDEX IF NOT EXISTS idx_visits_status_pagamento ON visits(status_pagamento);
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);

-- 4. Criar função aprimorada para calcular totais e período do serviço automaticamente
CREATE OR REPLACE FUNCTION calculate_service_totals_and_period(service_id_param UUID)
RETURNS TABLE(
  total_visitas INTEGER,
  total_valor DECIMAL(10,2),
  total_a_receber DECIMAL(10,2),
  data_inicio DATE,
  data_fim DATE,
  status TEXT
) AS $$
DECLARE
  visit_count INTEGER;
  paid_count INTEGER;
  pending_count INTEGER;
  calculated_status TEXT;
BEGIN
  -- Calcular totais básicos incluindo período correto das visitas
  SELECT 
    COUNT(*)::INTEGER,
    COALESCE(SUM(v.valor), 0)::DECIMAL(10,2),
    COALESCE(SUM(v.valor * (1 - v.desconto_plataforma / 100)), 0)::DECIMAL(10,2),
    MIN(v.data)::DATE,
    MAX(v.data)::DATE
  INTO 
    visit_count,
    total_valor,
    total_a_receber,
    data_inicio,
    data_fim
  FROM visits v
  WHERE v.service_id = service_id_param
    AND v.status != 'cancelada';

  -- Calcular status baseado nos pagamentos das visitas
  SELECT 
    COUNT(*) FILTER (WHERE status_pagamento = 'pago'),
    COUNT(*) FILTER (WHERE status_pagamento IN ('pendente', 'pendente_plataforma'))
  INTO paid_count, pending_count
  FROM visits v
  WHERE v.service_id = service_id_param
    AND v.status != 'cancelada';

  -- Determinar status do serviço
  IF visit_count = 0 THEN
    calculated_status := 'pendente';
    -- Se não há visitas, usar data atual
    data_inicio := CURRENT_DATE;
    data_fim := CURRENT_DATE;
  ELSIF paid_count = visit_count THEN
    calculated_status := 'pago';
  ELSIF pending_count > 0 THEN
    calculated_status := 'pendente';
  ELSE
    calculated_status := 'concluido';
  END IF;

  RETURN QUERY
  SELECT 
    visit_count,
    total_valor,
    total_a_receber,
    data_inicio,
    data_fim,
    calculated_status;
END;
$$ LANGUAGE plpgsql;

-- 5. Atualizar função de trigger para usar a nova função
CREATE OR REPLACE FUNCTION update_service_totals()
RETURNS TRIGGER AS $$
DECLARE
  service_totals RECORD;
BEGIN
  -- Pegar o service_id correto baseado na operação
  DECLARE service_id_to_update UUID;
  BEGIN
    IF TG_OP = 'DELETE' THEN
      service_id_to_update := OLD.service_id;
    ELSE
      service_id_to_update := NEW.service_id;
    END IF;

    -- Calcular os novos totais e período
    SELECT * INTO service_totals
    FROM calculate_service_totals_and_period(service_id_to_update);

    -- Atualizar a tabela services com todos os campos calculados
    UPDATE services
    SET 
      total_visitas = service_totals.total_visitas,
      total_valor = service_totals.total_valor,
      total_a_receber = service_totals.total_a_receber,
      data_inicio = service_totals.data_inicio,
      data_fim = service_totals.data_fim,
      status = service_totals.status,
      updated_at = NOW()
    WHERE id = service_id_to_update;

    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END;
END;
$$ LANGUAGE plpgsql;

-- 6. Criar triggers para manter os totais sincronizados
DROP TRIGGER IF EXISTS trigger_update_service_totals_on_visit_changes ON visits;

CREATE TRIGGER trigger_update_service_totals_on_visit_changes
  AFTER INSERT OR UPDATE OR DELETE ON visits
  FOR EACH ROW
  EXECUTE FUNCTION update_service_totals();

-- 7. Atualizar totais existentes (caso já existam serviços)
DO $$
DECLARE
  service_record RECORD;
  totals RECORD;
BEGIN
  FOR service_record IN SELECT id FROM services LOOP
    SELECT * INTO totals FROM calculate_service_totals_and_period(service_record.id);
    
    UPDATE services
    SET 
      total_visitas = totals.total_visitas,
      total_valor = totals.total_valor,
      total_a_receber = totals.total_a_receber,
      data_inicio = totals.data_inicio,
      data_fim = totals.data_fim,
      status = totals.status
    WHERE id = service_record.id;
  END LOOP;
END $$;

-- 8. Inserir dados de exemplo (opcional - remover se não quiser dados de teste)
/*
-- Exemplo de serviço com visitas
INSERT INTO services (client_id, nome_servico, data_inicio, data_fim, status, desconto_plataforma_default)
SELECT 
  c.id,
  'Cuidados de Final de Semana',
  '2024-01-15',
  '2024-01-21',
  'em_andamento',
  5.0
FROM clients c 
LIMIT 1;

-- Exemplo de visitas para o serviço
INSERT INTO visits (service_id, data, horario, tipo_visita, valor, status, status_pagamento, desconto_plataforma, observacoes)
SELECT 
  s.id,
  '2024-01-16',
  '09:00',
  'inteira',
  c.valor_diaria,
  'realizada',
  'pago',
  5.0,
  'Primeira visita do serviço'
FROM services s
JOIN clients c ON s.client_id = c.id
LIMIT 1;
*/

-- 9. Verificar se tudo foi criado corretamente
SELECT 
  'services' as tabela,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'services' 
  AND column_name IN ('nome_servico', 'desconto_plataforma_default')

UNION ALL

SELECT 
  'visits' as tabela,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'visits' 
  AND column_name IN ('tipo_visita', 'status_pagamento', 'desconto_plataforma');

-- Mostrar estrutura das tabelas atualizadas
SELECT 'Estrutura da tabela services atualizada com sucesso!' as status;
SELECT 'Estrutura da tabela visits atualizada com sucesso!' as status;
SELECT 'Funções e triggers criados com sucesso!' as status;
