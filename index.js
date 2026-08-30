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

  // vendetta:@vendetta/metro
  var require_metro = __commonJS({
    "vendetta:@vendetta/metro"(exports, module) {
      module.exports = vendetta.metro;
    }
  });

  // vendetta:@vendetta/patcher
  var require_patcher = __commonJS({
    "vendetta:@vendetta/patcher"(exports, module) {
      module.exports = vendetta.patcher;
    }
  });

  // vendetta:@vendetta/metro/common
  var require_common = __commonJS({
    "vendetta:@vendetta/metro/common"(exports, module) {
      module.exports = vendetta.metro.common;
    }
  });

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    onLoad: () => onLoad,
    onUnload: () => onUnload
  });
  var import_metro = __toESM(require_metro());
  var import_patcher = __toESM(require_patcher());
  var import_common = __toESM(require_common());
  var FONT_URL = "https://github.com/qassimtawfiq/ios26-emoji-plugin/releases/download/v1.0/iOS.26.4.Unicode.17.ttf";
  var FONT_FAMILY = "iOS26Emoji";
  var MessageMarkupRenderer = (0, import_metro.findByProps)("renderMessageMarkupToAST");
  var EMOJI_RE = /\p{Emoji}/u;
  var patches = [];
  function onLoad() {
    try {
      import_common.ReactNative.Font?.loadAsync?.({ [FONT_FAMILY]: { uri: FONT_URL } });
    } catch (e) {
    }
    patches.push((0, import_patcher.after)(
      "renderMessageMarkupToAST",
      MessageMarkupRenderer,
      (_, ret) => {
        const branch = (x, isHeading) => {
          const jumboableChain = [];
          const content = [];
          for (const y of x.content) {
            const guh = y.type === "emoji" ? { type: "text", content: y.surrogate } : y;
            if (Array.isArray(y.content)) guh.content = branch(y, true);
            if ((y.type === "emoji" || y.type === "customEmoji" || y.type === "text" && y.content?.match(/^\s*$/)) && y.jumboable && !isHeading) {
              if (y.type !== "text") {
                delete guh.jumboable;
                jumboableChain.push(guh);
              }
            } else {
              if (jumboableChain.length > 0)
                content.push({ type: "heading", level: 1, content: jumboableChain });
              jumboableChain.length = 0;
              content.push(guh);
            }
          }
          if (jumboableChain.length > 0)
            content.push({ type: "heading", level: 1, content: jumboableChain });
          return content;
        };
        ret.content = branch(ret, false);
      }
    ));
    patches.push((0, import_patcher.before)("render", import_common.ReactNative.Text, ([props]) => {
      if (!props) return;
      const hasEmoji = (s) => typeof s === "string" && EMOJI_RE.test(s);
      if (Array.isArray(props.children) ? props.children.some(hasEmoji) : hasEmoji(props.children)) {
        props.style = { ...import_common.ReactNative.StyleSheet.flatten(props.style) || {}, fontFamily: FONT_FAMILY };
      }
    }));
  }
  function onUnload() {
    patches.forEach((p) => p());
    patches.length = 0;
  }
  return __toCommonJS(index_exports);
})();
return $;})());
