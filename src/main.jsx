import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import { applyPageBackgroundMode } from "./page-background-mode.js";
import "./styles.css";

applyPageBackgroundMode();

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
