module.exports = (() => {
  "use strict";
  const THEME_URL = "https://raw.githubusercontent.com/qassimtawfiq/My-custom-theme-/main/ClearVision_DarkForest_OLED.json";
  const EMOJI_URL = "https://github.com/qassimtawfiq/ios26-emoji-plugin/releases/download/v1.0/iOS.26.4.Unicode.17.ttf";
  const diagnostic = { loaded: false, nativeFileApiFound: false, source: "", sourceFontName: "", sourceEntries: 0, mergedEntries: 0, fontBytes: 0, fontConfigWritten: false, bundleReloadApiFound: false, bundleReloadRequested: false, error: "" };

  function setError(error) {
    diagnostic.error = String(error && (error.stack || error.message) || error).slice(0, 900);
    try { console.error("[iOS26Emoji MERGE] " + diagnostic.error); } catch {}
  }

  async function readJson(file, path) {
    if (!(await file.fileExists(path))) return null;
    try { return JSON.parse(await file.readFile(path, "utf8")); } catch (error) { setError(error); return null; }
  }

  async function run() {
    try {
      const proxy = typeof globalThis !== "undefined" && globalThis.nativeModuleProxy;
      const file = proxy && (proxy.NativeFileModule || proxy.RTNFileManager || proxy.DCDFileManager);
      diagnostic.nativeFileApiFound = !!(file && file.getConstants && file.fileExists && file.readFile && file.writeFile);
      if (!diagnostic.nativeFileApiFound) return;
      const documents = file.getConstants().DocumentsDirPath;

      let sourceFont = await readJson(file, documents + "/pyoncord/fonts.json");
      if (sourceFont && sourceFont.name === "iOS 26 Emoji") sourceFont = null;
      if (sourceFont && sourceFont.main && typeof sourceFont.main === "object") {
        diagnostic.source = "current fonts.json";
      } else {
        sourceFont = null;
        const stores = [documents + "/vd_mmkv/BUNNY_FONTS", documents + "/Documents/vd_mmkv/BUNNY_FONTS"];
        for (const path of stores) {
          const store = await readJson(file, path);
          if (store && store.__selected && store[store.__selected] && store[store.__selected].main) {
            sourceFont = store[store.__selected];
            diagnostic.source = "BUNNY_FONTS";
            break;
          }
        }
      }
      if (!sourceFont) {
        const response = await fetch(THEME_URL);
        if (!response.ok) throw new Error("Theme download failed: " + response.status);
        const theme = await response.json();
        if (!theme.fonts || typeof theme.fonts !== "object") throw new Error("Theme has no fonts map");
        sourceFont = { spec: 1, name: "ClearVision DarkForest OLED", main: theme.fonts };
        diagnostic.source = "theme URL";
      }

      diagnostic.sourceFontName = String(sourceFont.name || "");
      diagnostic.sourceEntries = Object.keys(sourceFont.main).length;
      const merged = {
        spec: 1,
        name: sourceFont.name,
        description: sourceFont.description,
        main: { ...sourceFont.main, AppleMFFMColorEmoji: EMOJI_URL }
      };
      if (sourceFont.__source) merged.__source = sourceFont.__source;
      diagnostic.mergedEntries = Object.keys(merged.main).length;

      const fontPath = "pyoncord/downloads/fonts/" + merged.name + "/AppleMFFMColorEmoji.ttf";
      const fullFontPath = documents + "/" + fontPath;
      if (!(await file.fileExists(fullFontPath))) {
        const response = await fetch(EMOJI_URL);
        if (!response.ok) throw new Error("Emoji font download failed: " + response.status);
        const data = Buffer.from(await response.arrayBuffer()).toString("base64");
        diagnostic.fontBytes = data.length;
        await file.writeFile("documents", fontPath, data, "base64");
      }
      await file.writeFile("documents", "pyoncord/fonts.json", JSON.stringify(merged), "utf8");
      diagnostic.fontConfigWritten = true;

      const bundle = proxy && proxy.BundleUpdaterManager;
      diagnostic.bundleReloadApiFound = !!(bundle && typeof bundle.reload === "function");
      const markerPath = "pyoncord/ios26-emoji-v12-reloaded";
      if (diagnostic.bundleReloadApiFound && !(await file.fileExists(documents + "/" + markerPath))) {
        await file.writeFile("documents", markerPath, "1", "utf8");
        diagnostic.bundleReloadRequested = true;
        setTimeout(() => { try { bundle.reload(); } catch (error) { setError(error); } }, 900);
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
    await run();
    try { console.log("[iOS26Emoji MERGE] Loaded", diagnostic); } catch {}
  }
  return { onLoad, onUnload: () => {}, settings: Settings };
})();
