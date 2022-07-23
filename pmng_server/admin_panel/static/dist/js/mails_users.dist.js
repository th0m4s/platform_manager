!function(e){var s={};function t(a){if(s[a])return s[a].exports;var n=s[a]={i:a,l:!1,exports:{}};return e[a].call(n.exports,n,n.exports,t),n.l=!0,n.exports}t.m=e,t.c=s,t.d=function(e,s,a){t.o(e,s)||Object.defineProperty(e,s,{enumerable:!0,get:a})},t.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},t.t=function(e,s){if(1&s&&(e=t(e)),8&s)return e;if(4&s&&"object"==typeof e&&e&&e.__esModule)return e;var a=Object.create(null);if(t.r(a),Object.defineProperty(a,"default",{enumerable:!0,value:e}),2&s&&"string"!=typeof e)for(var n in e)t.d(a,n,function(s){return e[s]}.bind(null,n));return a},t.n=function(e){var s=e&&e.__esModule?function(){return e.default}:function(){return e};return t.d(s,"a",s),s},t.o=function(e,s){return Object.prototype.hasOwnProperty.call(e,s)},t.p="",t(t.s="kwh3")}({kwh3:function(e,s){let t=void 0;const a=["users","aliases"];function n(e){if(null==e||a.includes(e)){"aliases"==e?window.history.replaceState({},null,location.href.split("#")[0]+"#aliases"):window.history.replaceState({},null,location.href.split("#")[0]),$(".chevron").removeClass("fa-chevron-down").addClass("fa-chevron-right").css("margin-left","0px");for(let e of a)$("."+e+"-only").hide();null!=e&&($("."+e+"-only").show(),$(".chevron-"+e).addClass("fa-chevron-down").removeClass("fa-chevron-right").css("margin-left","-6px")),l(),r(),t=e,requestAnimationFrame(()=>{thin_buttons.prepareButtons()})}}function i(e,s=!0){let t=$("#hide-system-users");s&&e?t.prop("checked",!0):s&&t.prop("checked",!1),e?$(".user-system").appendTo("#hidden-users"):$(".user-system").appendTo("#users-list"),d("#users-list",".row-user"),l()}function l(){$(".row-user:visible").length>0?$("#no-users").hide():$("#no-users").show()}function o(e,s=!0){let t=$("#hide-system-aliases");s&&e?t.prop("checked",!0):s&&t.prop("checked",!1),e?$(".alias-system").appendTo("#hidden-aliases"):$(".alias-system").appendTo("#aliases-list"),d("#aliases-list",".row-alias"),r()}function r(){$(".row-alias:visible").length>0?$("#no-aliases").hide():$("#no-aliases").show()}function d(e,s){let t=$(e),a=$.makeArray(t.children(s));a=a.sort((e,s)=>{let t=parseInt($(e).attr("data-sort")),a=parseInt($(s).attr("data-sort"));return t<a?-1:t>a?1:0}),t.html(""),$.each(a,(function(){t.append(this)}))}function u(){$("#counter-users").html($(".user-system").length+"/"+$(".row-user").length),$("#counter-aliases").html($(".alias-system").length+"/"+$(".row-alias").length)}let c=void 0,p=0;window.mails_users={init:function(){"#aliases"==location.hash?n("aliases"):n("users");let e=$("#users-list");for(let s of window.users){let t="",a=[];null!=s.projectname&&a.push("for project "+s.projectname),s.system&&(t=" user-system",a.push("<i>system</i>")),e.append(`<li class="list-group-item row-user${t}" data-sort="${s.id}" id="row-user-${s.id}"><b>Mail user #${s.id}:</b> <a class="project-link" target="_blank" href="mailto:${s.email}">${s.email}</a><span class="mx-3">`+(a.length>0?`(${a.join(", ")})`:"")+`</span>\n        <span class="float-md-right"><div class="btn-group" role="group" style="margin: -3px -10px;"><a href="/panel/login/sso/webmail?uid=${s.id}" class="btn btn-sm btn-info thinable-btn"><i class="fas fa-sign-in-alt"></i> <span>Webmail</span></a><a href="/panel/mails/users/edit/${s.id}" class="btn btn-sm thinable-btn btn-primary"><i class="fas fa-edit"></i> <span>Edit</span></a><button onclick="mails_users.deleteUser(${s.id}, '${s.email}')" class="btn btn-sm thinable-btn btn-danger"${s.system?" disabled":""}><i class="fas fa-trash-alt"></i> <span>Remove</span></button></div></span></li>`)}let s=$("#aliases-list");for(let e of window.aliases){let t="",a=[];null!=e.projectname&&a.push("for project "+e.projectname),e.system&&(t=" alias-system",a.push("<i>system</i>")),s.append(`<li class="list-group-item row-alias${t}" data-sort="${e.id}" id="row-alias-${e.id}"><b>Alias #${e.id}:</b> <a class="project-link" target="_blank" href="mailto:${e.source}">${e.source}</a> <i>to</i> <a class="project-link" target="_blank" href="mailto:${e.destination}">${e.destination}</a> <span class="mx-3">`+(a.length>0?`(${a.join(", ")})`:"")+`</span>\n        <span class="float-md-right"><div class="btn-group" role="group" style="margin: -3px -10px;"><a href="/panel/mails/aliases/edit/${e.id}" class="btn btn-sm thinable-btn btn-primary${e.system?" disabled":""}"><i class="fas fa-edit"></i> <span>Edit</span></a><button onclick="mails_users.deleteAlias(${e.id}, '${e.source}')" class="btn btn-sm thinable-btn btn-danger"${e.system?" disabled":""}><i class="fas fa-trash-alt"></i> <span>Remove</span></button></div></span></li>`)}i(!0,!0),o(!0,!0),u(),thin_buttons.prepareButtons()},setPanelView:n,panelViewClicked:function(e){n(t==e?void 0:e)},toggleSystemUsers:function(e){i($(e).is(":checked"),!1)},toggleSystemAliases:function(e){o($(e).is(":checked"),!1)},deleteUser:function(e,s){$("#deleteModal-title").html("Remove an email user"),$("#deleteModal-content").html("Do you really want to remove the address <i>"+s+"</i>? This action is irreversible!<br/><br/>If aliases exist for this address, they'll be deleted."),c="user",p=e,$("#deleteModal").modal()},deleteAlias:function(e,s){$("#deleteModal-title").html("Remove an email alias"),$("#deleteModal-content").html("Do you really want to remove the alias <i>"+s+"</i>?"),c="alias",p=e,$("#deleteModal").modal()},confirmDelete:function(){if(!["user","alias"].includes(c)||p<=0)return;let e="user"==c?"users":"aliases";$("#deleteModal").modal("hide"),utils.showInfiniteLoading("Removing "+c+"..."),$.getJSON("/api/v1/mails/"+e+"/delete/"+p).fail((e,s,t)=>{$.notify({message:"Unable to remove this "+c+". See console for details."},{type:"danger"}),console.warn("Unable to delete record (server error):",t)}).done(e=>{e.error?($.notify({message:"Unable to remove this "+c+". See console for details."},{type:"danger"}),console.warn("Unable to delete record (application error):",error)):($.notify({message:c[0].toUpperCase()+c.substring(1)+" successfully removed."},{type:"success"}),$("#row-"+c+"-"+p).remove(),u(),"user"==c?l():r())}).always(()=>{utils.hideLoading(),p=0,c=void 0})}}}});