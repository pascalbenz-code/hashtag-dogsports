(() => {
        let preference = "system";
        try {
          const stored = localStorage.getItem("dogsports-theme");
          if (stored === "light" || stored === "dark") preference = stored;
        } catch {
          // Storage can be unavailable in restricted browser contexts.
        }
        const systemDark =
          typeof matchMedia === "function" &&
          matchMedia("(prefers-color-scheme: dark)").matches;
        const theme =
          preference === "dark" || (preference === "system" && systemDark)
            ? "dark"
            : "light";
        document.documentElement.dataset.theme = theme;
        document.documentElement.style.colorScheme = theme;
      })();
