!function(e){var t={};function a(l){if(t[l])return t[l].exports;var s=t[l]={i:l,l:!1,exports:{}};return e[l].call(s.exports,s,s.exports,a),s.l=!0,s.exports}a.m=e,a.c=t,a.d=function(e,t,l){a.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:l})},a.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},a.t=function(e,t){if(1&t&&(e=a(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var l=Object.create(null);if(a.r(l),Object.defineProperty(l,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var s in e)a.d(l,s,function(t){return e[t]}.bind(null,s));return l},a.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return a.d(t,"a",t),t},a.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},a.p="",a(a.s=203)}({203:function(e,t){let a=!1;function l(){return $("input, #confirm-button")}function s(){l().attr("disabled","disabled").addClass("disabled")}function n(){l().removeAttr("disabled").removeClass("disabled"),$(".always-disabled").attr("disabled","disabled").addClass("disabled")}function r(){let e={},t=0;e.name=$("#input-username").val().trim(),e.name.length>0&&t++,e.fullname=$("#input-fullname").val().trim(),e.fullname.length>0&&t++,e.email=$("#input-email").val().trim(),e.email.length>0&&t++,e.scope=parseInt($("#input-permlevel").val().trim()),isNaN(e.scope)||t++,e.password=$("#input-password").val().trim(),!edit&&0==e.password.length||$("#input-confirmpass").val().trim()!=e.password?(e.password.length>0&&($.notify({message:"The passwords are not identical."},{type:"warning"}),t--),e.password=""):t++;let a=-1;return edit&&t>=4||!edit&&5==t?a=1:t>0&&(a=0),{completion:a,userData:e}}function o(){let e={},t=r();return t.completion>0?(t=t.userData,t.fullname!=values.fullname&&(e.fullname=t.fullname),t.scope!=values.scope&&(e.scope=t.scope),t.email!=values.email&&(e.email=t.email),t.password.length>0&&(e.password=t.password),e):null}let i=void 0;window.user_manage={init:function(){window.onbeforeunload=()=>{if(!a&&(!edit&&r().completion>=0||Object.keys(o()).length>0))return"You have unsaved changes on this page. Do you want to leave?"}},confirm:function(){let e=$("#confirm-button");if(edit){let e=o();if(null!=e){let t=Object.keys(e).length;if(0==t)$.notify({message:"No changes made."},{type:"warning"});else{i=e;let a="You modified the following propert"+(1==t?"y":"ies")+":<ul>";null!=e.fullname&&(a+=`<li>Fullname: ${e.fullname} <small>(from ${values.fullname})</small></li>`),null!=e.email&&(a+=`<li>Email address: ${e.email}<br/><small>(from ${values.email})</small></li>`),null!=e.scope&&(a+=`<li>Permission level: ${e.scope} <small>(from ${values.scope})</small></li>`),null!=e.password&&(a+="<li>Account password (hidden)</li>"),a+="</ul>",$("#confirmModal-content").html(a),$("#confirmModal").modal()}}}else{let t=r();1==t.completion&&(a=!0,s(),utils.disableButton(e,"Creating the user..."),$.post("/api/v1/users/create",t.userData).fail((t,l,s)=>{a=!1,$.notify({message:"Unable to contact server. See console for details."},{type:"danger"}),console.warn("Unable to create user (server error):",s),n(),utils.enableButton(e,"Create this user")}).done(t=>{t.error?(a=!1,$.notify({message:"Unable to create this user. See console for details."},{type:"danger"}),console.warn("Unable to create user (application error):",error),n(),utils.enableButton(e,"Create this user")):(utils.addNotification("User successfully added.","success"),location.href="all")}))}return!1},confirmSave:function(){if(null==i)return;let e=i;i=void 0;let t=$("#confirm-button");a=!0,s(),utils.disableButton(t,"Saving changes..."),$("#confirmModal").modal("hide"),$.post("/api/v1/users/edit/"+values.name,e).fail((e,l,s)=>{a=!1,$.notify({message:"Unable to contact server. See console for details."},{type:"danger"}),console.warn("Unable to edit user (server error):",s),n(),utils.enableButton(t,"Edit this user")}).done(e=>{e.error?(a=!1,$.notify({message:"Unable to edit this user. See console for details."},{type:"danger"}),console.warn("Unable to edit user (application error):",error),n(),utils.enableButton(t,"Edit this user")):(utils.addNotification("User successfully edited.","success"),location.href="../all")})},getUserForm:r,getChanges:o,resetSSOPassword:function(){let e=$("#reset-dbautopass").attr("disabled","disabled");$.getJSON("/api/v1/users/edit/"+values.name+"/resetdbautopass").fail((e,t,a)=>{$.notify({message:"Unable to reset the database SSO password. See console for details."},{type:"danger"}),console.warn("Unable to reset dbautopass (server error):",a)}).done(e=>{e.error?($.notify({message:"Unable to reset the database SSO password. See console for details."},{type:"danger"}),console.warn("Unable to reset dbautopass (application error):",error)):$.notify({message:"Database SSO password reset."},{type:"success"})}).always(()=>{e.removeAttr("disabled")})}}}});