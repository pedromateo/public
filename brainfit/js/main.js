import { Engine } from "./engine.js";
import { loadAppConfig } from "./data.js";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .then(reg => {
        console.log("Service Worker registrado con éxito.", reg);
        reg.update();
      })
      .catch(err => console.error("Error al registrar el Service Worker.", err));
  });

  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

loadAppConfig().then(() => Engine.renderMenu());
