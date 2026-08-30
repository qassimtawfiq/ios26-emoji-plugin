var vendetta_plugin = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
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
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    onLoad: () => onLoad,
    onUnload: () => onUnload,
    settings: () => settings,
    vstorage: () => vstorage
  });
  var import_patcher = __require("@revenge-mod/patcher");
  var import_storage2 = __require("@revenge-mod/storage");
  var import_common3 = __require("@revenge-mod/metro/common");

  // src/components/Settings.tsx
  var import_common = __require("@revenge-mod/metro/common");
  var import_storage = __require("@revenge-mod/storage");

  // src/stuff/packs.ts
  var emojiPacks = {
    default: {
      title: "Default (Discord)",
      format: (src) => `asset:/emoji-${src}.png`,
      joiner: "-"
    },
    ios26: {
      title: "iOS 26 (iPhone)",
      format: (src) => `https://raw.githubusercontent.com/qassimtawfiq/My-custom-theme-/ios26_plugin/emoji_u${src}.png`,
      joiner: "_",
      maintainer: "Apple"
    },
    apple: {
      title: "Apple (iOS 17.4)",
      format: (src) => `https://raw.githubusercontent.com/zhdsmy/apple-emoji/ios-17.4/png/160/emoji_u${src}.png`,
      joiner: "_",
      maintainer: "zhdsmy"
    },
    twemoji: {
      title: "Twemoji",
      format: (src) => `https://raw.githubusercontent.com/jdecked/twemoji/main/assets/72x72/${src}.png`,
      joiner: "-",
      maintainer: "jdecked",
      excludeVariation: true
    }
  };

  // src/components/Settings.tsx
  function Settings() {
    (0, import_storage.useStorageState)(vstorage);
    return /* @__PURE__ */ import_common.React.createElement(import_common.ReactNative.ScrollView, null, /* @__PURE__ */ import_common.React.createElement(import_common.ReactNative.View, { style: { padding: 16 } }, /* @__PURE__ */ import_common.React.createElement(import_common.ReactNative.Text, { style: { color: "#fff", fontSize: 16, fontWeight: "bold", marginBottom: 12 } }, "Emoji Pack"), Object.keys(emojiPacks).map((key) => /* @__PURE__ */ import_common.React.createElement(
      import_common.ReactNative.TouchableOpacity,
      {
        key,
        onPress: () => {
          vstorage.emojipack = key;
        },
        style: {
          flexDirection: "row",
          alignItems: "center",
          padding: 12,
          marginBottom: 8,
          backgroundColor: vstorage.emojipack === key ? "#5865F2" : "#2B2D31",
          borderRadius: 8
        }
      },
      /* @__PURE__ */ import_common.React.createElement(import_common.ReactNative.Text, { style: { color: "#fff", fontSize: 15, flex: 1 } }, emojiPacks[key].title),
      emojiPacks[key].maintainer && /* @__PURE__ */ import_common.React.createElement(import_common.ReactNative.Text, { style: { color: "#B5BAC1", fontSize: 13 } }, emojiPacks[key].maintainer)
    ))));
  }

  // src/stuff/parser.ts
  var rawRegex = /\p{Emoji_Presentation}|\p{Emoji}\uFE0F/gu;
  var regex = new RegExp(`(${rawRegex.source})`, rawRegex.flags);
  function getSrc(src) {
    return getPack().format(src);
  }
  function getPack() {
    return emojiPacks[vstorage.emojipack] ?? emojiPacks.default;
  }
  function convert(emoji, pack = getPack()) {
    if (!pack.joiner) return emoji;
    let chars = Array.from(emoji).map((x) => x.codePointAt(0)?.toString(16)).filter((x) => typeof x === "string");
    if (pack.excludeVariation) chars = chars.filter((x) => x !== "fe0f");
    return chars.join(pack.joiner);
  }
  function parse(text, callback) {
    const children = text.split(regex);
    for (let i = 1; i < children.length; i += 2) {
      children.splice(i, 1, callback(convert(children[i])));
    }
    return children;
  }

  // src/components/CustomTwemoji.tsx
  var import_common2 = __require("@revenge-mod/metro/common");
  function CustomTwemoji({
    emoji,
    src = getSrc(emoji),
    size = 16
  }) {
    return /* @__PURE__ */ React.createElement(
      import_common2.ReactNative.Image,
      {
        key: `emoji-${emoji}`,
        source: { uri: src },
        resizeMode: "contain",
        fadeDuration: 0,
        style: { height: size, width: size },
        vanilla: true
      }
    );
  }

  // src/index.ts
  var vstorage = import_storage2.storage;
  function onLoad() {
    if (!emojiPacks[vstorage.emojipack]) {
      vstorage.emojipack = "ios26";
    }
  }
  function onUnload() {
    const patches = [];
    patches.push(
      (0, import_patcher.instead)("Image", import_common3.ReactNative, (args, orig) => {
        const cloned = args.slice();
        const [x] = cloned;
        if (!x || x.vanilla) return orig(...cloned);
        const { source } = x;
        if (source?.uri?.startsWith("asset:/emoji-")) {
          cloned[0] = {
            ...x,
            source: {
              ...source,
              uri: getSrc(source.uri.split("-")[1].split(".")[0])
            }
          };
        }
        return orig(...cloned);
      })
    );
    patches.push(
      (0, import_patcher.instead)("Text", import_common3.ReactNative, (args, orig) => {
        const cloned = args.slice();
        const [x] = cloned;
        if (!x) return orig(...cloned);
        let children = [];
        const style = import_common3.ReactNative.StyleSheet.flatten(x.style) ?? {};
        const twemoji = (src) => import_common3.React.createElement(CustomTwemoji, {
          emoji: src,
          size: style.fontSize
        });
        if (Array.isArray(x.children)) {
          for (const c of x.children) {
            children.push(
              ...typeof c === "string" ? parse(c, twemoji) : [c]
            );
          }
        } else {
          children = typeof x.children === "string" ? parse(x.children, twemoji) : [x.children];
        }
        cloned[0] = { ...x, children };
        return orig(...cloned);
      })
    );
    return () => {
      for (const x of patches) x();
    };
  }
  var settings = Settings;
  return __toCommonJS(index_exports);
})();
