#!/usr/bin/env node

/**
 * Script de verificação pré-deploy
 * Verifica se o projeto está pronto para publicação
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando projeto para deploy...\n');

const checks = [
  {
    name: 'package.json',
    check: () => fs.existsSync('package.json'),
    message: 'package.json encontrado ✅'
  },
  {
    name: 'README.md',
    check: () => fs.existsSync('README.md'),
    message: 'README.md encontrado ✅'
  },
  {
    name: '.env.example',
    check: () => fs.existsSync('.env.example'),
    message: '.env.example encontrado ✅'
  },
  {
    name: '.gitignore',
    check: () => fs.existsSync('.gitignore') && fs.readFileSync('.gitignore', 'utf8').includes('.env'),
    message: '.gitignore configurado corretamente ✅'
  },
  {
    name: 'GitHub Actions',
    check: () => fs.existsSync('.github/workflows/deploy.yml'),
    message: 'GitHub Actions configurado ✅'
  },
  {
    name: 'Vite Config',
    check: () => {
      const config = fs.readFileSync('vite.config.ts', 'utf8');
      return config.includes('base:') && config.includes('/fefelina-admin/');
    },
    message: 'Vite configurado para GitHub Pages ✅'
  },
  {
    name: 'SPA Support',
    check: () => fs.existsSync('public/404.html') && fs.existsSync('.nojekyll'),
    message: 'Suporte SPA configurado ✅'
  },
  {
    name: 'Segurança .env',
    check: () => {
      // Verificar se .env está no .gitignore
      const gitignore = fs.readFileSync('.gitignore', 'utf8');
      return gitignore.includes('.env');
    },
    message: 'Arquivo .env protegido no .gitignore ✅'
  }
];

let allPassed = true;

checks.forEach(check => {
  try {
    if (check.check()) {
      console.log(check.message);
    } else {
      console.log(`❌ ${check.name} - Verificação falhou`);
      allPassed = false;
    }
  } catch (error) {
    console.log(`⚠️  ${check.name} - Erro na verificação: ${error.message}`);
    allPassed = false;
  }
});

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('🎉 Projeto pronto para deploy no GitHub Pages!');
  console.log('\nPróximos passos:');
  console.log('1. git add .');
  console.log('2. git commit -m "feat: configuração inicial"');
  console.log('3. git push origin main');
  console.log('4. Configurar secrets no GitHub (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)');
  console.log('5. Ativar GitHub Pages na aba Settings');
} else {
  console.log('❌ Existem problemas que precisam ser corrigidos antes do deploy.');
  process.exit(1);
}
