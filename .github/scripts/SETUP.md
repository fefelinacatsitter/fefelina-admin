# 🚀 Guia Rápido de Configuração - 5 Minutos

## ✅ Checklist de Configuração

### 1. Criar App Password do Gmail (2 minutos)

```
1. Acesse: https://myaccount.google.com/apppasswords
2. Ative verificação em 2 etapas (se necessário)
3. Crie senha de app chamada "Fefelina GitHub"
4. COPIE a senha de 16 caracteres
```

**⚠️ IMPORTANTE:** Guarde essa senha, você não conseguirá vê-la novamente!

---

### 2. Pegar credenciais do Supabase (1 minuto)

```
1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto "fefelina-admin"
3. Settings → API
4. Copie:
   - Project URL: https://xxxxxxxx.supabase.co
   - anon/public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### 3. Configurar Secrets no GitHub (2 minutos)

```
1. Vá em: https://github.com/fefelinacatsitter/fefelina-admin/settings/secrets/actions
2. Clique em "New repository secret" para CADA uma:
```

| # | Nome | Onde pegar o valor |
|---|------|-------------------|
| 1 | `SUPABASE_URL` | Supabase → Settings → API → Project URL |
| 2 | `SUPABASE_SERVICE_KEY` | Supabase → Settings → API → **service_role key** ⚠️ |
| 3 | `EMAIL_USER` | Seu email do Gmail (ex: seuemail@gmail.com) |
| 4 | `EMAIL_PASS` | App Password criada no passo 1 (16 caracteres) |
| 5 | `RECIPIENT_EMAILS` | `thiago.hass@gmail.com,fernandawartha22@gmail.com` |

**⚠️ IMPORTANTE Secret #2:** 
- Use a **service_role key** (NÃO a anon/public key)
- Ela está na seção "Project API keys" com o ícone de 🔑
- É uma chave longa que começa com `eyJ...`
- Esta chave bypassa RLS e permite acesso completo (seguro no GitHub Secrets)

**⚠️ ATENÇÃO:** 
- Não coloque espaços nos valores
- Em `RECIPIENT_EMAILS` separe os emails com vírgula SEM ESPAÇO

---

### 4. Fazer o primeiro commit (1 minuto)

```bash
git add .
git commit -m "feat: adicionar sistema de lembrete diário de visitas"
git push
```

---

### 5. Testar! (30 segundos)

```
1. Vá em: https://github.com/fefelinacatsitter/fefelina-admin/actions
2. Clique em "Daily Visits Reminder"
3. Clique em "Run workflow" → "Run workflow"
4. Aguarde ~30 segundos
5. Confira seu email! 📧
```

---

## 🎯 Resultado Esperado

Você receberá um email **BONITO** com:

```
┌─────────────────────────────────────────┐
│   🐱 FEFELINA CAT SITTER                │
│   Lembrete de Visitas                   │
├─────────────────────────────────────────┤
│   📅 Quarta-feira, 20 de novembro...    │
│                                          │
│   [3] Total    [R$ 150] Receita         │
│   [2] Inteiras [1] Meia                 │
├─────────────────────────────────────────┤
│   📋 VISITAS AGENDADAS                  │
│                                          │
│   08:00 - Maria Silva                   │
│   Rua das Flores, 123                   │
│   Visita Inteira • R$ 50,00             │
│                                          │
│   14:00 - João Santos                   │
│   Av. Paulista, 456                     │
│   Meia Visita • R$ 25,00                │
│   ...                                    │
└─────────────────────────────────────────┘
```

---

## ❓ FAQ Rápido

**P: O email vai sair TODO DIA às 6h?**
R: Sim, automaticamente! Mas SOMENTE se tiver visitas agendadas.

**P: Posso testar antes das 6h?**
R: Sim! Use o botão "Run workflow" no GitHub Actions.

**P: E se não tiver visitas no dia?**
R: O sistema detecta e NÃO envia email (economiza seu limite).

**P: Posso mudar os destinatários depois?**
R: Sim! Basta editar a secret `RECIPIENT_EMAILS` no GitHub.

**P: É realmente gratuito?**
R: SIM! 100% gratuito para sempre.

---

## 🆘 Problemas Comuns

### Email não chegou:

1. ✅ Verifique se tem visitas agendadas para hoje
2. ✅ Veja os logs no GitHub Actions
3. ✅ Confira se as secrets estão corretas
4. ✅ Olhe na caixa de spam

### Erro "Authentication failed":

- ❌ Email ou senha errados
- ✅ Use App Password (NÃO a senha normal do Gmail)
- ✅ Certifique-se que não tem espaços na senha

### Erro "Invalid Supabase credentials":

- ❌ URL ou Key errados
- ✅ Copie novamente do Supabase
- ✅ Não coloque aspas nos valores das secrets

---

## 📞 Próximos Passos

Depois que funcionar, você pode:

1. ✨ Personalizar as cores do email
2. 📊 Adicionar mais informações (observações, pets, etc)
3. ⏰ Criar lembretes para outros horários
4. 📱 Integrar com WhatsApp (futuramente)

---

**🎉 Pronto! Agora você tem um assistente automático que te lembra das visitas todo dia!**
