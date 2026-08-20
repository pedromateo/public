import { Engine } from "./engine.js";
import { loadAppConfig } from "./data.js";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .then(reg => console.log("Service Worker registrado con éxito.", reg))
      .catch(err => console.error("Error al registrar el Service Worker.", err));
  });
}

loadAppConfig().then(() => Engine.renderMenu());
