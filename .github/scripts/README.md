# 📧 Sistema de Lembrete Diário de Visitas

Este sistema envia automaticamente um email todos os dias às **6h da manhã (horário de São Paulo)** com o resumo de todas as visitas agendadas para o dia.

## 🎯 O que o email contém:

- **Resumo do dia**: Total de visitas, receita esperada, quantidade de visitas inteiras/meia
- **Lista detalhada** de todas as visitas com:
  - Horário
  - Nome do cliente
  - Endereço completo
  - Telefone (se cadastrado)
  - Tipo de visita (Inteira/Meia)
  - Status (Agendada/Realizada)
  - Valor a receber

## 🛠️ Configuração (Passo a Passo)

### 1️⃣ Criar App Password do Gmail

Para que o GitHub Actions possa enviar emails pelo Gmail, você precisa criar uma senha de aplicativo:

1. Acesse: https://myaccount.google.com/security
2. Ative a **Verificação em duas etapas** (se ainda não tiver)
3. Vá em **Senhas de app**: https://myaccount.google.com/apppasswords
4. Selecione:
   - **Aplicativo**: Outro (nome personalizado)
   - **Nome**: "Fefelina Admin GitHub Actions"
5. Clique em **Gerar**
6. **COPIE A SENHA** gerada (16 caracteres sem espaços)

### 2️⃣ Configurar Secrets no GitHub

Acesse o repositório no GitHub e configure as seguintes secrets:

**Caminho:** `Settings` → `Secrets and variables` → `Actions` → `New repository secret`

Crie as seguintes secrets:

| Nome | Valor | Descrição |
|------|-------|-----------|
| `SUPABASE_URL` | `https://seu-projeto.supabase.co` | URL do seu projeto Supabase |
| `SUPABASE_KEY` | `sua-chave-anon` | Chave anônima do Supabase |
| `EMAIL_USER` | `seu-email@gmail.com` | Email do remetente (Gmail) |
| `EMAIL_PASS` | `xxxx xxxx xxxx xxxx` | App Password criada no passo 1 |
| `RECIPIENT_EMAILS` | `thiago.hass@gmail.com,fernandawartha22@gmail.com` | Emails dos destinatários (separados por vírgula) |

### 3️⃣ Como encontrar as credenciais do Supabase:

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** → **API**
4. Copie:
   - **URL**: `Project URL`
   - **Key**: `anon/public key`

### 4️⃣ Testar o Sistema

#### Testar manualmente no GitHub:

1. Vá em **Actions** no seu repositório
2. Selecione o workflow **"Daily Visits Reminder"**
3. Clique em **"Run workflow"** → **"Run workflow"**
4. Aguarde a execução (leva cerca de 30 segundos)
5. Verifique seu email!

#### Testar localmente (opcional):

```bash
# Instalar dependências
cd .github/scripts
npm install

# Configurar variáveis de ambiente
# Windows (PowerShell):
$env:SUPABASE_URL="https://seu-projeto.supabase.co"
$env:SUPABASE_KEY="sua-chave"
$env:EMAIL_USER="seu-email@gmail.com"
$env:EMAIL_PASS="sua-app-password"
$env:RECIPIENT_EMAILS="thiago.hass@gmail.com,fernandawartha22@gmail.com"

# Executar
node send-daily-reminder.js
```

## ⏰ Horário de Execução

- **Automático**: Todo dia às **6h da manhã** (horário de São Paulo)
- **Manual**: Pode executar a qualquer momento pelo GitHub Actions

**Observação sobre horário:**
- São Paulo = UTC-3
- 6h São Paulo = 9h UTC
- O cron está configurado para `0 9 * * *` (9h UTC)

## 📊 Exemplo de Email

O email será enviado em **HTML formatado** com:

- ✅ Header roxo com logo da Fefelina
- ✅ Cards de resumo (total, receita, tipos)
- ✅ Tabela organizada com todas as visitas
- ✅ Cores e ícones para facilitar leitura
- ✅ Responsivo (funciona bem no celular)

Se o cliente de email não suportar HTML, será enviada uma **versão em texto puro** bem formatada.

## 🔒 Segurança

- ✅ Todas as credenciais ficam em **Secrets** (criptografadas)
- ✅ Nunca aparecem no código ou logs
- ✅ GitHub Actions roda em ambiente isolado
- ✅ App Password pode ser revogada a qualquer momento

## 💰 Custo

**100% GRATUITO!**

- ✅ GitHub Actions: 2.000 minutos/mês grátis (você usará ~1 minuto/dia)
- ✅ Gmail: 500 emails/dia grátis (você enviará 1/dia)
- ✅ Supabase: Plano gratuito

## 🐛 Troubleshooting

### Email não está sendo enviado:

1. Verifique se as secrets estão corretas
2. Confira se a App Password foi criada corretamente
3. Veja os logs do GitHub Actions para mensagens de erro
4. Certifique-se de que há visitas agendadas para o dia

### Email vai para spam:

1. Adicione o email remetente aos seus contatos
2. Marque o primeiro email como "Não é spam"
3. Crie uma regra no Gmail para sempre mover para caixa de entrada

### Horário errado:

O workflow está configurado para UTC (9h = 6h São Paulo). Se precisar ajustar:
- Edite `.github/workflows/daily-reminder.yml`
- Linha do cron: `'0 9 * * *'`
- Calcule: Horário desejado em SP + 3 horas

## 📝 Logs e Monitoramento

Para ver os logs de execução:

1. Vá em **Actions** no GitHub
2. Clique em **Daily Visits Reminder**
3. Selecione uma execução
4. Veja os detalhes no job **send-reminder**

## 🎨 Personalização

Você pode personalizar:

- **Horário**: Edite o cron em `.github/workflows/daily-reminder.yml`
- **Destinatários**: Atualize a secret `RECIPIENT_EMAILS`
- **Visual do email**: Edite a função `generateEmailHTML()` em `send-daily-reminder.js`
- **Conteúdo**: Modifique as queries e formatação no script

## 📧 Suporte

Se tiver problemas, verifique:
1. Logs do GitHub Actions
2. Configuração das secrets
3. Válidade da App Password do Gmail

---

**Desenvolvido para Fefelina Cat Sitter 🐱**
