((() => {
  "use strict";

  const patcher = vendetta.patcher;
  const metro = vendetta.metro;
  const BASE_URL = "https://raw.githubusercontent.com/qassimtawfiq/ios26-emoji-plugin/main/emoji/";
  const unpatches = [];
  const IOS_URLS_BY_ID = Object.create(null);
  const diagnostic = { loaded: false, bridge: "unknown", updateRowsCalls: 0, rowsSeen: 0, messagesSeen: 0, emojiSeen: 0, emojiReplaced: 0, missingAssets: 0, resolverFound: false, resolverCalls: 0, resolverMapped: 0, lastCodepoints: "", lastAssetUrl: "", errors: [] };

  function diagnosticError(error) {
    const message = String(error?.stack || error?.message || error);
    diagnostic.errors.push(message.slice(0, 500));
    console.error("[iOS26Emoji] " + message);
  }

  function diagnosticReport() {
    return JSON.stringify(diagnostic, null, 2);
  }


  function getNativeModule(...names) {
    try {
      const nativeModuleProxy = window.nativeModuleProxy;
      for (const name of names) {
        if (globalThis.__turboModuleProxy) {
          const module = globalThis.__turboModuleProxy(name);
          if (module) return module;
        }
        if (nativeModuleProxy?.[name]) return nativeModuleProxy[name];
      }
    } catch {
      // Continue to the normal plugin error path if native lookup fails.
    }
    return undefined;
  }

  function patchRows(callback) {
    const ReactNative = metro.common?.ReactNative;
    const nativeModules = ReactNative?.NativeModules;
    const chatModule = nativeModules?.DCDChatManager || getNativeModule("NativeChatModule", "DCDChatManager");

    if (chatModule?.updateRows) {
      diagnostic.bridge = nativeModules?.DCDChatManager ? "ReactNative.NativeModules.DCDChatManager" : "nativeModuleProxy DCDChatManager";
      return patcher.before("updateRows", chatModule, (args) => {
        try {
          diagnostic.updateRowsCalls++;
          const parsed = JSON.parse(args[1]);
          const rows = Array.isArray(parsed) ? parsed : parsed?.rows;
          if (!Array.isArray(rows)) return;
          diagnostic.rowsSeen += rows.length;
          callback(rows);
          args[1] = JSON.stringify(Array.isArray(parsed) ? rows : { ...parsed, rows });
        } catch (error) {
          console.error("[iOS26Emoji] Failed to patch message rows", error);
        }
      });
    }

    const rowManager = metro.findByName?.("RowManager", false);
    if (rowManager?.prototype?.generate) {
      diagnostic.bridge = "RowManager.generate";
      return patcher.after("generate", rowManager.prototype, (_args, row) => {
        try {
          callback([row]);
        } catch (error) {
          console.error("[iOS26Emoji] Failed to patch generated message row", error);
        }
      });
    }

    diagnostic.bridge = "not found";
    throw new Error("Discord chat row module was not found");
  }

  function discordEmojiNameFor(surrogate) {
    try {
      const unicodeModule = metro.findByProps?.("convertSurrogateToName");
      const name = unicodeModule?.convertSurrogateToName?.(surrogate, false);
      if (typeof name === "string" && name.length > 0) return name;
    } catch {
      // Keep the Unicode surrogate as the accessible label if lookup is unavailable.
    }
    return surrogate;
  }

  function codepointsFor(value) {
    return Array.from(value)
      .map((character) => character.codePointAt(0).toString(16))
      .join("-");
  }

  function assetUrlForCodepoints(codepoints) {
    if (!codepoints) return null;
    const group = codepoints.split("-")[0].slice(0, 4);
    return BASE_URL + group + "/emoji-" + codepoints + ".png";
  }

  function iosAssetUrl(surrogate) {
    if (typeof surrogate !== "string" || surrogate.length === 0) return null;
    return assetUrlForCodepoints(codepointsFor(surrogate));
  }

  function syntheticIdFor(codepoints) {
    let hash = 2166136261;
    for (const character of codepoints) {
      hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
    }
    return String(900000000000000000 + hash);
  }

  function replaceEmojiRow(row) {
    const codepoints = codepointsFor(row.surrogate);
    const src = assetUrlForCodepoints(codepoints);
    diagnostic.emojiSeen++;
    diagnostic.lastCodepoints = codepoints;
    diagnostic.lastAssetUrl = src || "missing";
    if (!src) { diagnostic.missingAssets++; return { type: "text", content: row.surrogate }; }

    const name = discordEmojiNameFor(row.surrogate);
    diagnostic.emojiReplaced++;
    const id = syntheticIdFor(codepoints);
    IOS_URLS_BY_ID[id] = src;
    return {
      type: "customEmoji",
      id,
      name,
      alt: name,
      src,
      frozenSrc: src,
      2: src,
      3: src,
      ...(row.jumboable ? { jumboable: true } : {}),
    };
  }

  function iterate(rows) {
    const content = [];
    let header;

    for (const original of rows) {
      let row = original;
      if (row.type === "emoji") row = replaceEmojiRow(row);
      if ("content" in row && Array.isArray(row.content)) row.content = iterate(row.content);
      if ("items" in row && Array.isArray(row.items)) row.items = iterate(row.items);

      if ("jumboable" in original && original.jumboable && !header) {
        header = { type: "heading", level: 1, content: [] };
      }
      if (
        (original.type === "emoji" || original.type === "customEmoji") && !original.jumboable
        && header
      ) {
        content.push(header);
        header = undefined;
      }

      if (header) header.content.push(row);
      else content.push(row);
    }

    if (header) content.push(header);
    return content;
  }

  function patchEmojiUrlResolver() {
    const emojiModule = metro.findByProps?.("getEmojiURL");
    if (!emojiModule || typeof emojiModule.getEmojiURL !== "function") return null;
    diagnostic.resolverFound = true;

    const before = patcher.before("getEmojiURL", emojiModule, (args) => {
      diagnostic.resolverCalls++;
      const emoji = args[0];
      const src = emoji?.id && IOS_URLS_BY_ID[String(emoji.id)];
      if (src && emoji && typeof emoji === "object") {
        args[0] = { ...emoji, src, frozenSrc: src, 2: src, 3: src };
      }
    });
    const after = patcher.after("getEmojiURL", emojiModule, ([emoji], result) => {
      const mapped = emoji?.id && IOS_URLS_BY_ID[String(emoji.id)];
      if (mapped) { diagnostic.resolverMapped++; return mapped; }
      if (emoji?.src?.startsWith?.(BASE_URL)) return emoji.src;
      if (emoji?.frozenSrc?.startsWith?.(BASE_URL)) return emoji.frozenSrc;
      if (emoji?.[2]?.startsWith?.(BASE_URL)) return emoji[2];
      if (emoji?.[3]?.startsWith?.(BASE_URL)) return emoji[3];
      return result;
    });
    return () => { before(); after(); };
  }

  function onLoad() {
    try {
      unpatches.push(patchRows((rows) => {
        diagnostic.messagesSeen += rows.filter((row) => row?.type === 1 && row.message?.content).length;
        for (const row of rows) {
          if (row.type === 1 && row.message?.content) row.message.content = iterate(row.message.content);
        }
      }));
      const emojiUrlPatch = patchEmojiUrlResolver();
      if (emojiUrlPatch) unpatches.push(emojiUrlPatch);
      diagnostic.loaded = true;
      console.log("[iOS26Emoji] Loaded with diagnostics");
    } catch (error) { diagnosticError(error); }
  }

  function showDiagnostics() {
    const report = diagnosticReport();
    try {
      if (metro.common?.ReactNative?.Alert?.alert) { metro.common.ReactNative.Alert.alert("iOS26 Emoji diagnostics", report); return; }
    } catch (error) { diagnosticError(error); }
    try { vendetta.ui?.toasts?.showToast?.(report.slice(0, 900), "iOS26"); } catch {}
  }

  function Settings() {
    const React = metro.common?.React; const ReactNative = metro.common?.ReactNative;
    if (!React || !ReactNative?.View) return null;
    const Button = ReactNative.Pressable || ReactNative.TouchableOpacity || ReactNative.Button;
    const child = ReactNative.Text ? React.createElement(ReactNative.Text, { style: { color: "#ffffff", padding: 14 } }, "Show diagnostic report") : "Show diagnostic report";
    return React.createElement(ReactNative.View, { style: { padding: 16 } },
      ReactNative.Text ? React.createElement(ReactNative.Text, { style: { color: "#aaaaaa", marginBottom: 12 } }, "Open this after visiting a channel.") : null,
      React.createElement(Button, { onPress: showDiagnostics, style: { backgroundColor: "#5865f2", borderRadius: 8 } }, child));
  }

  function onUnload() {
    for (const unpatch of unpatches.splice(0)) {
      try {
        unpatch();
      } catch (error) {
        console.error("[iOS26Emoji] Failed to remove patch", error);
      }
    }
    console.log("[iOS26Emoji] Unloaded.");
  }

  return { onLoad, onUnload, settings: Settings };
})())
