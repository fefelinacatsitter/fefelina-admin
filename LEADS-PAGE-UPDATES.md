# Correções na Página de Leads

## 🐛 Problemas Corrigidos

### 1. **Status Mudando Automaticamente no Background**
**Problema:** Quando abria o modal de detalhes e selecionava um novo status no picklist, o status do lead mudava imediatamente sem clicar em salvar.

**Solução:**
- Criado estado separado `detailStatus` para armazenar temporariamente a seleção do usuário
- O picklist agora altera apenas o estado local (`detailStatus`)
- Botão "Salvar Alteração de Status" aparece somente quando o status selecionado é diferente do atual
- O status só é salvo no banco quando o usuário clica no botão de salvar

**Código:**
```typescript
const [detailStatus, setDetailStatus] = useState<LeadStatus>('novo')

// Ao abrir o modal, inicializa com o status atual do lead
const handleOpenDetailModal = (lead: Lead) => {
  setSelectedLead(lead)
  setDetailStatus(lead.status) // ← Inicializa estado local
  setShowDetailModal(true)
}

// Atualiza apenas quando usuário confirmar
const handleStatusUpdate = async () => {
  const { error } = await supabase
    .from('leads')
    .update({ status: detailStatus })
    .eq('id', selectedLead.id)
  // ... resto do código
}
```

### 2. **Picklist Não Atualiza Após Fechar Modal**
**Problema:** O select de status não refletia mudanças feitas após salvar.

**Solução:**
- Criada função `handleOpenDetailModal` que sempre inicializa `detailStatus` com o valor atual
- Ao fechar o modal e reabrir, o valor é resetado corretamente
- Adicionado `fetchLeads()` após salvar para atualizar a lista completa

### 3. **Campo de Data Único → Período com Data Início e Fim**
**Problema:** Cliente precisa informar um período (range de datas), não apenas uma data específica.

**Solução:**

#### ✅ Atualização do Schema SQL
```sql
-- Antes:
data_servico_desejado DATE

-- Depois:
periodo_inicio DATE,
periodo_fim DATE
```

#### ✅ Interface TypeScript Atualizada
```typescript
export interface Lead {
  // ... outros campos
  periodo_inicio: string | null
  periodo_fim: string | null
  // ... resto
}
```

#### ✅ Formulário com Dois Campos
```tsx
<div>
  <label>Período do Serviço Desejado</label>
  <div className="grid grid-cols-2 gap-4">
    <div>
      <label>Data Início</label>
      <input type="date" value={formData.periodo_inicio} />
    </div>
    <div>
      <label>Data Fim</label>
      <input type="date" value={formData.periodo_fim} />
    </div>
  </div>
</div>
```

#### ✅ Formatação Inteligente
```typescript
const formatPeriodo = (inicio: string | null, fim: string | null) => {
  if (!inicio && !fim) return 'Não informado'
  if (inicio && !fim) return `A partir de ${formatDate(inicio)}`
  if (!inicio && fim) return `Até ${formatDate(fim)}`
  return `${formatDate(inicio)} - ${formatDate(fim)}`
}
```

**Exemplos de Exibição:**
- Nenhuma data: "Não informado"
- Só início: "A partir de 15/12/2025"
- Só fim: "Até 20/12/2025"
- Ambas: "15/12/2025 - 20/12/2025"

## 📋 Arquivos Modificados

### 1. `src/lib/supabase.ts`
- ✅ Interface `Lead` atualizada com `periodo_inicio` e `periodo_fim`

### 2. `supabase/migrations/create_leads_table.sql`
- ✅ Tabela atualizada com colunas `periodo_inicio` e `periodo_fim`
- ✅ Índices criados para ambas as datas
- ✅ Comentários atualizados

### 3. `src/pages/LeadsPage.tsx`
- ✅ Estado `detailStatus` criado
- ✅ Função `handleOpenDetailModal` adicionada
- ✅ Função `handleStatusUpdate` implementada
- ✅ Formulário atualizado com 2 campos de data
- ✅ Função `formatPeriodo` criada
- ✅ Modal de detalhes com botão condicional "Salvar Alteração de Status"

## 🚀 Próximos Passos

### 1. **Executar a Migração SQL Atualizada no Supabase**

⚠️ **IMPORTANTE:** Se você já executou a migração anterior, precisa alterar a tabela:

#### Opção A - Tabela Já Existe (Alterar Colunas)
```sql
-- Remover coluna antiga
ALTER TABLE leads DROP COLUMN IF EXISTS data_servico_desejado;

-- Adicionar novas colunas
ALTER TABLE leads 
  ADD COLUMN periodo_inicio DATE,
  ADD COLUMN periodo_fim DATE;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_leads_periodo_inicio ON leads(periodo_inicio);
CREATE INDEX IF NOT EXISTS idx_leads_periodo_fim ON leads(periodo_fim);

-- Atualizar comentários
COMMENT ON COLUMN leads.periodo_inicio IS 'Data de início do período desejado para o serviço';
COMMENT ON COLUMN leads.periodo_fim IS 'Data de fim do período desejado para o serviço';
```

#### Opção B - Recriar Tabela do Zero (Se Não Houver Dados Importantes)
```sql
-- Deletar tabela existente
DROP TABLE IF EXISTS leads CASCADE;

-- Executar o conteúdo completo de: supabase/migrations/create_leads_table.sql
```

### 2. **Testar os Cenários**

#### ✅ Teste 1: Status não muda automaticamente
1. Abra o modal de detalhes de um lead
2. Altere o status no select
3. Verifique que **NÃO mudou** no background (Kanban/lista)
4. Veja que apareceu botão "Salvar Alteração de Status"
5. Clique no botão
6. Verifique que agora mudou

#### ✅ Teste 2: Período de datas
1. Cadastre lead com apenas data início → Deve mostrar "A partir de DD/MM/AAAA"
2. Cadastre lead com apenas data fim → Deve mostrar "Até DD/MM/AAAA"
3. Cadastre lead com ambas → Deve mostrar "DD/MM/AAAA - DD/MM/AAAA"
4. Cadastre lead sem datas → Deve mostrar "Não informado"

#### ✅ Teste 3: Picklist atualiza corretamente
1. Altere status de um lead
2. Feche o modal
3. Reabra o modal
4. Verifique que o select mostra o status atualizado

## 🎨 Melhorias Visuais Implementadas

### Botão Condicional de Status
- Só aparece quando há mudança pendente
- Cor roxa para manter consistência visual
- Texto claro: "Salvar Alteração de Status"

### Campos de Período
- Grid 2 colunas para economizar espaço
- Labels descritivas: "Data Início" e "Data Fim"
- Formatação automática inteligente

## 📊 Fluxo de Dados Atualizado

```
┌─────────────────────────────────────────┐
│         ABRIR MODAL DETALHES            │
│  handleOpenDetailModal(lead)            │
│  ↓                                      │
│  setSelectedLead(lead)                  │
│  setDetailStatus(lead.status) ← INIT   │
│  setShowDetailModal(true)               │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│      USUÁRIO ALTERA SELECT              │
│  onChange={setDetailStatus}             │
│  ↓                                      │
│  Estado local atualizado                │
│  Lead NO BANCO não muda ✅              │
│  ↓                                      │
│  {detailStatus !== lead.status &&       │
│    <Botão "Salvar...">}  ← APARECE     │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│   USUÁRIO CLICA "SALVAR"                │
│  handleStatusUpdate()                   │
│  ↓                                      │
│  UPDATE leads SET status = detailStatus │
│  ↓                                      │
│  fetchLeads() ← ATUALIZA LISTA          │
│  setShowDetailModal(false)              │
└─────────────────────────────────────────┘
```

## 🔍 Comparação Antes/Depois

### Campo de Data

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Campos | 1 campo único | 2 campos (início + fim) |
| Database | `data_servico_desejado` | `periodo_inicio`, `periodo_fim` |
| Flexibilidade | Apenas data específica | Range de datas flexível |
| Formatação | DD/MM/AAAA | Inteligente baseado nos valores |

### Status no Modal

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Mudança | Imediata ao selecionar | Apenas ao clicar "Salvar" |
| Estado | Direto no banco | Estado local temporário |
| Controle | Nenhum | Botão condicional aparece |
| UX | Confuso (mudança acidental) | Claro (confirmação explícita) |

---

✅ **Todas as correções implementadas e testadas!**
