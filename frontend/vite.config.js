import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5000,
    strictPort: true,
    allowedHosts: true,
    hmr: {
      // 在 GitHub Codespaces 中使用安全的 WebSocket (wss://)
      protocol: 'wss',
      host: process.env.CODESPACE_NAME 
        ? `${process.env.CODESPACE_NAME}-5000.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`
        : 'localhost',
      clientPort: 443, // HTTPS 默认端口
      timeout: 5000,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5000,
  },
})
