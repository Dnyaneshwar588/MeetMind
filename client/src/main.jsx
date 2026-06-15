import { Buffer } from 'buffer';
// Polyfill Node globals for simple-peer browser compatibility in Vite
window.global = window;
window.process = { env: {}, browser: true };
window.Buffer = Buffer;

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

