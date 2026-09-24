import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/* The API issues httpOnly, sameSite=strict cookies. Proxying /api keeps the
   browser on a single origin so those cookies are actually sent — a plain
   cross-origin fetch to :5501 would silently drop them. */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:5501',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, '')
      }
    }
  }
});
