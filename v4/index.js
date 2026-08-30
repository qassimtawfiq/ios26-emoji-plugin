((() => {
  "use strict";

  const patcher = vendetta.patcher;
  const metro = vendetta.metro;
  const BASE_URL = "https://raw.githubusercontent.com/qassimtawfiq/ios26-emoji-plugin/main/emoji/";
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

  const RNChatModule = getNativeModule("NativeChatModule", "DCDChatManager");

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

  function replaceEmojiRow(row) {
    const codepoints = codepointsFor(row.surrogate);
    const src = assetUrlForCodepoints(codepoints);
    if (!src) return { type: "text", content: row.surrogate };

    const name = discordEmojiNameFor(row.surrogate);
    return {
      type: "customEmoji",
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
    if (!emojiModule || typeof emojiModule.getEmojiURL !== "function") return;

    return patcher.after("getEmojiURL", emojiModule, ([emoji], result) => {
      if (emoji?.src?.startsWith?.(BASE_URL)) return emoji.src;
      if (emoji?.frozenSrc?.startsWith?.(BASE_URL)) return emoji.frozenSrc;
      if (emoji?.[2]?.startsWith?.(BASE_URL)) return emoji[2];
      if (emoji?.[3]?.startsWith?.(BASE_URL)) return emoji[3];
      return result;
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
      const emojiUrlPatch = patchEmojiUrlResolver();
      if (emojiUrlPatch) unpatches.push(emojiUrlPatch);
      console.log("[iOS26Emoji] Loaded. Rendering Unicode emojis as iOS 26 PNGs.");
    } catch (error) {
      console.error("[iOS26Emoji] Failed to install PNG emoji patches", error);
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
