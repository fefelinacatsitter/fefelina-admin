/**
 * Backup semanal criptografado de todas as tabelas do Supabase.
 *
 * Fluxo:
 *   1. Busca todas as linhas de cada tabela (paginado, contorna o cap de
 *      1000 linhas do PostgREST — mesmo princípio de src/lib/paginatedFetch.ts).
 *   2. Monta um único JSON com todas as tabelas + metadados.
 *   3. Criptografa esse JSON com AES-256-GCM (chave vinda de
 *      BACKUP_ENCRYPTION_KEY) e grava o resultado em backup-latest.json.enc.
 *
 * Variáveis de ambiente necessárias:
 *   SUPABASE_URL             - URL do projeto Supabase
 *   SUPABASE_SERVICE_KEY     - service_role key (bypassa RLS, necessário
 *                              para ler todas as linhas de todas as tabelas)
 *   BACKUP_ENCRYPTION_KEY    - 32 bytes em hex (64 caracteres), ex.:
 *                              gerar com `openssl rand -hex 32`
 *
 * Para restaurar/inspecionar o arquivo gerado, use backup-restore.js.
 */
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import { createCipheriv, randomBytes } from 'crypto'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY
const encryptionKeyHex = process.env.BACKUP_ENCRYPTION_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: SUPABASE_URL ou SUPABASE_SERVICE_KEY não configuradas')
  process.exit(1)
}

if (!encryptionKeyHex || encryptionKeyHex.length !== 64) {
  console.error('❌ Erro: BACKUP_ENCRYPTION_KEY ausente ou inválida (esperado: 64 caracteres hex / 32 bytes)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Todas as tabelas do sistema que precisam ser preservadas em backup.
const TABLES = [
  'clients',
  'pets',
  'services',
  'visits',
  'leads',
  'user_profiles',
  'profiles',
  'permissions',
  'record_sharing'
]

const PAGE_SIZE = 1000

/**
 * Busca todas as linhas de uma tabela, paginando via .range() até obter
 * uma página mais curta que PAGE_SIZE (mesma lógica de fetchAllRows em
 * src/lib/paginatedFetch.ts, reimplementada aqui em JS puro).
 */
async function fetchAllRows(tableName) {
  const allRows = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      throw new Error(`Erro ao buscar tabela "${tableName}": ${error.message}`)
    }

    const batch = data || []
    allRows.push(...batch)

    if (batch.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return allRows
}

async function buildBackupPayload() {
  const tables = {}
  const rowCounts = {}

  for (const tableName of TABLES) {
    console.log(`🔄 Buscando tabela "${tableName}"...`)
    const rows = await fetchAllRows(tableName)
    tables[tableName] = rows
    rowCounts[tableName] = rows.length
    console.log(`✅ "${tableName}": ${rows.length} linha(s)`)
  }

  return {
    generatedAt: new Date().toISOString(),
    rowCounts,
    tables
  }
}

/**
 * Criptografa uma string com AES-256-GCM.
 * Formato de saída: "<iv_hex>:<authTag_hex>:<ciphertext_base64>"
 */
function encrypt(plainText, keyHex) {
  const key = Buffer.from(keyHex, 'hex')
  const iv = randomBytes(12) // 96 bits, recomendado para GCM
  const cipher = createCipheriv('aes-256-gcm', key, iv)

  const ciphertext = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('base64')}`
}

async function main() {
  try {
    console.log('🐱 Iniciando backup semanal do banco de dados...')

    const payload = await buildBackupPayload()
    const json = JSON.stringify(payload)

    console.log('🔒 Criptografando backup (AES-256-GCM)...')
    const encrypted = encrypt(json, encryptionKeyHex)

    const outputPath = 'backup-latest.json.enc'
    writeFileSync(outputPath, encrypted, 'utf8')

    console.log(`✅ Backup gerado com sucesso: ${outputPath}`)
    console.log('📊 Contagem de linhas por tabela:', payload.rowCounts)
  } catch (error) {
    console.error('❌ Erro ao gerar backup:', error)
    process.exit(1)
  }
}

main()
