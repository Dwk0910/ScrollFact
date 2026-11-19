import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import { SidePanel } from './SidePanel'

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root was not found')

createRoot(root).render(
  <StrictMode>
    <SidePanel />
  </StrictMode>,
)
