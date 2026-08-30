((() => {
  "use strict";

  const patcher = vendetta.patcher;
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

  function onLoad() {
    try {
      unpatches.push(patchRows((rows) => {
        for (const row of rows) {
          if (row.type === 1 && row.message?.content) {
            row.message.content = iterate(row.message.content);
          }
        }
      }));

      console.log("[iOS26Emoji] Loaded. Using Bunny-compatible system emoji row logic.");
    } catch (error) {
      console.error("[iOS26Emoji] Failed to load", error);
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
