import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'

// Como não há pasta public/, este plugin copia o manifesto e os ícones do app
// (que estão na raiz do repositório) para o build final.
const ARQUIVOS_PUBLICOS = ['manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png']

const copiarArquivosPublicos = () => ({
  name: 'copiar-arquivos-publicos',
  generateBundle() {
    for (const fileName of ARQUIVOS_PUBLICOS) {
      try {
        this.emitFile({ type: 'asset', fileName, source: readFileSync(fileName) })
      } catch {
        // arquivo opcional ausente: segue o build normalmente
      }
    }
  },
})

export default defineConfig({
  publicDir: false,
  plugins: [react(), copiarArquivosPublicos()],
})
