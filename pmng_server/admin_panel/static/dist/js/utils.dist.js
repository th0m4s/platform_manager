!function(t){var e={};function o(n){if(e[n])return e[n].exports;var r=e[n]={i:n,l:!1,exports:{}};return t[n].call(r.exports,r,r.exports,o),r.l=!0,r.exports}o.m=t,o.c=e,o.d=function(t,e,n){o.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:n})},o.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},o.t=function(t,e){if(1&e&&(t=o(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var n=Object.create(null);if(o.r(n),Object.defineProperty(n,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var r in t)o.d(n,r,function(e){return t[e]}.bind(null,r));return n},o.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return o.d(e,"a",e),e},o.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},o.p="",o(o.s=212)}({212:function(t,e,o){let n=!1,r="";function i(t){r=t,$("#loading-content").html(t),n=!0,$("#modal-loading").modal({backdrop:"static",keyboard:!1})}function a(){n=!1,$("#modal-loading").modal("hide")}function l(){let t=$(".bootstrap-tagsinput input");for(let e=0;e<t.length;e++){let o=$(t.get(e));o.attr("size",o.attr("placeholder").length)}}const s={danger:[],warning:[],success:[],info:[]};function u(){Cookies.remove("listback")}$(document).ready(()=>{$("#modal-loading").on("shown.bs.modal",()=>{n||a()}),$("#modal-loading").on("hidden.bs.modal",()=>{n&&i(r)}),l();let t=Cookies.get("listback");null!=t&&$(".back-button").attr("href",t).on("click",u)});let f=o(213);window.utils={disableButton:function(t,e){let o=$(t).addClass("disabled").attr("disabled","disabled");null!=e&&o.html(e)},showInfiniteLoading:i,hideLoading:a,generateAlert:function(t,e){return'<div class="alert alert-'+t+'" role="alert">'+e+"</div>"},enableButton:function(t,e){let o=$(t).removeClass("disabled").removeAttr("disabled");null!=e&&o.html(e)},updateTagsInputWidth:l,addNotification:function(t,e){let o=Cookies.getJSON("notifications")||s;o[e].push(t),Cookies.set("notifications",o)},showCookieNotifications:function(){let t=Cookies.getJSON("notifications")||s;for(let[e,o]of Object.entries(t))o.forEach(t=>{$.notify({message:t},{type:e})});Cookies.remove("notifications")},updateTagsInputWidth:l,string:f,setBackCookie:function(){Cookies.set("listback",location.href)},useBackCookie:u}},213:function(t,e){const o=["B","K","M","G","T","P","E","Z","Y"];const n=/^[\d.]+$/;function r(t){return n.test(t)?parseFloat(t):NaN}t.exports.generatePassword=function(t=10,e=20,o="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"){return Array(Math.floor(Math.random()*(e-t))+t).fill(o).map((function(t){return t[Math.floor(Math.random()*t.length)]})).join("")},t.exports.formatBytes=function(t,e=2,n=!1){if(0===t)return"0B";const r=n?1e3:1024,i=e<0?0:e,a=Math.floor(Math.log(t)/Math.log(r));return parseFloat((t/Math.pow(r,a)).toFixed(i))+o[a]+(n&&a>0?"B":"")},t.exports.validParseFloat=r,t.exports.parseBytesSize=function(t){if(0==(t=t.toString().trim()).length)return NaN;let e=t.slice(-1);if(t=t.substr(0,t.length-1),o.includes(e))if("B"!=e)storage=r(t)*Math.pow(1024,o.indexOf(e));else{let e=t.slice(-1);if(t=t.substr(0,t.length-1),o.includes(e)){if("B"==e)return naN;storage=r(t)*Math.pow(1e3,o.indexOf(e))}else storage=r(t+e)}else storage=r(t+e);return Math.floor(storage)},t.exports.replaceArgs=function(t,e){for(let o of Object.entries(e))t=t.replace(new RegExp(o[0],"g"),o[1]);return t},t.exports.keepConfigLines=function(t,e,o=[]){let n=[];for(let r of t.split("\n")){let t=!0;for(let t of e)if(r.startsWith(t+":")){r=r.substring(t.length+1);break}for(let e of o)if(r.startsWith(e+":")){t=!1;break}t&&n.push(r)}return n.join("\n")}}});