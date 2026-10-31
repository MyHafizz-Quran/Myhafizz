/* Chargé avant l'app (pas de script en ligne : compatible avec la politique de sécurité CSP) */
      // Thème avant le premier rendu (évite un flash blanc la nuit) : suit l'appareil sauf choix contraire
      (function () { try {
        var p = JSON.parse(localStorage.getItem("quran_preferences") || "{}"), t = p.theme || "system";
        var d = t === "dark" || (t !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
        if (d) document.documentElement.classList.add("dark");
        document.documentElement.style.colorScheme = d ? "dark" : "light";
      } catch (e) {} })();
    
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js');
          let refreshing = false;
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            refreshing = true;
            window.location.reload();
          });
        });
      }
    
