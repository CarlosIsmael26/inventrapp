import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { ToastProvider } from './components/ui'
import { AuthProvider } from './contexts/AuthContext'
import App from './App'
import './index.css'

createRoot(
  document.getElementById('root')!,
).render(
  <StrictMode>
    <AuthProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AuthProvider>
  </StrictMode>,
)