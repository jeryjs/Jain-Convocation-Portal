import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { waitForConfig } from './config.js'

document.head.insertAdjacentHTML('beforeend', '<link rel="icon" href="favicon.ico" type="image/x-icon">');

// Show minimal shimmer loading state
const root = document.getElementById('root');
root.innerHTML = `
  <div style="
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 24px;
    max-width: 1200px;
    margin: 0 auto;
    height: 100vh;
    width: 100vw;
    background: #f5f5f5;
  ">
    <div style="
      height: 80px;
      background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 8px;
    "></div>
    <div style="
      height: 120px;
      background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      animation-delay: 0.1s;
      border-radius: 8px;
    "></div>
    <div style="display: flex; gap: 16px;">
      <div style="
        flex: 1;
        height: 200px;
        background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        animation-delay: 0.2s;
        border-radius: 8px;
      "></div>
      <div style="
        flex: 1;
        height: 200px;
        background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        animation-delay: 0.3s;
        border-radius: 8px;
      "></div>
    </div>
    <style>
      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    </style>
  </div>
`;

// Wait for config to load before rendering
waitForConfig()
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
