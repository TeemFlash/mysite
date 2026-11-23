import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { App } from "./App";
import "../experience/base.css";
import "../experience/scene.css";
import "../experience/projects.css";
import "../experience/profile.css";
import "../experience/contact.css";
import "../experience/skills-bento.css";
import "../experience/language.css";
import "../experience/ui-system.css";
import "../experience/liquid.css";
import "../experience/about-tunnel.css";
import "../experience/name-murmuration.css";
import "../experience/player-placement.css";
import "../experience/theme.css";


// Existing animation controllers attach once, after React commits the stable portfolio DOM.
// shortcut: controllers own their DOM for the page lifetime; add cleanup before SPA routing or remounts.
// Native image/link dragging must not compete with the interactive cells.
document.addEventListener("dragstart", event => event.preventDefault());
flushSync(() => createRoot(document.getElementById("root")!).render(<App />));
async function startControllers() {
  await import("../experience/scene.js");
  await import("../experience/profile.js");
  await import("../experience/contact.js");
  await import("../experience/language.js");
  await import("../experience/liquid.js");
  await import("../experience/about-tunnel.js");
  await import("../experience/name-murmuration.js");
  document.querySelector<HTMLButtonElement>("#record-control")!.disabled =
    false;
  window.dispatchEvent(new Event("portfolio:ready"));
}
startControllers().catch((error) => {
  console.error("Portfolio initialization failed", error);
  document.getElementById("announcer")!.textContent =
    "Unable to start the page. Please reload.";
});
