((() => {
  "use strict";

  const patcher = vendetta.patcher;
  const metro = vendetta.metro;
  const unpatches = [];

  function findChatModule() {
    try {
      const nativeModuleProxy = window.nativeModuleProxy;

      return (
        globalThis.__turboModuleProxy?.("NativeChatModule") ||
        globalThis.__turboModuleProxy?.("DCDChatManager") ||
        nativeModuleProxy?.NativeChatModule ||
        nativeModuleProxy?.DCDChatManager
      );
    } catch {
      return null;
    }
  }

  function patchRows(callback) {
    const chatModule = findChatModule() || metro.findByProps("updateRows");

    if (!chatModule || typeof chatModule.updateRows !== "function") {
      throw new Error("Discord chat row module was not found");
    }

    return patcher.before("updateRows", chatModule, (args) => {
      if (typeof args[1] !== "string") return;

      try {
        const rows = JSON.parse(args[1]);
        callback(rows);
        args[1] = JSON.stringify(rows);
      } catch (error) {
        console.error("[iOS26Emoji] Failed to patch message rows", error);
      }
    });
  }

  function iterate(rows) {
    const content = [];
    let jumboHeading;

    for (const original of rows) {
      let row = original;

      // Convert Discord's Twemoji row into Unicode text. The active
      // AppleMFFMColorEmoji font will render the iOS glyph.
      if (row.type === "emoji") {
        row = {
          type: "text",
          content: row.surrogate,
        };
      }

      if ("content" in row && Array.isArray(row.content)) {
        row.content = iterate(row.content);
      }

      if ("items" in row && Array.isArray(row.items)) {
        row.items = iterate(row.items);
      }

      if (original.jumboable && !jumboHeading) {
        jumboHeading = {
          type: "heading",
          level: 1,
          content: [],
        };
      }

      if (
        (original.type === "emoji" || original.type === "customEmoji") &&
        !original.jumboable &&
        jumboHeading
      ) {
        content.push(jumboHeading);
        jumboHeading = undefined;
      }

      if (jumboHeading) jumboHeading.content.push(row);
      else content.push(row);
    }

    if (jumboHeading) content.push(jumboHeading);
    return content;
  }

  function onLoad() {
    try {
      unpatches.push(
        patchRows((rows) => {
          for (const row of rows) {
            if (row.type === 1 && row.message?.content) {
              row.message.content = iterate(row.message.content);
            }
          }
        }),
      );

      console.log("[iOS26Emoji] Loaded. Using the selected iOS emoji font.");
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

  return {
    onLoad,
    onUnload,
  };
})())