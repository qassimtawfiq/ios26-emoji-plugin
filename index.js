((() => {
  "use strict";

  const patcher = vendetta.patcher;
  const metro = vendetta.metro;
  const ReactNative = metro.common?.ReactNative;
  const unpatches = [];
  const IOS_FONT_FAMILY = "iOS26Emoji";
  const IOS_FONT_URL = "https://github.com/qassimtawfiq/ios26-emoji-plugin/releases/download/v1.0/iOS.26.4.Unicode.17.ttf";
  const EMOJI_ONLY = /^(?:\p{Emoji}|\u200d|\ufe0e|\ufe0f|\u20e3)+$/u;

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

  const RNChatModule = getNativeModule("NativeChatModule", "DCDChatManager");

  function patchRows(callback) {
    return patcher.before("updateRows", RNChatModule, (args) => {
      const rows = JSON.parse(args[1]);
      try {
        callback(rows);
      } catch (error) {
        console.error("[iOS26Emoji] Failed to patch message rows", error);
      }
      args[1] = JSON.stringify(rows);
    });
  }

  function iterate(rows) {
    const content = [];
    let header;

    for (const original of rows) {
      let row = original;
      if (row.type === "emoji") row = { type: "text", content: row.surrogate };
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

  function loadIosFont() {
    ReactNative?.Font?.loadAsync?.({
      [IOS_FONT_FAMILY]: { uri: IOS_FONT_URL },
    });
  }

  function isEmojiOnly(value) {
    return typeof value === "string" && value.trim().length > 0 && EMOJI_ONLY.test(value.trim());
  }

  function patchEmojiText() {
    if (!ReactNative?.Text) throw new Error("React Native Text module was not found");

    return patcher.before("render", ReactNative.Text, ([props]) => {
      if (!props) return;
      const children = Array.isArray(props.children) ? props.children : [props.children];
      if (!children.some(isEmojiOnly)) return;

      const flattened = ReactNative.StyleSheet?.flatten?.(props.style) || {};
      props.style = { ...flattened, fontFamily: IOS_FONT_FAMILY };
    });
  }

  function onLoad() {
    try {
      unpatches.push(patchRows((rows) => {
        for (const row of rows) {
          if (row.type === 1 && row.message?.content) {
            row.message.content = iterate(row.message.content);
          }
        }
      }));
    } catch (error) {
      console.error("[iOS26Emoji] Failed to install row patch", error);
    }

    try {
      loadIosFont();
      unpatches.push(patchEmojiText());
      console.log("[iOS26Emoji] Loaded Bunny row logic with a scoped iOS emoji font.");
    } catch (error) {
      console.error("[iOS26Emoji] Failed to install scoped iOS emoji font", error);
    }
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

  return { onLoad, onUnload };
})())
