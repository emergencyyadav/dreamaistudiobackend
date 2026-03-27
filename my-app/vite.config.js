import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  define: {
    // Inject global, process, and Buffer for Solana / crypto packages
    global: 'globalThis',
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
  },
  resolve: {
    alias: {
      // Shims for node.js core modules
      buffer: 'buffer',
      process: 'process',
      util: 'util',
      stream: 'stream-browserify',
      events: 'events',
    }
  },
  server: {
    allowedHosts: true,
    proxy: {
      '/api/async': {
        target: 'https://api.async.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/async/, '')
      }
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      // Pre-inject Buffer dynamically into esbuild during dev
      define: {
        global: 'globalThis'
      }
    },
    include: ['@solana/web3.js', 'bip39', 'ed25519-hd-key', 'bs58', 'tweetnacl', 'buffer', 'process'],
  },
})
