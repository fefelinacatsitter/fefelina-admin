-- Arquivo de migração para atualizar tipos de caixa_movimentos
-- Execute este arquivo no SQL Editor do Supabase

-- 1. Atualizar tipos existentes (se houver dados antigos)
UPDATE caixa_movimentos 
SET tipo = 'receitas_servicos' 
WHERE tipo IN ('receita_servico', 'pagamento_servicos');

UPDATE caixa_movimentos 
SET tipo = 'receitas_outros' 
WHERE tipo = 'receita_outros';

UPDATE caixa_movimentos 
SET tipo = 'despesas_servicos' 
WHERE tipo IN ('despesa_transporte', 'despesa_servicos');

UPDATE caixa_movimentos 
SET tipo = 'despesas_outros' 
WHERE tipo IN ('racao', 'remedio', 'outros', 'despesas_medicas', 'despesas_recorrentes', 'despesas_outros');

-- 2. Manter rendimentos e pagamento_mensal como estão
-- (rendimentos já está correto)
-- (pagamento_mensal já está correto)

-- 3. Verificar se há dados para atualizar
SELECT 
    tipo, 
    COUNT(*) as quantidade,
    SUM(CASE WHEN valor > 0 THEN valor ELSE 0 END) as total_receitas,
    SUM(CASE WHEN valor < 0 THEN ABS(valor) ELSE 0 END) as total_despesas
FROM caixa_movimentos 
GROUP BY tipo
ORDER BY tipo;

-- 4. Se a tabela não existir ainda, execute o script completo do database-caixa-setup.sql
-- Se a tabela já existir, apenas os UPDATEs acima são necessários
