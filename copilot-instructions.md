# Fefelina Admin - Instruções para o GitHub Copilot

Este é o sistema de gestão administrativo para **Fefelina Catsitter** - uma aplicação web moderna construída com React + TypeScript + Tailwind CSS + Supabase.

## 🎯 Objetivo do Projeto
Substituir o uso de Google Sheets por um sistema web completo para gerenciar:
- **Clientes**: cadastro com valores, endereços e veterinários
- **Pets**: vinculados aos clientes com características e observações
- **Serviços**: contratos/grupos de visitas com cálculos automáticos
- **Visitas**: agendamentos individuais com horários e status

## 🏗️ Arquitetura
- **Frontend**: React 18 + TypeScript + Tailwind CSS + Vite
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Roteamento**: React Router DOM
- **Deploy**: GitHub Pages / Vercel

## 📊 Estrutura de Dados

### Clients (Clientes)
```typescript
interface Client {
  id: string
  nome: string
  valor_diaria: number
  valor_duas_visitas: number
  endereco_completo: string
  veterinario_confianca: string
  created_at: string
  updated_at: string
}
```

### Pets
```typescript
interface Pet {
  id: string
  client_id: string  // FK para clients
  nome: string
  caracteristica: string
  observacoes: string
  created_at: string
  updated_at: string
}
```

### Services (Serviços)
```typescript
interface Service {
  id: string
  client_id: string  // FK para clients
  data_inicio: string
  data_fim: string
  status: 'pendente' | 'em_andamento' | 'concluido' | 'pago'
  desconto_plataforma: number
  total_visitas: number
  total_valor: number
  total_a_receber: number
  created_at: string
  updated_at: string
}
```

### Visits (Visitas)
```typescript
interface Visit {
  id: string
  service_id: string  // FK para services
  client_id: string   // FK para clients
  data: string
  horario: string
  valor: number
  status: 'agendada' | 'realizada' | 'cancelada'
  observacoes?: string
  created_at: string
  updated_at: string
}
```

## 🎨 Padrões de Design
- **Cores primárias**: Tons de vermelho/rosa (primary-*)
- **Layout**: Sidebar com navegação + área principal
- **Componentes**: Design system consistente com Tailwind
- **Responsivo**: Mobile-first approach

## 🔐 Autenticação
- Sistema restrito ao **administrador** apenas
- Login via Supabase Auth
- Sessão persistente

## ⚡ Funcionalidades Especiais
1. **Dashboard**: Visão geral com estatísticas
2. **CRUD completo**: Para todas as entidades
3. **Relacionamentos**: Pets vinculados a clientes, visitas vinculadas a serviços
4. **Cálculos automáticos**: Valores totais em serviços
5. **"Marcar todas como pagas"**: Funcionalidade para marcar todas as visitas de um serviço como pagas

## 📱 Páginas Principais
- `/` - Dashboard
- `/clients` - Gestão de clientes
- `/pets` - Gestão de pets
- `/services` - Gestão de serviços
- `/visits` - Gestão de visitas

## 🛠️ Padrões de Código
- **TypeScript**: Tipagem forte em tudo
- **React Hooks**: useState, useEffect, custom hooks
- **Componentes funcionais**: Sempre usar function components
- **Props tipadas**: Interfaces para todas as props
- **Error handling**: Try/catch em operações async
- **Loading states**: Indicadores de carregamento
