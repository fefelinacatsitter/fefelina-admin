# 🤝 Guia de Contribuição - Fefelina Admin

Obrigado por considerar contribuir para o **Fefelina Admin**! Este guia explica como você pode ajudar a melhorar o projeto.

## 📋 Como Contribuir

### 1. **Reportar Bugs**
- Verifique se o bug já foi reportado nos [Issues](https://github.com/seu-usuario/fefelina-admin/issues)
- Use o template de bug report
- Inclua informações detalhadas sobre o ambiente e passos para reproduzir

### 2. **Sugerir Funcionalidades**
- Abra uma issue com o label "enhancement"
- Descreva claramente a funcionalidade desejada
- Explique como ela beneficiaria o projeto

### 3. **Contribuir com Código**

#### **Processo de Desenvolvimento**
1. **Fork** o repositório
2. **Clone** seu fork localmente
3. **Crie** uma branch para sua feature: `git checkout -b feature/nome-da-feature`
4. **Desenvolva** seguindo os padrões do projeto
5. **Teste** suas mudanças localmente
6. **Commit** suas mudanças: `git commit -m 'feat: adiciona nova funcionalidade'`
7. **Push** para seu fork: `git push origin feature/nome-da-feature`
8. **Abra** um Pull Request

## 🏗️ Configuração do Ambiente

### **Pré-requisitos**
- Node.js 18+
- npm ou yarn
- Conta no Supabase (para desenvolvimento)

### **Setup Local**
```bash
# 1. Clone seu fork
git clone https://github.com/seu-usuario/fefelina-admin.git
cd fefelina-admin

# 2. Instale dependências
npm install

# 3. Configure ambiente
cp .env.example .env
# Edite .env com suas credenciais Supabase

# 4. Execute o projeto
npm run dev
```

## 📝 Padrões de Código

### **Convenções de Nomenclatura**
- **Arquivos**: PascalCase para componentes React (`ClientsPage.tsx`)
- **Variáveis**: camelCase (`clientData`, `fetchClients`)
- **Constantes**: UPPER_SNAKE_CASE (`API_BASE_URL`)
- **CSS Classes**: kebab-case com prefixos (`btn-fefelina`, `card-fefelina`)

### **Estrutura de Componentes**
```tsx
// Imports
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Interfaces/Types
interface Props {
  // definições
}

// Componente
export default function ComponentName({ props }: Props) {
  // Estados
  const [state, setState] = useState()
  
  // Efeitos
  useEffect(() => {
    // lógica
  }, [])
  
  // Funções
  const handleAction = () => {
    // implementação
  }
  
  // Render
  return (
    <div>
      {/* JSX */}
    </div>
  )
}
```

### **Convenções de Commit**
Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - Nova funcionalidade
- `fix:` - Correção de bug
- `docs:` - Documentação
- `style:` - Formatação (sem mudança de código)
- `refactor:` - Refatoração
- `test:` - Testes
- `chore:` - Manutenção

**Exemplos:**
```bash
feat: adiciona busca em tempo real para clientes
fix: corrige cálculo de valores em serviços
docs: atualiza README com novas instruções
```

## 🧪 Testes

### **Antes de Submeter**
- [ ] Código compila sem erros: `npm run build`
- [ ] Aplicação funciona corretamente: `npm run dev`
- [ ] Não há warnings do TypeScript
- [ ] Interface responsiva (teste mobile/desktop)
- [ ] Funcionalidade testada manualmente

### **Checklist de Pull Request**
- [ ] Branch atualizada com `main`
- [ ] Commits seguem convenção
- [ ] Descrição clara do que foi alterado
- [ ] Screenshots se houver mudanças visuais
- [ ] Funcionalidade testada

## 🎨 Design System

### **Cores (Tailwind)**
```css
/* Primárias */
primary-500: #3B82F6    /* Azul principal */
primary-600: #2563EB    /* Azul hover */

/* Secundárias */
secondary-500: #6B7280  /* Cinza médio */
secondary-700: #374151  /* Cinza escuro */

/* Status */
green-500: #10B981      /* Sucesso */
yellow-500: #F59E0B     /* Alerta */
red-500: #EF4444        /* Erro */
```

### **Componentes Padrão**
```css
/* Botões */
.btn-fefelina          /* Botão primário */
.btn-fefelina-secondary /* Botão secundário */

/* Cards */
.card-fefelina         /* Card padrão */

/* Formulários */
.input-fefelina        /* Input padrão */
```

## 🗂️ Estrutura de Arquivos

### **Organização**
```
src/
├── components/        # Componentes reutilizáveis
├── lib/              # Configurações e utilitários
├── pages/            # Páginas da aplicação
├── types/            # Definições TypeScript
└── utils/            # Funções utilitárias
```

### **Nomenclatura de Arquivos**
- **Componentes**: `ComponentName.tsx`
- **Páginas**: `PageName.tsx`
- **Utilitários**: `utilityName.ts`
- **Tipos**: `types.ts` ou `ComponentName.types.ts`

## 🔍 Code Review

### **Critérios de Aprovação**
- Código limpo e bem documentado
- Segue padrões estabelecidos
- Funcionalidade testada
- Não quebra funcionalidades existentes
- Performance adequada

### **Dicas para Code Review**
- **Seja respeitoso** nos comentários
- **Explique o porquê** das sugestões
- **Aprove** quando estiver satisfeito
- **Teste** a funcionalidade localmente se possível

## 🚀 Deploy e Publicação

### **GitHub Pages**
O deploy é automático via GitHub Actions quando há push na branch `main`.

### **Variáveis de Ambiente no GitHub**
Configure secrets no repositório:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 📞 Contato

### **Dúvidas sobre Contribuição**
- Abra uma [issue](https://github.com/seu-usuario/fefelina-admin/issues) com label "question"
- Use as [discussions](https://github.com/seu-usuario/fefelina-admin/discussions) para conversas

### **Reconhecimento**
Todos os contribuidores serão listados no README e releases do projeto.

---

## 🙏 Obrigado!

Sua contribuição é muito valiosa para tornar o **Fefelina Admin** ainda melhor!

Seja reportando bugs, sugerindo funcionalidades ou contribuindo com código, toda ajuda é bem-vinda e faz a diferença.

**Vamos juntos construir a melhor ferramenta de gestão para pet sitters!** 🐱✨
