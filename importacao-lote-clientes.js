// Função para importação em lote de clientes
// Execute este código no console do navegador na página de clientes

const clientesParaImportar = [
  { nome: 'Amanda', valorDiaria: 50.00, valorDuasVisitas: 65.00, endereco: 'Victor Konder, 304', veterinario: '' },
  { nome: 'Ana Rebelato', valorDiaria: 50.00, valorDuasVisitas: 65.00, endereco: 'Centro, 402', veterinario: '' },
  { nome: 'Anderson (Handit)', valorDiaria: 50.00, valorDuasVisitas: 65.00, endereco: 'Vila Nova', veterinario: '' },
  { nome: 'Beth', valorDiaria: 50.00, valorDuasVisitas: 65.00, endereco: 'Esc. Agricola, Casa', veterinario: '' },
  { nome: 'Carolina', valorDiaria: 40.00, valorDuasVisitas: 65.00, endereco: 'Velha Central', veterinario: '' },
  { nome: 'Débora', valorDiaria: 45.00, valorDuasVisitas: 65.00, endereco: 'Vila Nova, 802', veterinario: '' },
  { nome: 'Gisele', valorDiaria: 55.00, valorDuasVisitas: 65.00, endereco: 'Esc. Agricola, Casa', veterinario: '' },
  { nome: 'Helimary', valorDiaria: 50.00, valorDuasVisitas: 65.00, endereco: 'Vila Nova, 202', veterinario: '' },
  { nome: 'Hellen & Thiago', valorDiaria: 50.00, valorDuasVisitas: 65.00, endereco: 'Vila Nova, 1001', veterinario: 'Milena - 9154-0611' },
  { nome: 'Ivan', valorDiaria: 50.00, valorDuasVisitas: 65.00, endereco: 'Victor Konder, 304', veterinario: '' },
  { nome: 'Jonas', valorDiaria: 45.00, valorDuasVisitas: 65.00, endereco: 'Esc. Agricola, 1096', veterinario: '' },
  { nome: 'Julia', valorDiaria: 50.00, valorDuasVisitas: 65.00, endereco: 'Centro, 1302', veterinario: '' },
  { nome: 'Kenzo', valorDiaria: 50.00, valorDuasVisitas: 65.00, endereco: 'Victor Konder, 1604', veterinario: '' },
  { nome: 'Lisandra', valorDiaria: 50.00, valorDuasVisitas: 65.00, endereco: 'Victor Konder', veterinario: '' },
  { nome: 'Lucas Herkenhoff', valorDiaria: 50.00, valorDuasVisitas: 65.00, endereco: 'Vila Nova, 1402', veterinario: '' },
  { nome: 'Lucila & William', valorDiaria: 50.00, valorDuasVisitas: 65.00, endereco: 'Garcia, Casa', veterinario: '' },
  { nome: 'Mayara / César', valorDiaria: 45.00, valorDuasVisitas: 65.00, endereco: 'Velha, 1303', veterinario: '' },
  { nome: 'Paula', valorDiaria: 45.00, valorDuasVisitas: 65.00, endereco: 'Vila Nova, 403', veterinario: '' },
  { nome: 'Polyana', valorDiaria: 45.00, valorDuasVisitas: 65.00, endereco: 'Alameda, 901', veterinario: '' },
  { nome: 'Sheila', valorDiaria: 50.00, valorDuasVisitas: 65.00, endereco: 'Água Verde, Casa', veterinario: '' },
  { nome: 'Suzi', valorDiaria: 45.00, valorDuasVisitas: 65.00, endereco: 'Fortaleza, 704', veterinario: '' },
  { nome: 'Tânia', valorDiaria: 45.00, valorDuasVisitas: 65.00, endereco: 'Fortaleza, 1076', veterinario: '' },
  { nome: 'Thiago', valorDiaria: 50.00, valorDuasVisitas: 65.00, endereco: 'Victor Konder, 1001', veterinario: '' },
  { nome: 'Paulo Felski', valorDiaria: 50.00, valorDuasVisitas: 65.00, endereco: 'Victor Konder', veterinario: '' },
  { nome: 'Rafaela / João Schmitt', valorDiaria: 50.00, valorDuasVisitas: 65.00, endereco: 'Vila Nova, 903', veterinario: '' },
  { nome: 'Adriana Bollmann', valorDiaria: 50.00, valorDuasVisitas: 65.00, endereco: 'Fortaleza', veterinario: '' },
  { nome: 'Lucas / Ali', valorDiaria: 70.00, valorDuasVisitas: 65.00, endereco: 'Victor Konder, 603', veterinario: '' },
  { nome: 'Aline', valorDiaria: 50.00, valorDuasVisitas: 65.00, endereco: 'Centro, 401', veterinario: '' },
  { nome: 'Lais Zambon', valorDiaria: 50.00, valorDuasVisitas: 65.00, endereco: 'Velha, 402', veterinario: '' },
  { nome: 'Ari Greco', valorDiaria: 50.00, valorDuasVisitas: 65.00, endereco: 'Itoupava Seca, 502', veterinario: '' },
  { nome: 'Bruno', valorDiaria: 50.00, valorDuasVisitas: 65.00, endereco: 'Vila Nova, 202', veterinario: '' }
];

// Função para importar todos os clientes
async function importarClientesEmLote() {
  console.log('Iniciando importação de', clientesParaImportar.length, 'clientes...');
  
  let sucessos = 0;
  let erros = 0;
  
  for (const cliente of clientesParaImportar) {
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([{
          nome: cliente.nome,
          valor_diaria: cliente.valorDiaria,
          valor_duas_visitas: cliente.valorDuasVisitas,
          endereco_completo: cliente.endereco,
          veterinario_confianca: cliente.veterinario
        }]);
      
      if (error) throw error;
      
      sucessos++;
      console.log(`✅ ${cliente.nome} - inserido com sucesso`);
    } catch (error) {
      erros++;
      console.error(`❌ ${cliente.nome} - erro:`, error.message);
    }
    
    // Pequena pausa entre inserções
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n📊 Importação concluída:`);
  console.log(`✅ Sucessos: ${sucessos}`);
  console.log(`❌ Erros: ${erros}`);
  console.log(`📋 Total: ${clientesParaImportar.length}`);
}

// Para executar a importação, digite no console:
// importarClientesEmLote();
