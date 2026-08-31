(() => {
  "use strict";
  const diagnostic = { loaded: false, styleModuleFound: false, styleExportKeys: [], styleCount: 0, uniqueFamilies: [], styles: {}, emojiModuleFound: false, emojiModuleKeys: [], errors: [] };
  function err(error) { diagnostic.errors.push(String(error && (error.stack || error.message) || error).slice(0, 600)); }
  function probe() {
    try {
      const metro = vendetta.metro;
      let module;
      try { module = metro.findByProps && metro.findByProps("TextStyleSheet"); } catch (error) { err(error); }
      if (module) {
        diagnostic.styleModuleFound = true;
        diagnostic.styleExportKeys = Object.keys(module).slice(0, 80);
        const sheet = module.TextStyleSheet;
        if (sheet && typeof sheet === "object") {
          const families = [];
          for (const key of Object.keys(sheet)) {
            const value = sheet[key];
            if (!value || typeof value !== "object") continue;
            if (typeof value.fontFamily === "string") {
              diagnostic.styles[key] = { fontFamily: value.fontFamily, fontSize: value.fontSize, lineHeight: value.lineHeight };
              if (families.indexOf(value.fontFamily) === -1) families.push(value.fontFamily);
            }
          }
          diagnostic.styleCount = Object.keys(diagnostic.styles).length;
          diagnostic.uniqueFamilies = families;
        }
      }
      try {
        const emoji = metro.findByProps && metro.findByProps("getEmojiURL");
        diagnostic.emojiModuleFound = !!emoji;
        if (emoji) diagnostic.emojiModuleKeys = Object.keys(emoji).slice(0, 80);
      } catch (error) { err(error); }
    } catch (error) { err(error); }
  }
  function Settings() {
    const React = vendetta.metro.common && vendetta.metro.common.React;
    const ReactNative = vendetta.metro.common && vendetta.metro.common.ReactNative;
    if (!React || !ReactNative || !ReactNative.View || !ReactNative.Text) return null;
    return React.createElement(ReactNative.ScrollView || ReactNative.View, { style: { flex: 1, padding: 16 } }, React.createElement(ReactNative.Text, { selectable: true, style: { color: "#ffffff", fontSize: 13 } }, JSON.stringify(diagnostic, null, 2)));
  }
  function onLoad() { diagnostic.loaded = true; probe(); try { console.log("[iOS26Emoji TEXTSTYLE PROBE]", diagnostic); } catch {} }
  return { onLoad, onUnload: () => {}, settings: Settings };
})()