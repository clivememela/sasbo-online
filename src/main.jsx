import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './assets/styles/index.css'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext'
import { APIProvider } from '@vis.gl/react-google-maps'

// Suppress extension errors
window.addEventListener('error', (event) => {
  if (event.message?.includes('A listener indicated an asynchronous response')) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <APIProvider apiKey={import.meta.env.VITE_GOOGLE_API_KEY}>
          <App />
        </APIProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
