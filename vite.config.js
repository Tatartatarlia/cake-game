import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' 使构建产物可用相对路径直接以 file:// 打开
export default defineConfig({
  base: '/cake-game/',
  plugins: [react()],
})
