import React from 'react'
import ReactDOM from 'react-dom/client'
import { MaxUI } from '@maxhub/max-ui'
import '@maxhub/max-ui/dist/styles.css'
import App from './App'
import './index.css'
import { initMaxBridge } from './services/maxBridge'

// Initialize MAX WebApp bridge (or mock in browser)
initMaxBridge()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MaxUI colorScheme="dark">
      <App />
    </MaxUI>
  </React.StrictMode>,
)
