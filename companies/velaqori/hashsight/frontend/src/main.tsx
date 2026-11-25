import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App"
import { OfflineBanner, RequestStatus } from "./decor"
import "./styles.css"
import "./decor/decor.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <OfflineBanner />
    <RequestStatus />
    <App />
  </StrictMode>,
)
