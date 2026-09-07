import { Engine } from "./engine.js";
import { loadAppConfig } from "./data.js";
import { RankingService } from "./ranking.js";

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

loadAppConfig().then(async () => {
  try {
    const user = await RankingService.checkRedirectResult();
    const pendingRaw = sessionStorage.getItem('brainfit_pending_score');
    if (user && pendingRaw) {
      sessionStorage.removeItem('brainfit_pending_score');
      const pending = JSON.parse(pendingRaw);
      await RankingService.saveScore(user, pending.diffKey, pending.score);
      Engine.renderRankingCarousel();
      return;
    }
  } catch (err) {
    console.warn("Error comprobando redirect auth:", err);
  }
  Engine.renderMenu();
});
