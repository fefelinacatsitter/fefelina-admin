# 🐱 Fefelina Admin - Sistema de Gestão Completo

**Sistema administrativo profissional para Fefelina Catsitter** - Uma solução moderna e completa para gerenciar clientes, pets, serviços, visitas e finanças com interface intuitiva e funcionalidades avançadas.

![Status](https://img.shields.io/badge/Status-Produção-brightgreen)
![Versão](https://img.shields.io/badge/Versão-1.0.0-blue)
![React](https://img.shields.io/badge/React-18.2.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0.2-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.3.0-blue)

## ✨ Funcionalidades Principais

### 📊 **Dashboard Financeiro**
- Gráficos interativos de receitas e pagamentos
- Cards de resumo com métricas em tempo real
- Filtros avançados por período, status e cliente
- Exportação de relatórios financeiros

### � **Gestão de Clientes**
- CRUD completo com validações
- Busca em tempo real por nome
- Ordenação por serviços recentes ou alfabética
- Exclusão em cascata com confirmação

### 🐾 **Controle de Pets**
- Registro detalhado de pets por cliente
- Características e observações
- Vinculação automática com serviços

### 📋 **Serviços e Contratos**
- Criação de serviços com múltiplas visitas
- Cálculos automáticos de valores
- Controle de status (pendente → pago)
- Gestão de descontos de plataforma

### 📅 **Gestão de Visitas**
- Agendamento de visitas (inteira/meia)
- Status de execução e pagamento
- Observações e anotações
- Histórico completo

### 🎨 **Interface Moderna**
- Design responsivo e profissional
- Notificações toast em tempo real
- Controle de loading states
- UX otimizada para produtividade

## 🚀 Tecnologias e Arquitetura

### **Frontend**
- **React 18** - Framework principal
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização moderna
- **Vite** - Build tool otimizado
- **React Router** - Navegação SPA

### **Backend & Database**
- **Supabase** - Backend-as-a-Service
- **PostgreSQL** - Banco de dados relacional
- **Row Level Security** - Segurança de dados
- **Real-time subscriptions** - Atualizações em tempo real

### **Libraries Especializadas**
- **React Hot Toast** - Notificações elegantes
- **Recharts** - Gráficos interativos
- **Date-fns** - Manipulação de datas
- **Lucide React** - Ícones modernos

## 🛠️ Configuração e Instalação

### **1. Clone o Repositório**
```bash
git clone https://github.com/seu-usuario/fefelina-admin.git
cd fefelina-admin
```

### **2. Instale as Dependências**
```bash
npm install
```

### **3. Configuração do Supabase**

1. Crie uma conta em [Supabase](https://supabase.com)
2. Crie um novo projeto
3. Copie `.env.example` para `.env`:
```bash
cp .env.example .env
```

4. Configure as variáveis de ambiente:
```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
```

5. Execute o setup do banco de dados:
```sql
-- No SQL Editor do Supabase, execute:
-- 1. database-setup.sql (estrutura das tabelas)
-- 2. inserir-clientes.sql (dados de exemplo)
```

### **4. Execute o Projeto**
```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview da build
npm run preview
```

## 🌐 Deploy no GitHub Pages

### **Configuração Rápida**
```bash
# 1. Verificar se está pronto para deploy
npm run check-deploy

# 2. Fazer primeiro commit
git add .
git commit -m "feat: configuração inicial do projeto"
git push origin main
```

### **Configurar Secrets no GitHub**
1. Vá em `Settings` → `Secrets and variables` → `Actions`
2. Adicione:
   - `VITE_SUPABASE_URL`: URL do projeto Supabase
   - `VITE_SUPABASE_ANON_KEY`: Chave anônima do Supabase

### **Ativar GitHub Pages**
1. Vá em `Settings` → `Pages`
2. Source: `Deploy from a branch`
3. Branch: `gh-pages`
4. Folder: `/ (root)`

### **Acesso à Aplicação**
```
https://seu-usuario.github.io/fefelina-admin/
```

### **Deploy Manual (Alternativo)**
```bash
npm run deploy
```

📋 **Guia Completo:** Consulte [DEPLOY-GITHUB-PAGES.md](./DEPLOY-GITHUB-PAGES.md) para instruções detalhadas.

## 🔧 Scripts Disponíveis

```bash
npm run dev           # Servidor de desenvolvimento
npm run build         # Build para produção
npm run preview       # Preview da build
npm run lint          # Verificação de tipos TypeScript
npm run check         # Lint + Build (verificação completa)
npm run check-deploy  # Verificar se está pronto para deploy
npm run deploy        # Deploy manual para GitHub Pages
npm start            # Alias para npm run dev
```

## 📁 Estrutura do Projeto

```
fefelina-admin/
├── src/
│   ├── components/          # Componentes reutilizáveis
│   │   └── Layout.tsx       # Layout principal
│   ├── lib/                 # Configurações e utilitários
│   │   └── supabase.ts      # Cliente Supabase
│   ├── pages/               # Páginas da aplicação
│   │   ├── Dashboard.tsx    # Dashboard principal
│   │   ├── ClientsPage.tsx  # Gestão de clientes
│   │   ├── PetsPage.tsx     # Gestão de pets
│   │   ├── ServicesPage.tsx # Gestão de serviços
│   │   ├── VisitsPage.tsx   # Gestão de visitas
│   │   ├── FinancesPage.tsx # Módulo financeiro
│   │   └── LoginPage.tsx    # Autenticação
│   ├── App.tsx              # Componente raiz
│   ├── main.tsx             # Entry point
│   └── index.css            # Estilos globais
├── database-setup.sql       # Script de criação do banco
├── inserir-clientes.sql     # Dados de exemplo
├── package.json             # Dependências
├── vite.config.ts           # Configuração Vite
└── tailwind.config.js       # Configuração Tailwind
```

## 🗄️ Schema do Banco de Dados

### **Tabelas Principais**
- **clients** - Dados dos clientes
- **pets** - Pets dos clientes
- **services** - Serviços/contratos
- **visits** - Visitas individuais

### **Relacionamentos**
```sql
clients (1) → (N) pets
clients (1) → (N) services
services (1) → (N) visits
```

## 🔧 Scripts Disponíveis

- `npm run dev` - Servidor de desenvolvimento
- `npm run build` - Build para produção
- `npm run preview` - Preview da build
- `npm run deploy` - Deploy para GitHub Pages

## 📊 Funcionalidades Detalhadas

### **Dashboard Financeiro**
- Métricas em tempo real
- Gráficos de receitas mensais
- Filtros por período e status
- Exportação de relatórios

### **Gestão de Clientes**
- Busca instantânea por nome
- Ordenação por atividade recente
- Formulários validados
- Exclusão com confirmação

### **Controle de Serviços**
- Cálculo automático de valores
- Gestão de múltiplas visitas
- Status de pagamento
- Histórico completo

## 🎨 Design System

### **Cores Principais**
- **Primary**: Tons de azul (#3B82F6)
- **Secondary**: Tons de cinza (#6B7280)
- **Success**: Verde (#10B981)
- **Warning**: Amarelo (#F59E0B)
- **Error**: Vermelho (#EF4444)

### **Componentes**
- Cards com sombras elegantes
- Botões com estados hover/active
- Formulários com validação visual
- Modais responsivos
- Tabelas estilizadas

## 🔒 Segurança

- **Row Level Security** no Supabase
- **Autenticação JWT** automática
- **Validação de dados** no frontend e backend
- **Sanitização** de inputs do usuário

## 📱 Responsividade

- **Mobile First** approach
- **Breakpoints** bem definidos
- **Layout flexível** com CSS Grid/Flexbox
- **Componentes adaptáveis** a qualquer tela

## 🚀 Performance

- **Code splitting** automático
- **Bundle otimizado** com Vite
- **Lazy loading** de componentes
- **Caching** inteligente

## 📈 Métricas do Projeto

- **31 clientes** de exemplo incluídos
- **5 módulos** principais implementados
- **100% responsivo** em todas as telas
- **TypeScript coverage** completo

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Commit suas mudanças: `git commit -m 'feat: adiciona nova funcionalidade'`
4. Push para a branch: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👨‍💻 Desenvolvido por

**GitHub Copilot** em colaboração com o desenvolvedor

---

### 🎯 Status do Projeto: ✅ COMPLETO E PRONTO PARA PRODUÇÃO

Este sistema está completamente funcional e pronto para uso em ambiente de produção, oferecendo uma solução completa para gestão de pet sitting com interface moderna e funcionalidades profissionais.

Feito com ❤️ para **Fefelina Catsitter**
