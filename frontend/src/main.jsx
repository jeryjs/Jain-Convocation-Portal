import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { waitForConfig } from './config.js'

document.head.insertAdjacentHTML('beforeend', '<link rel="icon" href="favicon.ico" type="image/x-icon">');

// Wait for config to load before rendering
waitForConfig().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
});
