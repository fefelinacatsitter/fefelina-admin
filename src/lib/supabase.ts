import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tipos de dados
export interface Client {
  id: string
  nome: string
  valor_diaria: number
  valor_duas_visitas: number
  endereco_completo: string
  veterinario_confianca: string
  created_at: string
  updated_at: string
}

export interface Pet {
  id: string
  client_id: string
  nome: string
  caracteristica: string
  observacoes: string
  created_at: string
  updated_at: string
}

export interface Service {
  id: string
  client_id: string
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

export interface Visit {
  id: string
  service_id: string
  client_id: string
  data: string
  horario: string
  valor: number
  status: 'agendada' | 'realizada' | 'cancelada'
  tipo_visita: 'inteira' | 'meia'
  desconto_plataforma: number
  observacoes?: string
  created_at: string
  updated_at: string
}

export interface Lead {
  id: string
  nome: string
  telefone: string | null
  endereco: string | null
  periodo_inicio: string | null
  periodo_fim: string | null
  valor_orcamento: number | null
  status: 'novo' | 'em_contato' | 'negociacao' | 'aguardando_resposta' | 'fechado_ganho' | 'fechado_perdido'
  observacoes: string | null
  created_at: string
  updated_at: string
}

export interface CaixaMovimento {
  id: string
  data: string
  valor: number
  tipo: 'receitas_servicos' | 'receitas_outros' | 'despesas_servicos' | 'despesas_outros' | 'rendimentos' | 'pagamento_mensal'
  descricao?: string
  created_at: string
  updated_at: string
}
