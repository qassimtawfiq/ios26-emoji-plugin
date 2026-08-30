(()=>{
"use strict";
var $=(()=>{
var __defProp=Object.defineProperty;
var __getOwnPropNames=Object.getOwnPropertyNames;
var __export=(target,all)=>{for(var name in all)__defProp(target,name,{get:all[name],enumerable:!0})};
var __toCommonJS=mod=>Object.assign(__defProp({},"__esModule",{value:!0}),mod);

var src_exports={};
__export(src_exports,{onLoad:()=>onLoad,onUnload:()=>onUnload});

var FONT_URL="https://github.com/qassimtawfiq/ios26-emoji-plugin/releases/download/v1.0/iOS.26.4.Unicode.17.ttf";
var FONT_FAMILY="iOS26Emoji";
var styleTag=null;

function onLoad(){
  try {
    // طريقة 1: ReactNative loadFont
    var RN=vendetta.metro.common.ReactNative;
    if(RN&&RN.Platform&&RN.Platform.OS==="android"){
      // inject font via StyleSheet on Android
      injectFontAndroid();
    } else {
      injectFontAndroid();
    }
  } catch(e){
    console.error("[ios26emoji] onLoad error:",e);
  }
}

function injectFontAndroid(){
  try {
    var metro=vendetta.metro;
    
    // ابحث عن Font loader
    var FontLoader=metro.findByProps("loadFont","FontFamilyName");
    if(FontLoader&&FontLoader.loadFont){
      FontLoader.loadFont({
        fontFamily:FONT_FAMILY,
        file:{uri:FONT_URL}
      });
      console.log("[ios26emoji] loaded via FontLoader");
    }

    // patch Text عشان يستخدم الـ font للإيموجيات
    var patcher=vendetta.patcher;
    var RN=vendetta.metro.common.ReactNative;
    var React=vendetta.metro.common.React;

    window.__ios26_unpatch=patcher.before("render",RN.Text,([props])=>{
      if(!props||!props.children) return;
      var hasEmoji=false;
      var check=s=>typeof s==="string"&&/\p{Emoji}/u.test(s);
      if(typeof props.children==="string") hasEmoji=check(props.children);
      else if(Array.isArray(props.children)) hasEmoji=props.children.some(c=>check(c));
      if(hasEmoji){
        props.style=Object.assign({},RN.StyleSheet.flatten(props.style)||{},{fontFamily:FONT_FAMILY});
      }
    });

    console.log("[ios26emoji] Text patched");
  } catch(e){
    console.error("[ios26emoji] inject error:",e);
  }
}

function onUnload(){
  try{
    if(window.__ios26_unpatch){window.__ios26_unpatch();window.__ios26_unpatch=null;}
  }catch(e){}
}

return __toCommonJS(src_exports);
})();
return $;
})();
