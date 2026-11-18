import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource/source-serif-4/400.css";
import "@fontsource/source-serif-4/400-italic.css";
import "@fontsource/source-serif-4/700.css";
import "./styles/app.css";
import App from "./App";
import { AppStore } from "./store/AppStore";
import { UIProvider } from "./components/UI";
createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AppStore>
      <UIProvider>
        <App />
      </UIProvider>
    </AppStore>
  </BrowserRouter>,
);
