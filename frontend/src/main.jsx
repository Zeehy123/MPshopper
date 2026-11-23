import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import AuthGate from "./AuthGate.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { bootstrap } from "./boostrap.js";
import { startAutoSync } from "./sync.js";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/figtree";
import "./index.css";

bootstrap().finally(() => {
  startAutoSync();
  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <AuthGate />
        </AuthProvider>
      </BrowserRouter>
    </StrictMode>,
  );
});
