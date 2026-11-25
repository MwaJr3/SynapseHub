import { createRoot } from 'react-dom/client'
import '@fontsource-variable/dm-sans'
import '@fontsource-variable/manrope'
import './styles.css'
import './decor/decor.css'
import { App } from './App'
import { OfflineBanner, RequestStatus } from "./decor"

createRoot(document.getElementById('root')!).render(
  <>
    <OfflineBanner />
    <RequestStatus />
    <App />
  </>,
)
