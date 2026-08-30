((() => {
  "use strict";

  const patcher = vendetta.patcher;
  const metro = vendetta.metro;
  const BASE_URL = "https://raw.githubusercontent.com/qassimtawfiq/ios26-emoji-plugin/main/emoji/";
  const patches = [];

  function findEmojiModule() {
    try {
      return metro.findByProps("getEmojiURL");
    } catch {
      return null;
    }
  }

  function iosAssetUrl(result) {
    if (typeof result !== "string") return null;

    const match = result.match(/(?:emoji[_-])([0-9a-f]+(?:[-_][0-9a-f]+)*)\.png(?:[?#].*)?$/i);
    if (!match) return null;

    const codepoints = match[1].toLowerCase().replace(/_/g, "-");
    const filename = "emoji-" + codepoints + ".png";
    const group = codepoints.split("-")[0].slice(0, 4);
    return BASE_URL + group + "/" + filename;
  }

  function onLoad() {
    const emojiModule = findEmojiModule();
    if (!emojiModule || typeof emojiModule.getEmojiURL !== "function") {
      console.error("[iOS26Emoji] Discord emoji URL module was not found");
      return;
    }

    patches.push(
      patcher.after("getEmojiURL", emojiModule, (_args, result) => {
        return iosAssetUrl(result) || result;
      }),
    );

    console.log("[iOS26Emoji] Loaded. Using iOS 26 emoji images without changing text fonts.");
  }

  function onUnload() {
    for (const unpatch of patches.splice(0)) {
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
