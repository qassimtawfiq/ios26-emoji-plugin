(() => {
  "use strict";
  const diagnostic = { loaded: false, styleModuleFound: false, styleModules: 0, families: {}, emojiModuleFound: false, emojiModuleKeys: [], nativeTextInfo: {}, errors: [] };
  function err(error) { diagnostic.errors.push(String(error && (error.stack || error.message) || error).slice(0, 500)); }
  function collect(module) {
    if (!module || typeof module !== "object") return;
    diagnostic.styleModules++;
    for (const key of Object.keys(module)) {
      const value = module[key];
      if (value && typeof value === "object" && typeof value.fontFamily === "string") {
        diagnostic.families[key] = { fontFamily: value.fontFamily, fontSize: value.fontSize, lineHeight: value.lineHeight };
      }
    }
  }
  function probe() {
    try {
      const metro = vendetta.metro;
      const candidates = [];
      if (metro.findByPropsAll) {
        for (const props of [["text-md/medium"], ["text-sm/normal"], ["heading-lg/semibold"], ["text-md/medium", "text-sm/normal"]]) {
          try { const found = metro.findByPropsAll(...props); if (Array.isArray(found)) candidates.push(...found); } catch (error) { err(error); }
        }
      }
      if (metro.findByProps) {
        for (const props of [["text-md/medium"], ["text-sm/normal"], ["heading-lg/semibold"], ["text-md/medium", "text-sm/normal"]]) {
          try { candidates.push(metro.findByProps(...props)); } catch (error) { err(error); }
        }
      }
      const seen = [];
      for (const module of candidates) if (module && seen.indexOf(module) === -1) { seen.push(module); collect(module); }
      diagnostic.styleModuleFound = Object.keys(diagnostic.families).length > 0;
      try {
        const emoji = metro.findByProps && metro.findByProps("getEmojiURL");
        diagnostic.emojiModuleFound = !!emoji;
        if (emoji) diagnostic.emojiModuleKeys = Object.keys(emoji).slice(0, 80);
      } catch (error) { err(error); }
      try {
        const rn = metro.common && metro.common.ReactNative;
        const Text = rn && rn.Text;
        diagnostic.nativeTextInfo = Text ? { name: String(Text.displayName || Text.name || ""), keys: Object.keys(Text).slice(0, 60), defaultProps: Text.defaultProps || null } : {};
      } catch (error) { err(error); }
    } catch (error) { err(error); }
  }
  function Settings() {
    const React = vendetta.metro.common && vendetta.metro.common.React;
    const ReactNative = vendetta.metro.common && vendetta.metro.common.ReactNative;
    if (!React || !ReactNative || !ReactNative.View || !ReactNative.Text) return null;
    return React.createElement(ReactNative.ScrollView || ReactNative.View, { style: { flex: 1, padding: 16 } }, React.createElement(ReactNative.Text, { selectable: true, style: { color: "#ffffff", fontSize: 13 } }, JSON.stringify(diagnostic, null, 2)));
  }
  function onLoad() { diagnostic.loaded = true; probe(); try { console.log("[iOS26Emoji FAMILY PROBE]", diagnostic); } catch {} }
  return { onLoad, onUnload: () => {}, settings: Settings };
})()