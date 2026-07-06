import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const base = process.env.VITE_BASE_PATH ?? '/'
const outDir = process.env.VITE_OUT_DIR ?? 'dist'

export default defineConfig({
  plugins: [react()],
  base,
  // The shared @osml/graph-kit package is symlinked (file:../shared); dedupe the
  // peer deps so its source resolves to this app's single copy of each library.
  resolve: {
    dedupe: ['react', 'react-dom', '@xyflow/react', 'elkjs', 'ajv'],
  },
  build: {
    outDir: path.isAbsolute(outDir) ? outDir : path.resolve(__dirname, outDir),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
