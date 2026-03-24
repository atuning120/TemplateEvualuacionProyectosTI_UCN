import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import ReportFormPage from './pages/ReportFormPage.jsx'


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ReportFormPage />
  </StrictMode>,
)
