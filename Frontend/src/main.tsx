import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProvider, RequireAuth } from './auth/AuthProvider'
import AuthPage from './auth/AuthPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/sign-in" element={<AuthPage key="login" mode="login" />} />
          <Route path="/sign-up" element={<AuthPage key="signup" mode="signup" />} />
          <Route path="/*" element={<RequireAuth><App /></RequireAuth>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
