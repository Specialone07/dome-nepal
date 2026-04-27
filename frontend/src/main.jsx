import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './styles/globals.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    }
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#111111',
              color: '#FAF7F0',
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '13px',
              letterSpacing: '0.02em',
              borderRadius: '0px',
              padding: '14px 18px',
              border: '1px solid #333333',
            },
            success: {
              iconTheme: { primary: '#C9A84C', secondary: '#111111' }
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#111111' }
            }
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)