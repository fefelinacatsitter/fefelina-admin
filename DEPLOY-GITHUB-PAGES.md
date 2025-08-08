# 🚀 Guia de Deploy no GitHub Pages

Este guia explica como publicar o Fefelina Admin no GitHub Pages e configurá-lo para funcionar perfeitamente.

## 📋 Pré-requisitos

- Conta no GitHub
- Projeto Supabase configurado
- Node.js instalado localmente

## 🛠️ Configuração Inicial

### 1. Preparar o Repositório

```bash
# 1. Inicializar Git (se ainda não foi feito)
git init

# 2. Adicionar origin do GitHub
git remote add origin https://github.com/seu-usuario/fefelina-admin.git

# 3. Criar branch main (se estiver em master)
git branch -M main
```

### 2. Configurar Variáveis de Ambiente

**No GitHub (Secrets):**
1. Vá em `Settings` → `Secrets and variables` → `Actions`
2. Adicione os secrets:
   - `VITE_SUPABASE_URL`: URL do seu projeto Supabase
   - `VITE_SUPABASE_ANON_KEY`: Chave anônima do Supabase

**Localmente (.env):**
```bash
# Copie .env.example para .env
cp .env.example .env

# Configure com seus dados do Supabase
VITE_SUPABASE_URL=https://seuprojetoid.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_aqui
```

### 3. Configurar o Supabase

Execute no SQL Editor do Supabase:
```sql
-- 1. Execute database-setup.sql
-- 2. Configure as políticas RLS
-- 3. (Opcional) Execute inserir-clientes.sql para dados de exemplo
```

## 🚀 Deploy Automático

### Método 1: GitHub Actions (Recomendado)

O projeto já está configurado com GitHub Actions. O deploy acontece automaticamente:

1. **Push para main:**
```bash
git add .
git commit -m "feat: configuração inicial do projeto"
git push origin main
```

2. **Verificar Actions:**
   - Vá em `Actions` no seu repositório
   - Verifique se o workflow está executando
   - Aguarde conclusão (2-3 minutos)

3. **Ativar GitHub Pages:**
   - Vá em `Settings` → `Pages`
   - Source: `Deploy from a branch`
   - Branch: `gh-pages`
   - Folder: `/ (root)`

### Método 2: Deploy Manual

```bash
# 1. Build local
npm run build

# 2. Deploy manual
npm run deploy
```

## 🌐 Configuração de Domínio

### GitHub Pages URL
Seu site estará disponível em:
```
https://seu-usuario.github.io/fefelina-admin/
```

### Domínio Customizado (Opcional)
1. No repositório: `Settings` → `Pages` → `Custom domain`
2. Adicione: `seudominio.com`
3. Configure DNS do seu domínio:
   ```
   Type: CNAME
   Name: @
   Value: seu-usuario.github.io
   ```

## 🔧 Configuração Específica

### Vite Configuration
O arquivo `vite.config.ts` já está configurado:
```typescript
export default defineConfig({
  plugins: [react()],
  base: '/fefelina-admin/', // Nome do repositório
  build: {
    outDir: 'dist'
  }
})
```

### Roteamento SPA
- Arquivo `404.html` configurado para redirecionar rotas
- Script no `index.html` para suporte a deep linking
- Arquivo `.nojekyll` para desabilitar Jekyll

## ✅ Verificação Pós-Deploy

### 1. Teste Básico
- Acesse a URL do GitHub Pages
- Verifique se a página carrega
- Teste navegação entre páginas

### 2. Teste de Funcionalidades
- Login (se implementado)
- CRUD de clientes
- Dashboard e gráficos
- Responsividade

### 3. Verificar Console
- Abra DevTools (F12)
- Verifique se não há erros no console
- Confirme conexão com Supabase

## 🐛 Troubleshooting

### Build Falha
```bash
# Verificar localmente
npm run check
npm run build
```

### Páginas em Branco
- Verificar variáveis de ambiente nos GitHub Secrets
- Confirmar configuração do Supabase
- Verificar console do browser para erros

### 404 em Rotas
- Confirmar arquivo `404.html` no diretório `public`
- Verificar se `.nojekyll` existe
- Confirmar script no `index.html`

### Erro de CORS
- Configurar domínio no Supabase
- Adicionar GitHub Pages URL nas configurações

## 📚 Recursos Adicionais

- [GitHub Pages Docs](https://docs.github.com/pages)
- [Supabase Docs](https://supabase.com/docs)
- [Vite Deploy Guide](https://vitejs.dev/guide/static-deploy.html)

## 🔄 Workflow de Desenvolvimento

```bash
# 1. Desenvolvimento local
npm run dev

# 2. Verificar build
npm run check

# 3. Commit e push
git add .
git commit -m "feat: nova funcionalidade"
git push origin main

# 4. Deploy automático via GitHub Actions
```

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs do GitHub Actions
2. Confirme configuração do Supabase
3. Teste build local primeiro
4. Consulte documentação oficial
