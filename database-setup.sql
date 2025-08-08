-- Setup do banco de dados Supabase para Fefelina Admin
-- Execute estes comandos no SQL Editor do Supabase

-- 1. Criar tabela de clientes
CREATE TABLE IF NOT EXISTS clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    valor_diaria DECIMAL(10,2) NOT NULL,
    valor_duas_visitas DECIMAL(10,2) NOT NULL,
    endereco_completo TEXT NOT NULL,
    veterinario_confianca TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar tabela de pets
CREATE TABLE IF NOT EXISTS pets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    caracteristica TEXT NOT NULL,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Criar tabela de serviços
CREATE TABLE IF NOT EXISTS services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    status TEXT CHECK (status IN ('pendente', 'em_andamento', 'concluido', 'pago')) DEFAULT 'pendente',
    desconto_plataforma DECIMAL(5,2) DEFAULT 0,
    total_visitas INTEGER DEFAULT 0,
    total_valor DECIMAL(10,2) DEFAULT 0,
    total_a_receber DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Criar tabela de visitas
CREATE TABLE IF NOT EXISTS visits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    horario TIME NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    status TEXT CHECK (status IN ('agendada', 'realizada', 'cancelada')) DEFAULT 'agendada',
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_pets_client_id ON pets(client_id);
CREATE INDEX IF NOT EXISTS idx_services_client_id ON services(client_id);
CREATE INDEX IF NOT EXISTS idx_visits_service_id ON visits(service_id);
CREATE INDEX IF NOT EXISTS idx_visits_client_id ON visits(client_id);
CREATE INDEX IF NOT EXISTS idx_visits_data ON visits(data);

-- 6. Habilitar Row Level Security
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

-- 7. Criar políticas de segurança (permitir tudo para usuários autenticados)
-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON clients;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON pets;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON services;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON visits;

-- Criar novas políticas
CREATE POLICY "Allow all operations for authenticated users" ON clients FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON pets FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON services FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON visits FOR ALL USING (auth.role() = 'authenticated');
