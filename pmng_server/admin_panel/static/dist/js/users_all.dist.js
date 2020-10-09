!function(e){var t={};function n(o){if(t[o])return t[o].exports;var r=t[o]={i:o,l:!1,exports:{}};return e[o].call(r.exports,r,r.exports,n),r.l=!0,r.exports}n.m=e,n.c=t,n.d=function(e,t,o){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:o})},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},n.t=function(e,t){if(1&t&&(e=n(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var o=Object.create(null);if(n.r(o),Object.defineProperty(o,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var r in e)n.d(o,r,function(t){return e[t]}.bind(null,r));return o},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="",n(n.s=205)}({205:function(e,t){let n=void 0;function o(e){let t=`<li class="list-group-item line-user" id="line-${e.name}">`+`<b>User #${e.id} : </b> ${e.fullname} (${e.name})<span class="ml-md-4"><i>${e.email}</i> (permission level ${e.scope})</span>`+`<span class="float-md-right d-block d-md-inline mt-2 mt-md-0"><div class="btn-group" role="group" style="margin: -3px -10px;"><button class="btn btn-sm btn-primary" onclick="users_all.editUser('${e.name}')"><i class="fas fa-edit"></i> Edit</button><button class="btn btn-sm btn-danger" ${window.currentUsername==e.name?"disabled ":""}onclick="users_all.deleteUser('${e.name}')"><i class="fas fa-trash-alt"></i> Delete</button></div></span></li>`;$("#users-list").append(t)}let r=void 0;let s=0;window.users_all={init:function(){window.hideMain(),n=io("/v1/users"),n.on("connect",(function(){console.log("Socket connected."),n.emit("authentication",{key:API_KEY}),n.on("authenticated",(function(){console.log("Socket authenticated."),n.emit("setup",{type:"list"}),$.getJSON("/api/v1/users/list").fail((e,t,n)=>{$.notify({message:"Unable to list users because of a server error."},{type:"danger"}),console.warn(n),$(".status-msg").html("An error occured while the list was retrieved by the server. Please reload the page.")}).done(e=>{if(e.error)$.notify({message:"Unable to list users because of an application error."},{type:"danger"}),console.warn(e.code,e.message),$(".status-msg").html("An error occured while the list was processed by the platform. Please reload the page.");else{let t=e.users;$("#users-list").html(""),$("#users-status").hide(),$("#users-card").show();for(let e of t)o(e)}}).always(()=>{window.showMain()})})),n.on("unauthorized",(function(e){window.showMain(),$.notify({message:"Unable to authenticate to the socket. You may need to reload the page."},{type:"danger"}),console.log("Unauthorized from the socket",e)}))})),n.on("error",e=>{window.showMain(),$.notify({message:"Connection with the socket lost. You may need to reload the page."},{type:"danger"}),console.log("Socket error",e)}),n.on("user_action",e=>{let t=e.user;switch(e.action){case"add":o(t);break;case"remove":$("#line-"+t).remove()}})},confirm:function(){if(null==r)return;let e=r;r=void 0,$("#confirmModal").modal("hide"),utils.showInfiniteLoading("Deleting user "+e+"..."),$.getJSON("/api/v1/users/delete/"+e).fail((e,t,n)=>{console.warn(n),$.notify({message:"Unable to delete this user (server error). See console for details."},{type:"danger"})}).done(t=>{t.error?(console.warn(t.message),$.notify({message:"Unable to delete this user (application error). See console for details."},{type:"danger"})):($("#line-"+e).remove(),$.notify({message:"The user was successfully deleted."},{type:"success"}))}).always(()=>{utils.hideLoading()})},deleteUser:function(e){s>0&&clearInterval(s),r=e,$("#confirmModal-content").html("Do you really want to delete the user <i>"+e+"</i>?<br/><br/><i class='fas fa-exclamation-triangle'></i> Warning: This action is irreversible! All the projects and their associated contents owned by this user will be removed for ever!"),$("#confirmModal").modal();let t=$("#confirmModal-button").html("Please wait 10s...").attr("disabled","disabled"),n=10;s=setInterval(()=>{n--,0==n?(clearInterval(s),s=0,t.html("Sure, delete this user").removeAttr("disabled")):t.html("Please wait "+n+"s...")},1e3)},editUser:function(e){location.href="/panel/users/edit/"+e}}}});