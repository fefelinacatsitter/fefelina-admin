import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

// Configurações do Supabase
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// Configurações de Email
const emailUser = process.env.EMAIL_USER
const emailPass = process.env.EMAIL_PASS
const recipients = process.env.RECIPIENT_EMAILS.split(',')

// Configurar timezone de São Paulo
const SAO_PAULO_OFFSET = -3 // UTC-3

// Função para obter data de hoje em São Paulo
function getTodaySaoPaulo() {
  const now = new Date()
  const saoPauloTime = new Date(now.getTime() + (SAO_PAULO_OFFSET * 60 * 60 * 1000))
  const year = saoPauloTime.getUTCFullYear()
  const month = String(saoPauloTime.getUTCMonth() + 1).padStart(2, '0')
  const day = String(saoPauloTime.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Função para formatar horário
function formatTime(time) {
  return time.substring(0, 5)
}

// Função para formatar moeda
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

// Função para buscar visitas do dia
async function fetchTodayVisits() {
  const today = getTodaySaoPaulo()
  
  const { data, error } = await supabase
    .from('visits')
    .select(`
      *,
      clients (nome, endereco_completo, telefone),
      services (nome_servico)
    `)
    .eq('data', today)
    .in('status', ['agendada', 'realizada'])
    .order('horario', { ascending: true })

  if (error) {
    console.error('Erro ao buscar visitas:', error)
    throw error
  }

  return data || []
}

// Função para gerar HTML do email
function generateEmailHTML(visits, date) {
  const dateFormatted = new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const totalVisits = visits.length
  const totalReceita = visits.reduce((sum, v) => sum + (v.valor - v.desconto_plataforma), 0)
  const visitasInteiras = visits.filter(v => v.tipo_visita === 'inteira').length
  const visitasMeia = visits.filter(v => v.tipo_visita === 'meia').length

  const visitasHTML = visits.map((visit, index) => `
    <tr style="background-color: ${index % 2 === 0 ? '#f9fafb' : '#ffffff'};">
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
        <strong style="color: #7f50c6;">${formatTime(visit.horario)}</strong>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
        <strong>${visit.clients?.nome || 'Cliente não identificado'}</strong><br>
        <small style="color: #6b7280;">${visit.clients?.endereco_completo || 'Endereço não cadastrado'}</small>
        ${visit.clients?.telefone ? `<br><small style="color: #6b7280;">📞 ${visit.clients.telefone}</small>` : ''}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
        <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; ${
          visit.tipo_visita === 'inteira' 
            ? 'background-color: #dbeafe; color: #1e40af;' 
            : 'background-color: #fed7aa; color: #c2410c;'
        }">
          ${visit.tipo_visita === 'inteira' ? 'Inteira (1h)' : 'Meia (30min)'}
        </span>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
        <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; ${
          visit.status === 'agendada' 
            ? 'background-color: #dbeafe; color: #1e40af;' 
            : 'background-color: #d1fae5; color: #065f46;'
        }">
          ${visit.status === 'agendada' ? 'Agendada' : 'Realizada'}
        </span>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">
        <strong style="color: #059669;">${formatCurrency(visit.valor - visit.desconto_plataforma)}</strong>
      </td>
    </tr>
  `).join('')

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Lembrete de Visitas - ${dateFormatted}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 800px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #7f50c6 0%, #9d6fd4 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 700;">🐱 Fefelina Cat Sitter</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.95;">Lembrete de Visitas</p>
        </div>

        <!-- Data e Resumo -->
        <div style="background-color: white; padding: 24px; border-left: 4px solid #7f50c6;">
          <h2 style="margin: 0 0 8px 0; color: #111827; font-size: 22px; text-transform: capitalize;">
            📅 ${dateFormatted}
          </h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-top: 16px;">
            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; text-align: center;">
              <div style="font-size: 28px; font-weight: 700; color: #7f50c6;">${totalVisits}</div>
              <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">Total de Visitas</div>
            </div>
            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; text-align: center;">
              <div style="font-size: 28px; font-weight: 700; color: #059669;">${formatCurrency(totalReceita)}</div>
              <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">Receita do Dia</div>
            </div>
            <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; text-align: center;">
              <div style="font-size: 16px; font-weight: 600; color: #1e40af;">🟦 ${visitasInteiras} Inteiras</div>
              <div style="font-size: 16px; font-weight: 600; color: #c2410c; margin-top: 4px;">🟧 ${visitasMeia} Meia</div>
            </div>
          </div>
        </div>

        <!-- Lista de Visitas -->
        <div style="background-color: white; margin-top: 2px; padding: 24px;">
          <h3 style="margin: 0 0 16px 0; color: #111827; font-size: 18px; font-weight: 600;">📋 Visitas Agendadas</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f9fafb; border-bottom: 2px solid #e5e7eb;">
                <th style="padding: 12px; text-align: left; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Horário</th>
                <th style="padding: 12px; text-align: left; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Cliente</th>
                <th style="padding: 12px; text-align: center; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Tipo</th>
                <th style="padding: 12px; text-align: center; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Status</th>
                <th style="padding: 12px; text-align: right; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${visitasHTML}
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 0 0 12px 12px; text-align: center; color: #6b7280; font-size: 14px;">
          <p style="margin: 0;">Este é um lembrete automático enviado pelo sistema Fefelina Admin.</p>
          <p style="margin: 8px 0 0 0; font-size: 12px;">✨ Tenha um ótimo dia de trabalho!</p>
        </div>
      </div>
    </body>
    </html>
  `
}

// Função para gerar texto alternativo (fallback)
function generateEmailText(visits, date) {
  const dateFormatted = new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const totalVisits = visits.length
  const totalReceita = visits.reduce((sum, v) => sum + (v.valor - v.desconto_plataforma), 0)

  let text = `🐱 FEFELINA CAT SITTER - Lembrete de Visitas\n\n`
  text += `📅 ${dateFormatted.toUpperCase()}\n\n`
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
  text += `📊 RESUMO DO DIA\n`
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
  text += `Total de Visitas: ${totalVisits}\n`
  text += `Receita do Dia: ${formatCurrency(totalReceita)}\n\n`
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
  text += `📋 VISITAS AGENDADAS\n`
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`

  visits.forEach((visit, index) => {
    text += `${index + 1}. ${formatTime(visit.horario)} - ${visit.clients?.nome || 'Cliente não identificado'}\n`
    text += `   Endereço: ${visit.clients?.endereco_completo || 'Não cadastrado'}\n`
    if (visit.clients?.telefone) {
      text += `   Telefone: ${visit.clients.telefone}\n`
    }
    text += `   Tipo: ${visit.tipo_visita === 'inteira' ? 'Visita Inteira (1h)' : 'Meia Visita (30min)'}\n`
    text += `   Status: ${visit.status === 'agendada' ? 'Agendada' : 'Realizada'}\n`
    text += `   Valor: ${formatCurrency(visit.valor - visit.desconto_plataforma)}\n\n`
  })

  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
  text += `✨ Tenha um ótimo dia de trabalho!\n`

  return text
}

// Função principal
async function sendDailyReminder() {
  try {
    console.log('🔍 Buscando visitas do dia...')
    const today = getTodaySaoPaulo()
    const visits = await fetchTodayVisits()

    if (visits.length === 0) {
      console.log('ℹ️ Nenhuma visita agendada para hoje. Email não será enviado.')
      return
    }

    console.log(`✅ Encontradas ${visits.length} visita(s) para ${today}`)

    // Configurar transporte de email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass
      }
    })

    // Configurar email
    const mailOptions = {
      from: `"Fefelina Cat Sitter 🐱" <${emailUser}>`,
      to: recipients.join(', '),
      subject: `📅 Lembrete: ${visits.length} visita${visits.length > 1 ? 's' : ''} agendada${visits.length > 1 ? 's' : ''} para hoje`,
      text: generateEmailText(visits, today),
      html: generateEmailHTML(visits, today)
    }

    // Enviar email
    console.log('📧 Enviando email...')
    const info = await transporter.sendMail(mailOptions)
    
    console.log('✅ Email enviado com sucesso!')
    console.log('📬 Message ID:', info.messageId)
    console.log('👥 Destinatários:', recipients.join(', '))
    
  } catch (error) {
    console.error('❌ Erro ao enviar lembrete:', error)
    process.exit(1)
  }
}

// Executar
sendDailyReminder()
