import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

document.head.insertAdjacentHTML('beforeend', '<link rel="icon" href="favicon.ico" type="image/x-icon">');
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
