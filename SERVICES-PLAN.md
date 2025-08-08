# Plano de Implementação - Sistema de Serviços e Visitas

## 🎯 **Estrutura Planejada**

### **Serviço como Agrupador de Visitas**
- Um **Serviço** é um contrato/período de trabalho para um cliente
- Cada **Visita** pertence a um serviço específico
- O valor total do serviço é calculado automaticamente pela soma das visitas

### **Fluxo de Cadastro Integrado (igual Clientes + Pets)**
1. **Criar Serviço** → Escolher cliente, definir período
2. **Adicionar Visitas** → Cadastrar múltiplas visitas dentro do serviço
3. **Cálculos automáticos** → Total de visitas, valor total, valor a receber

## 📊 **Schema do Banco de Dados**

### **Alterações Necessárias na Tabela `services`:**
```sql
-- Manter campos existentes + adicionar novos
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS nome_servico TEXT, -- Nome/descrição do serviço
ADD COLUMN IF NOT EXISTS desconto_plataforma_default DECIMAL(5,2) DEFAULT 0; -- Desconto padrão para o serviço
```

### **Alterações Necessárias na Tabela `visits`:**
```sql
-- Adicionar novos campos para as visitas
ALTER TABLE visits 
ADD COLUMN IF NOT EXISTS tipo_visita TEXT CHECK (tipo_visita IN ('inteira', 'meia')) NOT NULL DEFAULT 'inteira',
ADD COLUMN IF NOT EXISTS status_pagamento TEXT CHECK (status_pagamento IN ('pendente_plataforma', 'pendente', 'pago')) DEFAULT 'pendente_plataforma',
ADD COLUMN IF NOT EXISTS desconto_plataforma DECIMAL(5,2) DEFAULT 0;

-- Remover campo client_id da visits (redundante, já tem via service_id)
-- ALTER TABLE visits DROP COLUMN IF EXISTS client_id; -- Opcional, pode manter para facilitar consultas
```

## 🏗️ **Estrutura das Interfaces TypeScript**

### **Interface Service**
```typescript
interface Service {
  id: string
  client_id: string
  nome_servico?: string
  data_inicio: string
  data_fim: string
  status: 'pendente' | 'em_andamento' | 'concluido' | 'pago'
  desconto_plataforma_default: number
  total_visitas: number        // Calculado automaticamente
  total_valor: number          // Soma de todas as visitas
  total_a_receber: number      // Total - desconto plataforma
  created_at: string
  clients?: {
    nome: string
    valor_diaria: number
    valor_duas_visitas: number
  }
  visits?: Visit[]             // Visitas do serviço
}
```

### **Interface Visit**
```typescript
interface Visit {
  id: string
  service_id: string
  data: string                 // Data da visita (YYYY-MM-DD)
  horario: string              // Hora da visita (HH:MM)
  tipo_visita: 'inteira' | 'meia'
  valor: number                // Calculado automaticamente baseado no tipo
  status: 'agendada' | 'realizada' | 'cancelada'
  status_pagamento: 'pendente_plataforma' | 'pendente' | 'pago'
  desconto_plataforma: number
  observacoes?: string
  created_at: string
}
```

## 💼 **Funcionalidades da Página de Serviços**

### **1. Listagem de Serviços**
```typescript
// Card de serviço mostrando:
- Nome do serviço
- Cliente
- Período (data_inicio → data_fim)
- Status do serviço
- Total de visitas
- Valor total
- Valor a receber
- Botões: Editar, Excluir, Ver Detalhes
```

### **2. Modal de Cadastro/Edição de Serviço**
```typescript
// Formulário principal:
- Nome do Serviço
- Cliente (dropdown)
- Data Início
- Data Fim
- Status
- Desconto Plataforma Padrão (%)

// Seção de Visitas (dinâmica, igual pets):
- Lista de visitas do serviço
- Botão "Adicionar Visita"
- Cada visita: Tipo, Data, Hora, Observações
- Valores calculados automaticamente
- Totais no final: Qtd visitas, Valor total, A receber
```

### **3. Cálculos Automáticos**
```typescript
// Valor da visita baseado no tipo:
const calcularValorVisita = (tipo: 'inteira' | 'meia', cliente: Client) => {
  if (tipo === 'inteira') {
    return cliente.valor_diaria
  } else {
    return cliente.valor_duas_visitas / 2 // Metade do valor de 2 visitas
  }
}

// Total do serviço:
const calcularTotalServico = (visitas: Visit[]) => {
  return visitas.reduce((total, visita) => total + visita.valor, 0)
}

// Valor a receber (com desconto):
const calcularValorAReceber = (total: number, desconto: number) => {
  return total * (1 - desconto / 100)
}
```

## 🔄 **Fluxo de Uso**

### **Cadastrar Novo Serviço:**
1. Usuário clica "Novo Serviço"
2. Preenche dados básicos do serviço
3. Adiciona visitas uma por uma
4. Sistema calcula valores automaticamente
5. Salva serviço + todas as visitas

### **Editar Serviço Existente:**
1. Usuário clica "Editar" no card do serviço
2. Modal abre com dados preenchidos
3. Lista visitas existentes
4. Pode adicionar/editar/remover visitas
5. Totais recalculados em tempo real

## 📋 **Validações de Negócio**

### **Regras de Validação:**
```typescript
// Datas:
- data_fim >= data_inicio
- data_visita entre data_inicio e data_fim

// Valores:
- desconto_plataforma entre 0 e 100%
- valor_visita > 0

// Status:
- Só pode marcar como 'pago' se todas as visitas estão 'realizadas'
- Não pode excluir serviço com visitas 'realizadas'
```

## 🎨 **Interface Visual**

### **Cards de Serviço:**
```typescript
// Layout similar aos cards de pets:
- Header: Nome do serviço + status badge
- Info principal: Cliente, período
- Métricas: Visitas, valor total
- Footer: Botões de ação
- Hover effects com cores Fefelina
```

### **Modal de Serviço:**
```typescript
// Estrutura em seções:
1. Dados do Serviço (formulário principal)
2. Divisor visual
3. Seção de Visitas (lista + formulário dinâmico)
4. Resumo/Totais (card destacado)
5. Botões de ação
```

## 📦 **Arquivos a Criar/Editar**

### **Novos Arquivos:**
1. `src/pages/ServicesPage.tsx` - Página principal
2. `database-update-services.sql` - Script de atualização do banco

### **Arquivos a Editar:**
1. `database-setup.sql` - Adicionar as alterações no schema

## 🚀 **Cronograma de Implementação**

### **Fase 1: Banco de Dados**
1. ✅ Criar script de atualização do schema
2. ✅ Testar alterações no Supabase

### **Fase 2: Backend Logic**
1. ✅ Criar interfaces TypeScript
2. ✅ Implementar funções de cálculo

### **Fase 3: Interface**
1. ✅ Implementar listagem de serviços
2. ✅ Criar modal de cadastro/edição
3. ✅ Integrar cálculos automáticos

### **Fase 4: Testes**
1. ✅ Testar CRUD completo
2. ✅ Validar cálculos
3. ✅ Testar fluxos integrados

---

**Esta estrutura mantém a consistência com o sistema existente e oferece a funcionalidade completa que você precisa! Quer que eu comece implementando?** 🎯
