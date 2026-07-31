/**
 * Utilitário LOCAL (não roda no CI) para decriptar e inspecionar um backup
 * gerado por backup-database.js.
 *
 * Uso:
 *   BACKUP_ENCRYPTION_KEY=<chave-hex> node backup-restore.js <caminho-do-arquivo.enc>
 *
 * Exemplo:
 *   BACKUP_ENCRYPTION_KEY=abcd...1234 node backup-restore.js backup-latest.json.enc
 *
 * Por padrão apenas imprime um resumo (data de geração + contagem de linhas
 * por tabela). Para salvar o JSON decriptado completo em disco, passe um
 * segundo argumento com o caminho de saída:
 *
 *   BACKUP_ENCRYPTION_KEY=abcd...1234 node backup-restore.js backup-latest.json.enc restored.json
 *
 * Este script NÃO reimporta os dados de volta para o Supabase — ele só
 * decripta o arquivo para permitir inspeção manual ou uso em uma carga
 * manual/replicada posterior.
 */
import { readFileSync, writeFileSync } from 'fs'
import { createDecipheriv } from 'crypto'

const encryptionKeyHex = process.env.BACKUP_ENCRYPTION_KEY
const inputPath = process.argv[2]
const outputPath = process.argv[3]

if (!encryptionKeyHex || encryptionKeyHex.length !== 64) {
  console.error('❌ Erro: BACKUP_ENCRYPTION_KEY ausente ou inválida (esperado: 64 caracteres hex / 32 bytes)')
  process.exit(1)
}

if (!inputPath) {
  console.error('❌ Erro: informe o caminho do arquivo .enc a decriptar.')
  console.error('   Uso: node backup-restore.js <arquivo.enc> [arquivo-saida.json]')
  process.exit(1)
}

function decrypt(encryptedString, keyHex) {
  const [ivHex, authTagHex, ciphertextBase64] = encryptedString.split(':')

  if (!ivHex || !authTagHex || !ciphertextBase64) {
    throw new Error('Formato de arquivo criptografado inválido (esperado "iv:authTag:ciphertext").')
  }

  const key = Buffer.from(keyHex, 'hex')
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const ciphertext = Buffer.from(ciphertextBase64, 'base64')

  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  const plainText = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return plainText.toString('utf8')
}

function main() {
  try {
    const encryptedContent = readFileSync(inputPath, 'utf8').trim()
    const json = decrypt(encryptedContent, encryptionKeyHex)
    const payload = JSON.parse(json)

    console.log('✅ Backup decriptado com sucesso.')
    console.log(`📅 Gerado em: ${payload.generatedAt}`)
    console.log('📊 Contagem de linhas por tabela:')
    for (const [table, count] of Object.entries(payload.rowCounts || {})) {
      console.log(`   - ${table}: ${count}`)
    }

    if (outputPath) {
      writeFileSync(outputPath, json, 'utf8')
      console.log(`💾 JSON completo salvo em: ${outputPath}`)
    } else {
      console.log('ℹ️  Nenhum arquivo de saída informado — apenas o resumo acima foi exibido.')
      console.log('    Passe um segundo argumento para salvar o JSON completo em disco.')
    }
  } catch (error) {
    console.error('❌ Erro ao decriptar backup:', error.message)
    process.exit(1)
  }
}

main()
