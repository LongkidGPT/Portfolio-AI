import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import { CaseStudyPage } from "./CaseStudyPage.jsx";
import { applyPageBackgroundMode } from "./page-background-mode.js";
import "./styles.css";

applyPageBackgroundMode();

const route = window.location.pathname.replace(/\/+$/, "");
const caseId = route.match(/^\/case\/(brand|marketing|system)$/)?.[1] ?? null;

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {caseId ? <CaseStudyPage caseId={caseId} /> : <App />}
  </React.StrictMode>,
);
