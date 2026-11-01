/* Chargé avant l'app (pas de script en ligne : compatible avec la politique de sécurité CSP) */
      // Anciens navigateurs (Chrome < 92, Safari < 15.4) : crypto.randomUUID manquant, utilisé par Neon Auth et l'app
      (function () { try {
        var c = window.crypto || window.msCrypto;
        if (c && typeof c.randomUUID !== "function" && typeof c.getRandomValues === "function") {
          c.randomUUID = function () {
            var b = c.getRandomValues(new Uint8Array(16)), h = [], i;
            b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
            for (i = 0; i < 16; i++) h.push((b[i] + 256).toString(16).slice(1));
            return h.slice(0, 4).join("") + "-" + h.slice(4, 6).join("") + "-" + h.slice(6, 8).join("") + "-" + h.slice(8, 10).join("") + "-" + h.slice(10).join("");
          };
        }
      } catch (e) {} })();
      // Thème avant le premier rendu (évite un flash blanc la nuit) : suit l'appareil sauf choix contraire
      (function () { try {
        var p = JSON.parse(localStorage.getItem("quran_preferences") || "{}"), t = p.theme || "system";
        var d = t === "dark" || (t !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
        if (d) document.documentElement.classList.add("dark");
        document.documentElement.style.colorScheme = d ? "dark" : "light";
      } catch (e) {} })();
    
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js').catch(function () { /* service worker refusé (navigation privée, appareil de test) : l'app marche sans */ });
          let refreshing = false;
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            refreshing = true;
            window.location.reload();
          });
        });
      }
    
