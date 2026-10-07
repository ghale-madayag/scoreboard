import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { startKiosk } from './kiosk.js'
import './styles/app.css'

// Outside React on purpose: one wake lock and one uptime session per page
// load, independent of renders.
startKiosk()

createRoot(document.getElementById('root')).render(<App />)
