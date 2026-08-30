(()=>{var $={};

// simulate @vendetta/metro/common -> vendetta.metro.common
var _common = vendetta.metro.common;
var React = _common.React;
var ReactNative = _common.ReactNative;

// simulate @vendetta/plugin -> vendetta.plugin
var _plugin = vendetta.plugin;
var storage = _plugin.storage;

// simulate @vendetta/patcher -> vendetta.patcher
var patcher = vendetta.patcher;

var PACKS = {
  default: {
    title: "Default (Discord)",
    format: function(e) { return "asset:/emoji-" + e + ".png"; },
    joiner: "-"
  },
  ios26: {
    title: "iOS 26 (iPhone)",
    format: function(e) { return "https://raw.githubusercontent.com/qassimtawfiq/My-custom-theme-/ios26_plugin/emoji_u" + e + ".png"; },
    joiner: "_",
    maintainer: "Apple"
  },
  apple: {
    title: "Apple (iOS 17.4)",
    format: function(e) { return "https://raw.githubusercontent.com/zhdsmy/apple-emoji/ios-17.4/png/160/emoji_u" + e + ".png"; },
    joiner: "_",
    maintainer: "zhdsmy"
  },
  twemoji: {
    title: "Twemoji",
    format: function(e) { return "https://raw.githubusercontent.com/jdecked/twemoji/main/assets/72x72/" + e + ".png"; },
    joiner: "-",
    maintainer: "jdecked",
    excludeVariation: true
  }
};

function getPack() {
  return PACKS[storage.emojipack] || PACKS.ios26;
}

function toHex(emoji) {
  var pack = getPack();
  var codes = Array.from(emoji).map(function(c) { return c.codePointAt(0).toString(16); }).filter(Boolean);
  if (pack.excludeVariation) codes = codes.filter(function(c) { return c !== "fe0f"; });
  return codes.join(pack.joiner);
}

function getUrl(emoji) {
  return getPack().format(toHex(emoji));
}

var EMOJI_RE = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu;

function splitEmoji(text, render) {
  var parts = text.split(EMOJI_RE);
  var out = [];
  for (var i = 0; i < parts.length; i++) {
    if (i % 2 === 0) { if (parts[i]) out.push(parts[i]); }
    else out.push(render(parts[i]));
  }
  return out;
}

function EmojiImage(props) {
  return React.createElement(ReactNative.Image, {
    source: { uri: getUrl(props.emoji) },
    style: { width: props.size || 16, height: props.size || 16 },
    resizeMode: "contain",
    fadeDuration: 0,
    vanilla: true
  });
}

var unpatchList = [];

$.onLoad = function() {
  if (!PACKS[storage.emojipack]) storage.emojipack = "ios26";

  unpatchList.push(
    patcher.instead("Image", ReactNative, function(args, orig) {
      var newArgs = args.slice();
      var props = newArgs[0];
      if (!props || props.vanilla) return orig.apply(null, newArgs);
      var source = props.source;
      if (source && source.uri && source.uri.startsWith("asset:/emoji-")) {
        var code = source.uri.replace("asset:/emoji-", "").replace(".png", "");
        newArgs[0] = Object.assign({}, props, { source: Object.assign({}, source, { uri: getUrl(code) }) });
      }
      return orig.apply(null, newArgs);
    })
  );

  unpatchList.push(
    patcher.instead("Text", ReactNative, function(args, orig) {
      var newArgs = args.slice();
      var props = newArgs[0];
      if (!props) return orig.apply(null, newArgs);
      var style = ReactNative.StyleSheet.flatten(props.style) || {};
      var size = style.fontSize || 16;
      var render = function(e) { return React.createElement(EmojiImage, { emoji: e, size: size }); };
      var children;
      if (Array.isArray(props.children)) {
        children = [];
        for (var i = 0; i < props.children.length; i++) {
          var c = props.children[i];
          if (typeof c === "string") children = children.concat(splitEmoji(c, render));
          else children.push(c);
        }
      } else if (typeof props.children === "string") {
        children = splitEmoji(props.children, render);
      } else {
        children = props.children;
      }
      newArgs[0] = Object.assign({}, props, { children: children });
      return orig.apply(null, newArgs);
    })
  );
};

$.onUnload = function() {
  unpatchList.forEach(function(fn) { fn(); });
  unpatchList.length = 0;
};

$.settings = function Settings() {
  var state = React.useState(0);
  var refresh = state[1];
  return React.createElement(
    ReactNative.ScrollView, null,
    React.createElement(
      ReactNative.View, { style: { padding: 16 } },
      React.createElement(ReactNative.Text, {
        style: { color: "#fff", fontSize: 16, fontWeight: "bold", marginBottom: 12 }
      }, "Emoji Pack"),
      Object.keys(PACKS).map(function(key) {
        return React.createElement(
          ReactNative.TouchableOpacity, {
            key: key,
            onPress: function() { storage.emojipack = key; refresh(function(n) { return n + 1; }); },
            style: {
              flexDirection: "row", alignItems: "center", padding: 12,
              marginBottom: 8,
              backgroundColor: storage.emojipack === key ? "#5865F2" : "#2B2D31",
              borderRadius: 8
            }
          },
          React.createElement(ReactNative.Text, { style: { color: "#fff", fontSize: 15, flex: 1 } }, PACKS[key].title),
          PACKS[key].maintainer && React.createElement(ReactNative.Text, { style: { color: "#B5BAC1", fontSize: 13 } }, PACKS[key].maintainer)
        );
      })
    )
  );
};

return $;})();
