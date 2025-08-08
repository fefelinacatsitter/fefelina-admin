-- Script para diagnosticar e corrigir problema de período dos serviços
-- Execute este script no SQL Editor do Supabase

-- 1. Primeiro, vamos ver os dados atuais dos serviços e suas visitas
SELECT 
  s.id as service_id,
  s.data_inicio,
  s.data_fim,
  s.status,
  s.total_visitas,
  c.nome as cliente_nome,
  s.nome_servico
FROM services s
JOIN clients c ON s.client_id = c.id
ORDER BY s.created_at DESC;

-- 2. Ver as visitas de cada serviço
SELECT 
  v.service_id,
  v.data,
  v.horario,
  v.status,
  v.status_pagamento,
  c.nome as cliente_nome
FROM visits v
JOIN services s ON v.service_id = s.id
JOIN clients c ON s.client_id = c.id
WHERE v.status != 'cancelada'
ORDER BY v.service_id, v.data;

-- 3. Verificar o que a função calcula para cada serviço
SELECT 
  s.id as service_id,
  c.nome as cliente_nome,
  s.nome_servico,
  'ATUAL:' as tipo,
  s.data_inicio as periodo_inicio,
  s.data_fim as periodo_fim,
  s.total_visitas,
  s.status
FROM services s
JOIN clients c ON s.client_id = c.id

UNION ALL

SELECT 
  s.id as service_id,
  c.nome as cliente_nome,
  s.nome_servico,
  'CALCULADO:' as tipo,
  calc.data_inicio as periodo_inicio,
  calc.data_fim as periodo_fim,
  calc.total_visitas,
  calc.status
FROM services s
JOIN clients c ON s.client_id = c.id
CROSS JOIN LATERAL calculate_service_totals_and_period(s.id) calc
ORDER BY service_id, tipo;

-- 4. Forçar recálculo de todos os serviços
DO $$
DECLARE
  service_record RECORD;
  totals RECORD;
BEGIN
  RAISE NOTICE 'Iniciando recálculo dos totais dos serviços...';
  
  FOR service_record IN SELECT id, nome_servico FROM services LOOP
    SELECT * INTO totals FROM calculate_service_totals_and_period(service_record.id);
    
    RAISE NOTICE 'Serviço %: % - Período: % até %', 
      service_record.id, 
      COALESCE(service_record.nome_servico, 'Sem nome'),
      totals.data_inicio,
      totals.data_fim;
    
    UPDATE services
    SET 
      total_visitas = totals.total_visitas,
      total_valor = totals.total_valor,
      total_a_receber = totals.total_a_receber,
      data_inicio = totals.data_inicio,
      data_fim = totals.data_fim,
      status = totals.status,
      updated_at = NOW()
    WHERE id = service_record.id;
  END LOOP;
  
  RAISE NOTICE 'Recálculo concluído!';
END $$;

-- 5. Verificar os dados após o recálculo
SELECT 
  s.id as service_id,
  c.nome as cliente_nome,
  s.nome_servico,
  s.data_inicio,
  s.data_fim,
  s.status,
  s.total_visitas,
  s.total_valor
FROM services s
JOIN clients c ON s.client_id = c.id
ORDER BY s.created_at DESC;
