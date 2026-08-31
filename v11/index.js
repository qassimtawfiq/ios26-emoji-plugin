module.exports = (() => {
  "use strict";
  const diagnostic = { loaded: false, nativeFileApiFound: false, previousFontName: "", restoredFontName: "", restored: false, removedOverride: false, bundleReloadApiFound: false, bundleReloadRequested: false, error: "" };

  function setError(error) {
    diagnostic.error = String(error && (error.stack || error.message) || error).slice(0, 800);
    try { console.error("[iOS26Emoji RECOVERY] " + diagnostic.error); } catch {}
  }

  async function recover() {
    try {
      const proxy = typeof globalThis !== "undefined" && globalThis.nativeModuleProxy;
      const file = proxy && (proxy.NativeFileModule || proxy.RTNFileManager || proxy.DCDFileManager);
      diagnostic.nativeFileApiFound = !!(file && file.getConstants && file.readFile && file.writeFile);
      if (!diagnostic.nativeFileApiFound) return;

      const documents = file.getConstants().DocumentsDirPath;
      const fontConfig = documents + "/pyoncord/fonts.json";
      const stores = [
        documents + "/vd_mmkv/BUNNY_FONTS",
        documents + "/Documents/vd_mmkv/BUNNY_FONTS"
      ];
      let store = null;
      for (const path of stores) {
        try {
          if (await file.fileExists(path)) {
            store = JSON.parse(await file.readFile(path, "utf8"));
            break;
          }
        } catch (error) { setError(error); }
      }

      if (store && store.__selected && store[store.__selected] && store.__selected !== "iOS 26 Emoji") {
        diagnostic.previousFontName = String(store.__selected);
        await file.writeFile("documents", "pyoncord/fonts.json", JSON.stringify(store[store.__selected]), "utf8");
        diagnostic.restoredFontName = diagnostic.previousFontName;
        diagnostic.restored = true;
      } else {
        try {
          if (await file.fileExists(fontConfig)) {
            await file.removeFile("documents", "pyoncord/fonts.json");
            diagnostic.removedOverride = true;
          }
        } catch (error) { setError(error); }
      }

      try { if (file.clearFolder) await file.clearFolder("documents", "pyoncord/downloads/fonts/iOS 26 Emoji"); } catch {}
      try { if (file.removeFile) await file.removeFile("documents", "pyoncord/ios26-emoji-v10-reloaded"); } catch {}

      const bundle = proxy && proxy.BundleUpdaterManager;
      diagnostic.bundleReloadApiFound = !!(bundle && typeof bundle.reload === "function");
      const marker = documents + "/pyoncord/ios26-emoji-recovery-done";
      if (diagnostic.bundleReloadApiFound && !(await file.fileExists(marker))) {
        await file.writeFile("documents", "pyoncord/ios26-emoji-recovery-done", "1", "utf8");
        diagnostic.bundleReloadRequested = true;
        setTimeout(() => { try { bundle.reload(); } catch (error) { setError(error); } }, 700);
      }
    } catch (error) { setError(error); }
  }

  function Settings() {
    const React = vendetta.metro.common && vendetta.metro.common.React;
    const ReactNative = vendetta.metro.common && vendetta.metro.common.ReactNative;
    if (!React || !ReactNative || !ReactNative.View || !ReactNative.Text) return null;
    return React.createElement(ReactNative.ScrollView || ReactNative.View, { style: { flex: 1, padding: 16 } }, React.createElement(ReactNative.Text, { selectable: true, style: { color: "#ffffff", fontSize: 13 } }, JSON.stringify(diagnostic, null, 2)));
  }

  async function onLoad() {
    diagnostic.loaded = true;
    await recover();
    try { console.log("[iOS26Emoji RECOVERY] Loaded", diagnostic); } catch {}
  }
  return { onLoad, onUnload: () => {}, settings: Settings };
})();
