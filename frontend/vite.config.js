import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // 500 kB 초과 경고 임계값 상향 (recharts 포함 시 불가피)
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // rolldown(Vite 8)은 함수 형식만 허용
        manualChunks: (id) => {
          if (id.includes('recharts') || id.includes('/d3-')) {
            return 'vendor-recharts';
          }
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'vendor-react';
          }
        },
      },
    },
  },
  plugins: [react(), tailwindcss()],
})
