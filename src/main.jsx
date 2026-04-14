import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { RootDiscoveryProvider } from './contexts/RootDiscoveryContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootDiscoveryProvider>
      <App />
    </RootDiscoveryProvider>
  </StrictMode>,
)
