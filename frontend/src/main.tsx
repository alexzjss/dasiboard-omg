import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from '@/context/ThemeContext'
import App from './App'
import './styles/globals.css'
import './styles/enhancements.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <App />
        <Toaster
          position="top-right"
          gutter={8}
          containerStyle={{ top: 64 }}
          toastOptions={{
            duration: 3500,
            style: {
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              fontSize: '13px',
              fontFamily: 'var(--font-body)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2)',
              backdropFilter: 'blur(12px)',
              padding: '10px 16px',
              maxWidth: '360px',
            },
            success: {
              iconTheme: { primary: '#22c55e', secondary: 'white' },
              style: {
                background: 'var(--bg-card)',
                borderColor: 'rgba(34,197,94,0.35)',
              },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: 'white' },
              style: {
                background: 'var(--bg-card)',
                borderColor: 'rgba(239,68,68,0.35)',
              },
            },
          }}
        />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
)
