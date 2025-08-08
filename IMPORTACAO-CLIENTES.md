# Script de Importação de Clientes - Fefelina Admin

## Dados Organizados para Inserção

Total de **31 clientes** para inserir na base de dados.

### Instruções de Execução

#### **Opção 1: Via SQL Editor do Supabase**
1. Acesse o painel do Supabase
2. Vá para SQL Editor
3. Execute o arquivo `inserir-clientes.sql`

#### **Opção 2: Via Interface do Sistema**
1. Acesse o módulo de Clientes no Fefelina-Admin
2. Use o botão "Novo Cliente" para cada entrada
3. Preencha os dados conforme a tabela abaixo

## Dados dos Clientes Organizados

| Nome | Valor Visita | Valor 2 Períodos | Endereço Completo | Veterinário |
|------|--------------|------------------|-------------------|-------------|
| Amanda | R$ 50,00 | R$ 65,00 | Victor Konder, 304 | - |
| Ana Rebelato | R$ 50,00 | R$ 65,00 | Centro, 402 | - |
| Anderson (Handit) | R$ 50,00 | R$ 65,00 | Vila Nova | - |
| Beth | R$ 50,00 | R$ 65,00 | Esc. Agricola, Casa | - |
| Carolina | R$ 40,00 | R$ 65,00 | Velha Central | - |
| Débora | R$ 45,00 | R$ 65,00 | Vila Nova, 802 | - |
| Gisele | R$ 55,00 | R$ 65,00 | Esc. Agricola, Casa | - |
| Helimary | R$ 50,00 | R$ 65,00 | Vila Nova, 202 | - |
| Hellen & Thiago | R$ 50,00 | R$ 65,00 | Vila Nova, 1001 | Milena - 9154-0611 |
| Ivan | R$ 50,00 | R$ 65,00 | Victor Konder, 304 | - |
| Jonas | R$ 45,00 | R$ 65,00 | Esc. Agricola, 1096 | - |
| Julia | R$ 50,00 | R$ 65,00 | Centro, 1302 | - |
| Kenzo | R$ 50,00 | R$ 65,00 | Victor Konder, 1604 | - |
| Lisandra | R$ 50,00 | R$ 65,00 | Victor Konder | - |
| Lucas Herkenhoff | R$ 50,00 | R$ 65,00 | Vila Nova, 1402 | - |
| Lucila & William | R$ 50,00 | R$ 65,00 | Garcia, Casa | - |
| Mayara / César | R$ 45,00 | R$ 65,00 | Velha, 1303 | - |
| Paula | R$ 45,00 | R$ 65,00 | Vila Nova, 403 | - |
| Polyana | R$ 45,00 | R$ 65,00 | Alameda, 901 | - |
| Sheila | R$ 50,00 | R$ 65,00 | Água Verde, Casa | - |
| Suzi | R$ 45,00 | R$ 65,00 | Fortaleza, 704 | - |
| Tânia | R$ 45,00 | R$ 65,00 | Fortaleza, 1076 | - |
| Thiago | R$ 50,00 | R$ 65,00 | Victor Konder, 1001 | - |
| Paulo Felski | R$ 50,00 | R$ 65,00 | Victor Konder | - |
| Rafaela / João Schmitt | R$ 50,00 | R$ 65,00 | Vila Nova, 903 | - |
| Adriana Bollmann | R$ 50,00 | R$ 65,00 | Fortaleza | - |
| Lucas / Ali | R$ 70,00 | R$ 65,00 | Victor Konder, 603 | - |
| Aline | R$ 50,00 | R$ 65,00 | Centro, 401 | - |
| Lais Zambon | R$ 50,00 | R$ 65,00 | Velha, 402 | - |
| Ari Greco | R$ 50,00 | R$ 65,00 | Itoupava Seca, 502 | - |
| Bruno | R$ 50,00 | R$ 65,00 | Vila Nova, 202 | - |

## Análise dos Dados

### **Estatísticas dos Valores de Visita**
- **R$ 40,00**: 1 cliente (Carolina)
- **R$ 45,00**: 8 clientes
- **R$ 50,00**: 21 clientes (maioria)
- **R$ 55,00**: 1 cliente (Gisele)
- **R$ 70,00**: 1 cliente (Lucas/Ali)

### **Valor Padrão 2 Períodos**
- Todos os clientes: **R$ 65,00**

### **Veterinários de Confiança**
- Apenas 1 cliente tem veterinário específico: **Hellen & Thiago** (Milena - 9154-0611)

### **Distribuição por Bairros**
- **Vila Nova**: 8 clientes
- **Victor Konder**: 7 clientes
- **Centro**: 3 clientes
- **Esc. Agricola**: 3 clientes
- **Fortaleza**: 3 clientes
- **Velha/Velha Central**: 3 clientes
- **Outros**: 4 clientes

## Verificação Pós-Inserção

Após executar o script, verifique:
1. Total de 31 clientes inseridos
2. Valores corretos de visita e período
3. Endereços completos preenchidos
4. Campo veterinário preenchido apenas para Hellen & Thiago

## Script SQL Pronto

O arquivo `inserir-clientes.sql` contém todos os comandos INSERT prontos para execução.
