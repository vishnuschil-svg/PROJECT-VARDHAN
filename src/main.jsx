import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./styles/theme.css";
import "./styles/vds.css";
import AppRouter from "./routes/AppRouter";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import DevBanner from "./components/common/DevBanner";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <DevBanner />
        <AppRouter />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
