((() => {
  "use strict";
  const patcher = vendetta.patcher;
  const metro = vendetta.metro;
  const diagnostic = { loaded: false, bridge: "not checked", updateRowsCalls: 0, rowsSeen: 0, messagesSeen: 0, emojiSeen: 0, sampleTypes: [], resolverFound: false, resolverCalls: 0, errors: [] };
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
        const unpatch = patcher.before("getEmojiURL", emojiModule, () => { diagnostic.resolverCalls++; });
        if (typeof unpatch === "function") unpatches.push(unpatch);
      }
    } catch (error) { recordError(error); }
  }
  function onLoad() {
    diagnostic.loaded = true;
    try { installProbe(); } catch (error) { recordError(error); }
    try { inspectResolver(); } catch (error) { recordError(error); }
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
