((() => {
  "use strict";

  const patcher = vendetta.patcher;
  const metro = vendetta.metro;
  const RNChatModule = getNativeModule("NativeChatModule", "DCDChatManager");
  const BASE_URL = "https://qassimtawfiq.github.io/ios26-emoji-plugin/emoji/";
  const unpatches = [];

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
    if (!RNChatModule || typeof RNChatModule.updateRows !== "function") {
      throw new Error("Discord chat row module was not found");
    }

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

  function codepointsFor(value) {
    return Array.from(value)
      .map((character) => character.codePointAt(0).toString(16))
      .join("-");
  }

  function iosAssetUrl(surrogate) {
    if (typeof surrogate !== "string" || surrogate.length === 0) return null;

    const codepoints = codepointsFor(surrogate);
    const group = codepoints.split("-")[0].slice(0, 4);
    return BASE_URL + group + "/emoji-" + codepoints + ".png";
  }

  function replaceEmojiRow(row) {
    const src = iosAssetUrl(row.surrogate);
    if (!src) return { type: "text", content: row.surrogate };

    return {
      type: "customEmoji",
      id: "ios26-" + codepointsFor(row.surrogate),
      alt: row.surrogate,
      src,
      frozenSrc: src,
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

  function onLoad() {
    try {
      unpatches.push(patchRows((rows) => {
        for (const row of rows) {
          if (row.type === 1 && row.message?.content) {
            row.message.content = iterate(row.message.content);
          }
        }
      }));
      console.log("[iOS26Emoji] Loaded. Replacing emoji rows with iOS 26 PNGs.");
    } catch (error) {
      console.error("[iOS26Emoji] Failed to install PNG row patch", error);
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
