(()=>{
"use strict";var $=(()=>{var __create=Object.create;var __defProp=Object.defineProperty;var __getOwnPropDesc=Object.getOwnPropertyDescriptor;var __getOwnPropNames=Object.getOwnPropertyNames;var __getProtoOf=Object.getPrototypeOf,__hasOwnProp=Object.prototype.hasOwnProperty;var __esm=(fn,res)=>function(){return fn&&(res=(0,fn[__getOwnPropNames(fn)[0]])(fn=0)),res};var __commonJS=(cb,mod)=>function(){return mod||(0,cb[__getOwnPropNames(cb)[0]])((mod={exports:{}}).exports,mod),mod.exports};var __export=(target,all)=>{for(var name in all)__defProp(target,name,{get:all[name],enumerable:!0})},__copyProps=(to,from,except,desc)=>{if(from&&typeof from=="object"||typeof from=="function")for(var keys=__getOwnPropNames(from),i=0,n=keys.length,key;i<n;i++)key=keys[i],!__hasOwnProp.call(to,key)&&key!==except&&__defProp(to,key,{get:(k=>from[k]).bind(null,key),enumerable:!(desc=__getOwnPropDesc(from,key))||desc.enumerable});return to};var __toESM=(mod,isNodeMode,target)=>(target=mod!=null?__create(__getProtoOf(mod)):{},__copyProps(isNodeMode||!mod||!mod.__esModule?__defProp(target,"default",{value:mod,enumerable:!0}):target,mod)),__toCommonJS=mod=>__copyProps(__defProp({},"__esModule",{value:!0}),mod);

var require_patcher=__commonJS({"vendetta:@vendetta/patcher"(exports,module){module.exports=vendetta.patcher}});
var require_common=__commonJS({"vendetta:@vendetta/metro/common"(exports,module){module.exports=vendetta.metro.common}});
var require_metro=__commonJS({"vendetta:@vendetta/metro"(exports,module){module.exports=vendetta.metro}});

var src_exports={};
__export(src_exports,{onLoad:()=>onLoad,onUnload:()=>onUnload,settings:()=>settings});

var import_patcher=__toESM(require_patcher(),1);
var import_common=__toESM(require_common(),1);
var import_metro=__toESM(require_metro(),1);

// تحويل emoji إلى hex code
function emojiToHex(emoji) {
  return Array.from(emoji)
    .map(c => c.codePointAt(0).toString(16))
    .filter(x => x && x !== "fe0f")
    .join("_");
}

// iOS 26 URL
function getIos26Url(hex) {
  return "https://raw.githubusercontent.com/qassimtawfiq/My-custom-theme-/ios26_plugin/emoji_u" + hex + ".png";
}

// patchRows مثل nexpid بالضبط
function patchRows(callback) {
  var RNChatModule;
  try {
    var nmp = window.nativeModuleProxy;
    RNChatModule = globalThis.__turboModuleProxy?.("NativeChatModule")
      || globalThis.__turboModuleProxy?.("DCDChatManager")
      || nmp?.["NativeChatModule"]
      || nmp?.["DCDChatManager"];
  } catch(e) {}

  if (!RNChatModule) {
    // fallback: ابحث عن updateRows
    RNChatModule = import_metro.findByProps("updateRows");
  }

  return import_patcher.before("updateRows", RNChatModule, args => {
    var rows = JSON.parse(args[1]);
    try { callback(rows); } catch(e) { console.error("[ios26emoji]", e); }
    args[1] = JSON.stringify(rows);
  });
}

// الـ storage للإعدادات
var storage = vendetta.plugin.storage;

// iterate على الـ rows وبدّل emoji بـ image
function iterate(rows) {
  var content = [], header;
  for (var original of rows) {
    var row = original;
    
    if (row.type === "emoji") {
      // بدل ما نحوله لـ text، نحوله لـ image بـ iOS 26
      var hex = emojiToHex(row.surrogate);
      var url = getIos26Url(hex);
      row = {
        type: "image",
        src: url,
        width: 22,
        height: 22,
        alt: row.surrogate,
      };
    }

    if ("content" in row && Array.isArray(row.content)) row.content = iterate(row.content);
    if ("items" in row && Array.isArray(row.items)) row.items = iterate(row.items);

    if ("jumboable" in original && original.jumboable && !header) {
      header = { type: "heading", level: 1, content: [] };
    }
    if ((original.type === "emoji" || original.type === "customEmoji") && !original.jumboable && header) {
      content.push(header);
      header = void 0;
    }

    if (header) header.content.push(row);
    else content.push(row);
  }
  if (header) content.push(header);
  return content;
}

var unpatch = null;

function onLoad() {
  if (!storage.emojipack) storage.emojipack = "ios26";
  unpatch = patchRows(rows => {
    for (var row of rows) {
      if (row.type === 1 && row.message.content) {
        row.message.content = iterate(row.message.content);
      }
    }
  });
}

function onUnload() {
  if (unpatch) { unpatch(); unpatch = null; }
}

function settings() {
  var React = import_common.React;
  var RN = import_common.ReactNative;
  return React.createElement(
    RN.View, { style: { padding: 16 } },
    React.createElement(RN.Text, {
      style: { color: "#fff", fontSize: 16, fontWeight: "bold" }
    }, "iOS 26 Emoji Plugin"),
    React.createElement(RN.Text, {
      style: { color: "#B5BAC1", fontSize: 14, marginTop: 8 }
    }, "استبدال إيموجيات Discord بإيموجيات iOS 26")
  );
}

return __toCommonJS(src_exports);
})();
return $;})();
