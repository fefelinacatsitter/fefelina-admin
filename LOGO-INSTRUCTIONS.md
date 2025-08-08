# Como adicionar a logo do Fefelina

## 📁 Passos para adicionar a logo:

1. **Copie o arquivo da logo** do projeto antigo:
   - Vá para: `C:\Users\A344474\OneDrive - Deutsche Telekom AG\Dokumente\Fefelina\Fefelina`
   - Encontre o arquivo `FefelinaLogo` (pode ser .png, .jpg, .svg, etc.)
   - Copie para: `c:\Users\A344474\Fefelina-Admin\src\assets\`

2. **Renomeie o arquivo** para `fefelina-logo.png` (ou extensão apropriada)

3. **Atualize o Layout.tsx** (linha 35-37):
   ```tsx
   // Substitua este bloco:
   <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center mr-3">
     <span className="text-white font-bold text-lg">F</span>
   </div>
   
   // Por este:
   <img 
     src="/src/assets/fefelina-logo.png" 
     alt="Fefelina Logo" 
     className="w-8 h-8 mr-3"
   />
   ```

4. **Atualize o LoginPage.tsx** (linha 31-33):
   ```tsx
   // Substitua este bloco:
   <div className="mx-auto w-16 h-16 bg-primary-500 rounded-xl flex items-center justify-center mb-4">
     <span className="text-white font-bold text-2xl">F</span>
   </div>
   
   // Por este:
   <img 
     src="/src/assets/fefelina-logo.png" 
     alt="Fefelina Logo" 
     className="mx-auto w-16 h-16 mb-4"
   />
   ```

## 🎨 Cores aplicadas:

- **Primária**: #e28e60 (laranja Fefelina)
- **Secundária**: #000000 (preto)
- **Gradientes e variações**: Criadas automaticamente pelo Tailwind

## ✨ Melhorias visuais aplicadas:

- Sidebar com cores Fefelina
- Login com gradiente e animações
- Botões com transições suaves
- Ícones e indicadores visuais melhorados
