-- Criação da tabela para controle de caixa do Fefelina
CREATE TABLE IF NOT EXISTS caixa_movimentos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    data DATE NOT NULL,
    valor DECIMAL(10,2) NOT NULL, -- Positivo para receitas, negativo para despesas
    tipo VARCHAR(50) NOT NULL, -- 'receitas_servicos', 'receitas_outros', 'despesas_servicos', 'despesas_outros', 'rendimentos', 'pagamento_mensal'
    descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_caixa_movimentos_data ON caixa_movimentos(data);
CREATE INDEX IF NOT EXISTS idx_caixa_movimentos_tipo ON caixa_movimentos(tipo);
CREATE INDEX IF NOT EXISTS idx_caixa_movimentos_created_at ON caixa_movimentos(created_at);

-- RLS (Row Level Security)
ALTER TABLE caixa_movimentos ENABLE ROW LEVEL SECURITY;

-- Política de segurança (ajuste conforme sua necessidade)
CREATE POLICY "Enable read access for all users" ON caixa_movimentos FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON caixa_movimentos FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON caixa_movimentos FOR UPDATE USING (true);
CREATE POLICY "Enable delete for authenticated users only" ON caixa_movimentos FOR DELETE USING (true);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_caixa_movimentos_updated_at 
    BEFORE UPDATE ON caixa_movimentos 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Inserir alguns dados de exemplo (opcional)
INSERT INTO caixa_movimentos (data, valor, tipo, descricao) VALUES
('2025-09-01', 150.00, 'receitas_servicos', 'Pagamento serviço Maria - Setembro'),
('2025-09-05', -25.00, 'despesas_servicos', 'Combustível para visitas'),
('2025-09-10', 200.00, 'receitas_servicos', 'Pagamento serviço João - Setembro'),
('2025-09-15', 300.00, 'pagamento_mensal', 'Aporte mensal para investimentos'),
('2025-09-20', 15.00, 'rendimentos', 'Rendimento investimentos setembro'),
('2025-09-22', 50.00, 'receitas_outros', 'Venda de materiais usados'),
('2025-09-23', -45.00, 'despesas_outros', 'Material de limpeza');
