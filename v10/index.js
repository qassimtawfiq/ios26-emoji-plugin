((() => {
  "use strict";
  const patcher = vendetta.patcher;
  const metro = vendetta.metro;
  const FONT_JSON_URL = "https://raw.githubusercontent.com/qassimtawfiq/ios26-emoji-plugin/main/font.json";
  const diagnostic = { loaded: false, bridge: "not checked", updateRowsCalls: 0, rowsSeen: 0, messagesSeen: 0, emojiSeen: 0, emojiReplaced: 0, missingAssets: 0, fontApiFound: false, fontInstallApiFound: false, fontSelectApiFound: false, fontModulePath: "", fontInstalled: false, fontSelected: false, fontError: "", directFontWriteAttempted: false, directFontWritten: false, directFontBytes: 0, directFontError: "", nativeFileApiFound: false, loaderName: "", loaderFontPatch: null, bundleReloadApiFound: false, bundleReloadRequested: false, bundleReloadError: "", sampleTypes: [], sampleEmoji: [], lastCodepoints: "", lastAssetUrl: "", resolverFound: false, resolverCalls: 0, resolverMapped: 0, customRendererFound: false, customRendererSeen: 0, customRendererInjected: 0, lastRendererType: "", errors: [] };
  const unpatches = [];
  function recordError(error) {
    const message = String(error && (error.stack || error.message) || error).slice(0, 600);
    diagnostic.errors.push(message);
    try { console.error("[iOS26Emoji DEBUG] " + message); } catch {}
  }
  function inspectRows(rows) {
    if (!Array.isArray(rows)) return;
    diagnostic.rowsSeen += rows.length;
    for (const row of rows) {
      if (diagnostic.sampleTypes.length < 12 && row) diagnostic.sampleTypes.push(String(row.type));
      if (row && row.type === 1 && row.message && row.message.content) {
        diagnostic.messagesSeen++;
        const content = Array.isArray(row.message.content) ? row.message.content : [];
        for (const item of content) if (item && item.type === "emoji") diagnostic.emojiSeen++;
      }
    }
  }
  function findFontModules() {
    const found = [];
    const seen = [];
    const add = (module, path) => {
      if (!module || seen.indexOf(module) !== -1) return;
      seen.push(module);
      found.push({ module, path });
    };
    const paths = [
      "src/lib/addons/fonts/index.ts",
      "lib/addons/fonts/index.ts",
      "src/lib/addons/fonts/index",
      "lib/addons/fonts/index",
      "@lib/addons/fonts",
      "lib/addons/fonts"
    ];
    for (const path of paths) {
      try { if (metro.findByFilePath) add(metro.findByFilePath(path), path); } catch (error) { recordError(error); }
      try { if (metro.findByFilePath) add(metro.findByFilePath(path, true), path + "#default"); } catch (error) { recordError(error); }
    }
    for (const prop of ["installFont", "selectFont", "saveFont"]) {
      try {
        const modules = metro.findByPropsAll && metro.findByPropsAll(prop);
        if (Array.isArray(modules)) for (const module of modules) add(module, "findByPropsAll(" + prop + ")");
      } catch (error) { recordError(error); }
    }
    return found;
  }

  async function installFontPack() {
    const candidates = findFontModules();
    let installApi = null;
    let selectApi = null;
    let modulePath = "";
    for (const candidate of candidates) {
      if (!installApi && candidate.module && typeof candidate.module.installFont === "function") {
        installApi = candidate.module;
        modulePath = candidate.path;
      }
      if (!selectApi && candidate.module && typeof candidate.module.selectFont === "function") {
        selectApi = candidate.module;
        if (!modulePath) modulePath = candidate.path;
      }
    }
    diagnostic.fontInstallApiFound = !!installApi;
    diagnostic.fontSelectApiFound = !!selectApi;
    diagnostic.fontApiFound = diagnostic.fontInstallApiFound || diagnostic.fontSelectApiFound;
    diagnostic.fontModulePath = modulePath;
    if (!diagnostic.fontApiFound) return;

    try {
      const fontName = "iOS 26 Emoji";
      const fonts = (selectApi && selectApi.fonts) || (installApi && installApi.fonts);
      if (selectApi && fonts && fonts[fontName]) {
        await selectApi.selectFont(fontName);
        diagnostic.fontInstalled = true;
        diagnostic.fontSelected = true;
        return;
      }
      if (!installApi) return;
      await installApi.installFont(FONT_JSON_URL, true);
      diagnostic.fontInstalled = true;
      diagnostic.fontSelected = true;
    } catch (error) {
      diagnostic.fontError = String(error && (error.stack || error.message) || error).slice(0, 600);
      recordError(error);
    }
  }

  function installProbe() {
    const ReactNative = metro.common && metro.common.ReactNative;
    const nativeModules = ReactNative && ReactNative.NativeModules;
    const chatModule = (nativeModules && nativeModules.DCDChatManager) || (typeof window !== "undefined" && window.nativeModuleProxy && window.nativeModuleProxy.DCDChatManager);
    if (chatModule && typeof chatModule.updateRows === "function") {
      diagnostic.bridge = nativeModules && nativeModules.DCDChatManager ? "ReactNative.NativeModules.DCDChatManager" : "window.nativeModuleProxy.DCDChatManager";
      const unpatch = patcher.before("updateRows", chatModule, (args) => {
        try { diagnostic.updateRowsCalls++; const parsed = JSON.parse(args[1]); inspectRows(Array.isArray(parsed) ? parsed : parsed && parsed.rows); } catch (error) { recordError(error); }
      });
      if (typeof unpatch === "function") unpatches.push(unpatch);
      return;
    }
    const jsUpdateModule = metro.findByProps && metro.findByProps("updateRows");
    if (jsUpdateModule && typeof jsUpdateModule.updateRows === "function") {
      diagnostic.bridge = "metro.findByProps(updateRows)";
      const unpatch = patcher.before("updateRows", jsUpdateModule, (args) => {
        try {
          diagnostic.updateRowsCalls++;
          const value = args[1];
          const rows = value && value.rows;
          inspectRows(rows);
        } catch (error) { recordError(error); }
      });
      if (typeof unpatch === "function") unpatches.push(unpatch);
      return;
    }

    const rowManager = metro.findByName && metro.findByName("RowManager", false);
    if (rowManager && rowManager.prototype && typeof rowManager.prototype.generate === "function") {
      diagnostic.bridge = "RowManager.generate";
      const unpatch = patcher.after("generate", rowManager.prototype, (_args, row) => { try { inspectRows([row]); } catch (error) { recordError(error); } });
      if (typeof unpatch === "function") unpatches.push(unpatch);
      return;
    }
    diagnostic.bridge = "not found";
  }
  function inspectResolver() {
    try {
      const emojiModule = metro.findByProps && metro.findByProps("getEmojiURL");
      diagnostic.resolverFound = !!(emojiModule && typeof emojiModule.getEmojiURL === "function");
      if (diagnostic.resolverFound) {
        const unpatch = patcher.before("getEmojiURL", emojiModule, (args) => {
          diagnostic.resolverCalls++;
          const emoji = args[0];
          const mapped = emoji && emoji.id && typeof IOS_URLS_BY_ID !== "undefined" && IOS_URLS_BY_ID[String(emoji.id)];
          if (mapped && emoji && typeof emoji === "object") args[0] = { ...emoji, src: mapped, frozenSrc: mapped, 2: mapped, 3: mapped };
          if (mapped) diagnostic.resolverMapped++;
        });
        if (typeof unpatch === "function") unpatches.push(unpatch);
      }
    } catch (error) { recordError(error); }
  }
  async function installFontPackDirect() {
    diagnostic.directFontWriteAttempted = true;
    try {
      const loader = typeof globalThis !== "undefined" && globalThis.__PYON_LOADER__;
      diagnostic.loaderName = loader && String(loader.loaderName || "");
      diagnostic.loaderFontPatch = loader && loader.fontPatch != null ? loader.fontPatch : null;
      const proxy = typeof globalThis !== "undefined" && globalThis.nativeModuleProxy;
      const fileApi = proxy && (proxy.NativeFileModule || proxy.RTNFileManager || proxy.DCDFileManager);
      diagnostic.nativeFileApiFound = !!(fileApi && typeof fileApi.writeFile === "function" && typeof fileApi.getConstants === "function");
      if (!diagnostic.nativeFileApiFound) return;

      const fontName = "iOS 26 Emoji";
      const fontUrl = "https://github.com/qassimtawfiq/ios26-emoji-plugin/releases/download/v1.0/iOS.26.4.Unicode.17.ttf";
      const fontPath = "pyoncord/downloads/fonts/" + fontName + "/AppleMFFMColorEmoji.ttf";
      const documents = fileApi.getConstants().DocumentsDirPath;
      const fullFontPath = documents + "/" + fontPath;
      if (!(await fileApi.fileExists(fullFontPath))) {
        const response = await fetch(fontUrl);
        if (!response.ok) throw new Error("Font download failed: " + response.status);
        const data = Buffer.from(await response.arrayBuffer()).toString("base64");
        diagnostic.directFontBytes = data.length;
        await fileApi.writeFile("documents", fontPath, data, "base64");
      }

      const font = { spec: 1, name: fontName, main: { AppleMFFMColorEmoji: fontUrl } };
      await fileApi.writeFile("documents", "pyoncord/fonts.json", JSON.stringify(font), "utf8");
      diagnostic.directFontWritten = true;

      const bundle = proxy && proxy.BundleUpdaterManager;
      diagnostic.bundleReloadApiFound = !!(bundle && typeof bundle.reload === "function");
      if (diagnostic.loaderFontPatch === 2 && diagnostic.bundleReloadApiFound) {
        const markerPath = "pyoncord/ios26-emoji-v10-reloaded";
        const markerFullPath = documents + "/" + markerPath;
        if (!(await fileApi.fileExists(markerFullPath))) {
          await fileApi.writeFile("documents", markerPath, "1", "utf8");
          diagnostic.bundleReloadRequested = true;
          setTimeout(() => {
            try { bundle.reload(); }
            catch (error) {
              diagnostic.bundleReloadError = String(error && (error.stack || error.message) || error).slice(0, 600);
              recordError(error);
            }
          }, 900);
        }
      }
    } catch (error) {
      diagnostic.directFontError = String(error && (error.stack || error.message) || error).slice(0, 600);
      recordError(error);
    }
  }

  async function onLoad() {
    diagnostic.loaded = true;
    try { installProbe(); } catch (error) { recordError(error); }
    try { inspectResolver(); } catch (error) { recordError(error); }
    try { await installFontPack(); } catch (error) { recordError(error); }
    if (!diagnostic.fontApiFound) { try { await installFontPackDirect(); } catch (error) { recordError(error); } }
    try { console.log("[iOS26Emoji DEBUG] Probe loaded", diagnostic); } catch {}
  }
  function onUnload() { for (const unpatch of unpatches.splice(0)) { try { unpatch(); } catch (error) { recordError(error); } } }
  function Settings() {
    const React = metro.common && metro.common.React;
    const ReactNative = metro.common && metro.common.ReactNative;
    if (!React || !ReactNative || !ReactNative.View || !ReactNative.Text) return null;
    const [tick, setTick] = React.useState(0);
    React.useEffect(() => { const timer = setInterval(() => setTick((value) => value + 1), 1000); return () => clearInterval(timer); }, []);
    const Container = ReactNative.ScrollView || ReactNative.View;
    return React.createElement(Container, { style: { flex: 1, padding: 16 } }, React.createElement(ReactNative.Text, { selectable: true, style: { color: "#ffffff", fontSize: 13 } }, JSON.stringify(diagnostic, null, 2)));
  }
  return { onLoad, onUnload, settings: Settings };
})())
