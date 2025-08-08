// Script para testar a conexão com Supabase
// Execute este arquivo depois de configurar as variáveis de ambiente

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente não encontradas!')
  console.log('Certifique-se de que VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estão definidas no arquivo .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testConnection() {
  try {
    console.log('🔌 Testando conexão com Supabase...')
    
    // Teste 1: Verificar se a conexão está funcionando
    const { data, error } = await supabase
      .from('clients')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ Erro na conexão:', error.message)
      return
    }
    
    console.log('✅ Conexão com Supabase estabelecida com sucesso!')
    
    // Teste 2: Verificar se as tabelas existem
    const tables = ['clients', 'pets', 'services', 'visits']
    
    for (const table of tables) {
      const { error: tableError } = await supabase
        .from(table)
        .select('count')
        .limit(1)
      
      if (tableError) {
        console.error(`❌ Tabela '${table}' não encontrada:`, tableError.message)
      } else {
        console.log(`✅ Tabela '${table}' encontrada`)
      }
    }
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error)
  }
}

// Execute o teste
testConnection()
