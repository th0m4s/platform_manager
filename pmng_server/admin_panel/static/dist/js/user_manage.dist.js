!function(e){var t={};function l(n){if(t[n])return t[n].exports;var a=t[n]={i:n,l:!1,exports:{}};return e[n].call(a.exports,a,a.exports,l),a.l=!0,a.exports}l.m=e,l.c=t,l.d=function(e,t,n){l.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:n})},l.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},l.t=function(e,t){if(1&t&&(e=l(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var n=Object.create(null);if(l.r(n),Object.defineProperty(n,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var a in e)l.d(n,a,function(t){return e[t]}.bind(null,a));return n},l.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return l.d(t,"a",t),t},l.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},l.p="",l(l.s=41)}({41:function(e,t){let l=!1;function n(){return $("input, #confirm-button")}function a(){n().attr("disabled","disabled").addClass("disabled")}function o(){n().removeAttr("disabled").removeClass("disabled"),$(".always-disabled").attr("disabled","disabled").addClass("disabled")}function r(){let e={},t=0;e.name=$("#input-username").val().trim(),e.name.length>0&&t++,e.fullname=$("#input-fullname").val().trim(),e.fullname.length>0&&t++,e.email=$("#input-email").val().trim(),e.email.length>0&&t++,e.scope=parseInt($("#input-permlevel").val().trim()),isNaN(e.scope)||t++,e.password=$("#input-password").val().trim(),!edit&&0==e.password.length||$("#input-confirmpass").val().trim()!=e.password?(e.password.length>0&&($.notify({message:"The passwords are not identical."},{type:"warning"}),t--),e.password=""):t++;let l=-1;return edit&&t>=4||!edit&&5==t?l=1:t>0&&(l=0),{completion:l,userData:e}}function s(){let e={},t=r();return t.completion>0?(t=t.userData,t.fullname!=values.fullname&&(e.fullname=t.fullname),t.scope!=values.scope&&(e.scope=t.scope),t.email!=values.email&&(e.email=t.email),t.password.length>0&&(e.password=t.password),e):null}let i=void 0;window.user_manage={init:function(){window.onbeforeunload=()=>{if(!l&&(!edit&&r().completion>=0||Object.keys(s()).length>0))return"You have unsaved changes on this page. Do you want to leave?"}},confirm:function(){let e=$("#confirm-button");if(edit){let e=s();if(null!=e){let t=Object.keys(e).length;if(0==t)$.notify({message:"No changes made."},{type:"warning"});else{i=e;let l="You modified the following propert"+(1==t?"y":"ies")+":<ul>";null!=e.fullname&&(l+=`<li>Fullname: ${e.fullname} <small>(from ${values.fullname})</small></li>`),null!=e.email&&(l+=`<li>Email address: ${e.email}<br/><small>(from ${values.email})</small></li>`),null!=e.scope&&(l+=`<li>Permission level: ${e.scope} <small>(from ${values.scope})</small></li>`),null!=e.password&&(l+="<li>Account password (hidden)</li>"),l+="</ul>",$("#confirmModal-content").html(l),$("#confirmModal").modal()}}}else{let t=r();1==t.completion&&(l=!0,a(),utils.disableButton(e,"Creating the user..."),$.post("/api/v1/users/create",t.userData).fail((t,n,a)=>{l=!1,$.notify({message:"Unable to contact server. See console for details."},{type:"danger"}),console.warn("Unable to create user (server error):",a),o(),utils.enableButton(e,"Create this user")}).done(t=>{t.error?(l=!1,$.notify({message:"Unable to create this user. See console for details."},{type:"danger"}),console.warn("Unable to create user (application error):",error),o(),utils.enableButton(e,"Create this user")):(utils.addNotification("User successfully added.","success"),location.href="all")}))}return!1},confirmSave:function(){if(null==i)return;let e=i;i=void 0;let t=$("#confirm-button");l=!0,a(),utils.disableButton(t,"Saving changes..."),$("#confirmModal").modal("hide"),$.post("/api/v1/users/edit/"+values.name,e).fail((e,n,a)=>{l=!1,$.notify({message:"Unable to contact server. See console for details."},{type:"danger"}),console.warn("Unable to edit user (server error):",a),o(),utils.enableButton(t,"Edit this user")}).done(e=>{e.error?(l=!1,$.notify({message:"Unable to edit this user. See console for details."},{type:"danger"}),console.warn("Unable to edit user (application error):",error),o(),utils.enableButton(t,"Edit this user")):(utils.addNotification("User successfully edited.","success"),location.href="../all")})},getUserForm:r,getChanges:s}}});