(function(plugin, patcher, storage, common) {
  "use strict";

  const { React, ReactNative } = common;

  const PACKS = {
    default: {
      title: "Default (Discord)",
      format: e => `asset:/emoji-${e}.png`,
      joiner: "-"
    },
    ios26: {
      title: "iOS 26 (iPhone)",
      format: e => `https://raw.githubusercontent.com/qassimtawfiq/My-custom-theme-/ios26_plugin/emoji_u${e}.png`,
      joiner: "_",
      maintainer: "Apple"
    },
    apple: {
      title: "Apple (iOS 17.4)",
      format: e => `https://raw.githubusercontent.com/zhdsmy/apple-emoji/ios-17.4/png/160/emoji_u${e}.png`,
      joiner: "_",
      maintainer: "zhdsmy"
    },
    twemoji: {
      title: "Twemoji",
      format: e => `https://raw.githubusercontent.com/jdecked/twemoji/main/assets/72x72/${e}.png`,
      joiner: "-",
      maintainer: "jdecked",
      excludeVariation: true
    }
  };

  const store = storage.storage;

  function getPack() {
    return PACKS[store.emojipack] ?? PACKS.ios26;
  }

  function toHex(emoji) {
    const pack = getPack();
    let codes = Array.from(emoji).map(c => c.codePointAt(0).toString(16)).filter(Boolean);
    if (pack.excludeVariation) codes = codes.filter(c => c !== "fe0f");
    return codes.join(pack.joiner);
  }

  function getUrl(emoji) {
    return getPack().format(toHex(emoji));
  }

  const EMOJI_RE = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu;

  function splitEmoji(text, render) {
    const parts = text.split(EMOJI_RE);
    const out = [];
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        if (parts[i]) out.push(parts[i]);
      } else {
        out.push(render(parts[i]));
      }
    }
    return out;
  }

  function EmojiImage({ emoji, size = 16 }) {
    return React.createElement(ReactNative.Image, {
      source: { uri: getUrl(emoji) },
      style: { width: size, height: size },
      resizeMode: "contain",
      fadeDuration: 0,
      vanilla: true
    });
  }

  const unpatchList = [];

  plugin.onLoad = function() {
    if (!PACKS[store.emojipack]) store.emojipack = "ios26";

    unpatchList.push(
      patcher.instead("Image", ReactNative, (args, orig) => {
        const newArgs = args.slice();
        const props = newArgs[0];
        if (!props || props.vanilla) return orig(...newArgs);
        const { source } = props;
        if (source?.uri?.startsWith("asset:/emoji-")) {
          const code = source.uri.replace("asset:/emoji-", "").replace(".png", "");
          newArgs[0] = { ...props, source: { ...source, uri: getUrl(code) } };
        }
        return orig(...newArgs);
      })
    );

    unpatchList.push(
      patcher.instead("Text", ReactNative, (args, orig) => {
        const newArgs = args.slice();
        const props = newArgs[0];
        if (!props) return orig(...newArgs);
        const style = ReactNative.StyleSheet.flatten(props.style) ?? {};
        const size = style.fontSize ?? 16;
        const render = e => React.createElement(EmojiImage, { emoji: e, size });
        let children;
        if (Array.isArray(props.children)) {
          children = props.children.flatMap(c => typeof c === "string" ? splitEmoji(c, render) : [c]);
        } else if (typeof props.children === "string") {
          children = splitEmoji(props.children, render);
        } else {
          children = props.children;
        }
        newArgs[0] = { ...props, children };
        return orig(...newArgs);
      })
    );
  };

  plugin.onUnload = function() {
    unpatchList.forEach(fn => fn());
    unpatchList.length = 0;
  };

  plugin.settings = function Settings() {
    const [, refresh] = React.useState(0);
    return React.createElement(
      ReactNative.ScrollView,
      null,
      React.createElement(
        ReactNative.View,
        { style: { padding: 16 } },
        React.createElement(ReactNative.Text, {
          style: { color: "#fff", fontSize: 16, fontWeight: "bold", marginBottom: 12 }
        }, "Emoji Pack"),
        Object.keys(PACKS).map(key =>
          React.createElement(
            ReactNative.TouchableOpacity,
            {
              key,
              onPress: () => { store.emojipack = key; refresh(n => n + 1); },
              style: {
                flexDirection: "row",
                alignItems: "center",
                padding: 12,
                marginBottom: 8,
                backgroundColor: store.emojipack === key ? "#5865F2" : "#2B2D31",
                borderRadius: 8
              }
            },
            React.createElement(ReactNative.Text, {
              style: { color: "#fff", fontSize: 15, flex: 1 }
            }, PACKS[key].title),
            PACKS[key].maintainer && React.createElement(ReactNative.Text, {
              style: { color: "#B5BAC1", fontSize: 13 }
            }, PACKS[key].maintainer)
          )
        )
      )
    );
  };

})(
  typeof plugin !== "undefined" ? plugin : {},
  revenge.patcher,
  revenge.storage,
  revenge.metro.common
);
