import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        host: true,
        port: 5173,
        // Allow accessing the dev server via custom LAN hostnames like memogrocery.home
        allowedHosts: ['memogrocery.home'],
        watch: {
            usePolling: true,
        },
        // When hitting the Vite dev server directly (e.g. http://memogrocery.home:8081),
        // proxy API and uploads to the backend container.
        proxy: {
            '/api': {
                target: 'http://backend:8000',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, ''),
            },
            '/uploads': {
                target: 'http://backend:8000',
                changeOrigin: true,
            },
        },
    },
})
