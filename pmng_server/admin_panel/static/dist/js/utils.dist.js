!function(t){var e={};function n(o){if(e[o])return e[o].exports;var i=e[o]={i:o,l:!1,exports:{}};return t[o].call(i.exports,i,i.exports,n),i.l=!0,i.exports}n.m=t,n.c=e,n.d=function(t,e,o){n.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:o})},n.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},n.t=function(t,e){if(1&e&&(t=n(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var o=Object.create(null);if(n.r(o),Object.defineProperty(o,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var i in t)n.d(o,i,function(e){return t[e]}.bind(null,i));return o},n.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return n.d(e,"a",e),e},n.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},n.p="",n(n.s=36)}({36:function(t,e){let n=!1,o="";function i(t){o=t,$("#loading-content").html(t),n=!0,$("#modal-loading").modal({backdrop:"static",keyboard:!1})}function r(){n=!1,$("#modal-loading").modal("hide")}function a(){let t=$(".bootstrap-tagsinput input");for(let e=0;e<t.length;e++){let n=$(t.get(e));n.attr("size",n.attr("placeholder").length)}}$(document).ready(()=>{$("#modal-loading").on("shown.bs.modal",()=>{n||r()}),$("#modal-loading").on("hidden.bs.modal",()=>{n&&i(o)}),a()});const l={danger:[],warning:[],success:[],info:[]};window.utils={disableButton:function(t,e){let n=$(t).addClass("disabled").attr("disabled","disabled");null!=e&&n.html(e)},showInfiniteLoading:i,hideLoading:r,generateAlert:function(t,e){return'<div class="alert alert-'+t+'" role="alert">'+e+"</div>"},enableButton:function(t,e){let n=$(t).removeClass("disabled").removeAttr("disabled");null!=e&&n.html(e)},updateTagsInputWidth:a,addNotification:function(t,e){let n=Cookies.getJSON("notifications")||l;n[e].push(t),Cookies.set("notifications",n)},showCookieNotifications:function(){let t=Cookies.getJSON("notifications")||l;for(let[e,n]of Object.entries(t))n.forEach(t=>{$.notify({message:t},{type:e})});Cookies.remove("notifications")},updateTagsInputWidth:a}}});