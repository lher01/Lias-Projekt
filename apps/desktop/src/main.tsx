import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createServices } from "./infrastructure/services";
import { App } from "./ui/App";
import "./ui/styles.css";

const root = createRoot(document.getElementById("root")!);

createServices()
  .then((services) => {
    root.render(
      <StrictMode>
        <App services={services} />
      </StrictMode>,
    );
  })
  .catch((error: unknown) => {
    console.error(error);
    root.render(
      <div className="fatal">
        <h1>DevLog konnte nicht starten</h1>
        <pre>{error instanceof Error ? error.message : String(error)}</pre>
      </div>,
    );
  });
