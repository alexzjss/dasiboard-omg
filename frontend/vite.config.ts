import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: true,
    port: 5173,
  },
  build: {
    // Increase warning threshold — 177KB entityIcons is expected
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // ── Vendor chunks — separated for aggressive browser caching ──
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
            return 'vendor-react'
          }
          if (id.includes('@dnd-kit')) {
            return 'vendor-dndkit'
          }
          if (id.includes('date-fns')) {
            return 'vendor-datefns'
          }
          if (id.includes('lucide-react')) {
            return 'vendor-lucide'
          }
          if (id.includes('zustand') || id.includes('axios')) {
            return 'vendor-state'
          }
          // ── App chunks — easter eggs isolated ──
          if (id.includes('useEasterEggs') || id.includes('easter-eggs') || id.includes('EasterEgg')) {
            return 'app-eastereggs'
          }
          // ── Entity icons — lazy 177KB blob ──
          if (id.includes('entityIcons')) {
            return 'app-entity-icons'
          }
          if (id.includes('/pages/ProfilePage') || id.includes('/pages/PublicProfilePage')) {
            return 'page-profile'
          }
          if (id.includes('/pages/GradesPage') || id.includes('/pages/FluxogramPage')) {
            return 'page-grades'
          }
          if (id.includes('/pages/KanbanPage')) {
            return 'page-kanban'
          }
          if (id.includes('/pages/Entities') || id.includes('/pages/Feed') || id.includes('/pages/Turma')) {
            return 'page-social'
          }
          if (id.includes('/pages/StudyRoom')) {
            return 'page-study'
          }
        },
      },
    },
  },
})
