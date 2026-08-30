((()=>{
var $ = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // vendetta:@vendetta/patcher
  var require_patcher = __commonJS({
    "vendetta:@vendetta/patcher"(exports, module) {
      module.exports = vendetta.patcher;
    }
  });

  // vendetta:@vendetta/metro
  var require_metro = __commonJS({
    "vendetta:@vendetta/metro"(exports, module) {
      module.exports = vendetta.metro;
    }
  });

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    onLoad: () => onLoad,
    onUnload: () => onUnload
  });
  var import_patcher = __toESM(require_patcher());
  var import_metro = __toESM(require_metro());
  var GITHUB_USER = "qassimtawfiq";
  var GITHUB_REPO = "ios26-emoji-plugin";
  var BRANCH = "ios26_plugin";
  function getIos26Url(hexCode) {
    const code = hexCode.replace(/-/g, "_");
    return `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${BRANCH}/emoji_u${code}.png`;
  }
  var EmojiModule = (0, import_metro.findByProps)("getEmojiURL");
  var patches = [];
  function onLoad() {
    if (!EmojiModule) {
      console.error("[iOS26Emoji] EmojiModule not found!");
      return;
    }
    patches.push(
      (0, import_patcher.after)("getEmojiURL", EmojiModule, (args, res) => {
        if (!res || typeof res !== "string") return res;
        const match = res.match(/emoji[_-]([0-9a-f-]+)\.png/i);
        if (!match) return res;
        const hexCode = match[1];
        const ios26url = getIos26Url(hexCode);
        return ios26url;
      })
    );
    console.log("[iOS26Emoji] Loaded \u2713");
  }
  function onUnload() {
    patches.forEach((p) => p());
    patches.length = 0;
    console.log("[iOS26Emoji] Unloaded");
  }
  return __toCommonJS(index_exports);
})();
return $;})());
