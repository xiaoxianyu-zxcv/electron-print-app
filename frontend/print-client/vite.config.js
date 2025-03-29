import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  define: {
    global: 'window',
  },
  server: {
    // 添加代理配置
    proxy: {
      // 转发API请求到后端
      '/api': {
        target: 'http://localhost:23333',
        changeOrigin: true,
        secure: false
      },
      // 转发WebSocket请求到后端
      '/print-ws': {
        target: 'http://localhost:23333',
        changeOrigin: true,
        secure: false,
        ws: true // 启用WebSocket代理
      }
    }
  }
})