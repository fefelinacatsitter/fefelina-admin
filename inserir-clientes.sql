-- Script para inserir todos os clientes na base de dados
-- Execute este script no SQL Editor do Supabase

-- Inserir todos os clientes
INSERT INTO clients (nome, valor_diaria, valor_duas_visitas, endereco_completo, veterinario_confianca) VALUES
('Amanda', 50.00, 65.00, 'Victor Konder, 304', ''),
('Ana Rebelato', 50.00, 65.00, 'Centro, 402', ''),
('Anderson (Handit)', 50.00, 65.00, 'Vila Nova', ''),
('Beth', 50.00, 65.00, 'Esc. Agricola, Casa', ''),
('Carolina', 40.00, 65.00, 'Velha Central', ''),
('Débora', 45.00, 65.00, 'Vila Nova, 802', ''),
('Gisele', 55.00, 65.00, 'Esc. Agricola, Casa', ''),
('Helimary', 50.00, 65.00, 'Vila Nova, 202', ''),
('Hellen & Thiago', 50.00, 65.00, 'Vila Nova, 1001', 'Milena - 9154-0611'),
('Ivan', 50.00, 65.00, 'Victor Konder, 304', ''),
('Jonas', 45.00, 65.00, 'Esc. Agricola, 1096', ''),
('Julia', 50.00, 65.00, 'Centro, 1302', ''),
('Kenzo', 50.00, 65.00, 'Victor Konder, 1604', ''),
('Lisandra', 50.00, 65.00, 'Victor Konder', ''),
('Lucas Herkenhoff', 50.00, 65.00, 'Vila Nova, 1402', ''),
('Lucila & William', 50.00, 65.00, 'Garcia, Casa', ''),
('Mayara / César', 45.00, 65.00, 'Velha, 1303', ''),
('Paula', 45.00, 65.00, 'Vila Nova, 403', ''),
('Polyana', 45.00, 65.00, 'Alameda, 901', ''),
('Sheila', 50.00, 65.00, 'Água Verde, Casa', ''),
('Suzi', 45.00, 65.00, 'Fortaleza, 704', ''),
('Tânia', 45.00, 65.00, 'Fortaleza, 1076', ''),
('Thiago', 50.00, 65.00, 'Victor Konder, 1001', ''),
('Paulo Felski', 50.00, 65.00, 'Victor Konder', ''),
('Rafaela / João Schmitt', 50.00, 65.00, 'Vila Nova, 903', ''),
('Adriana Bollmann', 50.00, 65.00, 'Fortaleza', ''),
('Lucas / Ali', 70.00, 65.00, 'Victor Konder, 603', ''),
('Aline', 50.00, 65.00, 'Centro, 401', ''),
('Lais Zambon', 50.00, 65.00, 'Velha, 402', ''),
('Ari Greco', 50.00, 65.00, 'Itoupava Seca, 502', ''),
('Bruno', 50.00, 65.00, 'Vila Nova, 202', '');

-- Verificar se todos os clientes foram inseridos
SELECT COUNT(*) as total_clientes FROM clients;

-- Listar todos os clientes inseridos
SELECT 
    nome,
    valor_diaria,
    valor_duas_visitas,
    endereco_completo,
    veterinario_confianca,
    created_at
FROM clients 
ORDER BY nome;
