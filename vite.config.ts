import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
        open: true,
        headers: {
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'require-corp',
        },
        proxy: {
            '/api/apify': {
                target: 'https://api.apify.com',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/apify/, ''),
                secure: false,
            },
            '/api/tts': {
                target: 'http://localhost:5050',
                changeOrigin: true,
            },
            '/api/polly': {
                target: 'http://localhost:5051',
                changeOrigin: true,
            }
        }
    },
    optimizeDeps: {
        exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util']
    }
})
