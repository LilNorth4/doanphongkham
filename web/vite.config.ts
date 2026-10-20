import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// Khi phát triển, mọi lời gọi /api được chuyển sang backend Spring Boot (cổng 8080)
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: 5173,
    proxy: { '/api': 'http://127.0.0.1:8080' },
    // Thư mục dự án có dấu tiếng Việt: trình theo dõi file mặc định trên Windows đôi khi bỏ sót thay đổi
    watch: { usePolling: true, interval: 300 },
  },
})
