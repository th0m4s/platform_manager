!function(e){var t={};function n(o){if(t[o])return t[o].exports;var a=t[o]={i:o,l:!1,exports:{}};return e[o].call(a.exports,a,a.exports,n),a.l=!0,a.exports}n.m=e,n.c=t,n.d=function(e,t,o){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:o})},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},n.t=function(e,t){if(1&t&&(e=n(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var o=Object.create(null);if(n.r(o),Object.defineProperty(o,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var a in e)n.d(o,a,function(t){return e[t]}.bind(null,a));return o},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="",n(n.s="9zsk")}({"9zsk":function(e,t){let n=void 0,o=0,a={};function s(){setTimeout(()=>{r(!0,$("#owned-list li").length>0),r(!1,$("#collab-list li").length>0)},0)}function r(e,t){e?t?($("#owned-status").hide(),$("#owned-card").show()):($("#owned-status").html("No projects found.").show(),$("#owned-card").hide()):t?($("#collab-status").hide(),$("#collab-card").show()):($("#collab-status").html("No projects found.").show(),$("#collab-card").hide())}let l=[];function i(){$.getJSON("/api/v1/projects/create").done(e=>{e.error||(e.canCreate?$("#createProject-link").removeClass("disabled"):$("#createProject-link").addClass("disabled"))})}function c(e,t){let n=t?" disabled":"";return`<li class="list-group-item" id="line-project-${e.name}" data-state="unknown"><b>Project #${e.id} : </b><a class="project-link" target="_blank" href="${e.url}">${e.name}</a> (v${e.version})<span class="text-secondary d-block d-md-inline"><samp class="ml-4">${e.version>0?e.type:"No version deployed"}</samp></span><span class="float-md-right d-block d-md-inline mt-2 mt-md-0"><div class="btn-group" role="group" style="margin: -3px -10px;"><button class="btn btn-sm btn-info thinable-btn" onclick="projects_list.details('${e.name}')"><i class="fas fa-info-circle"></i> <span>Details</span></button><button class="btn btn-sm btn-primary thinable-btn" onclick="projects_list.editProject('${e.name}')"${n}><i class="fas fa-edit"></i> <span>Edit</span></button><button class="btn btn-sm btn-info" data-current="info" id="button-state-${e.name}" onclick="projects_list.updateState('${e.name}')" ${t?'data-perm="no"':""} data-version="${e.version}" data-url="${e.url}" data-id="${e.id}" data-type="${e.type}" disabled><i class="fas fa-sync fa-spin"></i> Syncing...</button><button class="btn btn-sm btn-secondary thinable-btn" id="button-restart-${e.name}" onclick="projects_list.restartProject('${e.name}')" ${t?'data-perm="no"':""} disabled><i class="fas fa-undo-alt"></i> <span>Restart</span></button><button class="btn btn-sm btn-danger thinable-btn" onclick="projects_list.deleteProject('${e.name}')"${n}><i class="fas fa-trash-alt"></i> <span>Delete</span></button></div></span></li>`}function p(e){j(e,!1),u(e,"warning",null,"Unknown",!0,"unknown")}function d(e){$.getJSON("/api/v1/projects/arerunning/"+e.join(",")).done(t=>{if(t.error)e.forEach(e=>{p(e),a[e]="none"}),console.warn(t.message),$.notify({message:"Unable to check states, please reload the page or open the console for details."},{type:"danger"});else for(let[e,n]of Object.entries(t.results))a[e]=n.special,"none"==n.special?n.running?(j(e,!0),u(e,"dark","stop","Stop",!1,"running")):(j(e,!1),u(e,"success","play","Start",!1,"stopped")):"starting"==n.special?(j(e,!1),u(e,"info","sync fa-spin","Start",!0,"stopped")):"stopping"==n.special?(j(e,!1),u(e,"info","sync fa-spin","Stop",!0,"running")):p(e)}).fail((t,n,o)=>{e.forEach(e=>{p(e),a[e]="none"}),console.warn(o),$.notify({message:"Unable to check states, please reload the page or open the console for details"},{type:"danger"})})}function u(e,t,n,o,a,s){let r=$("#button-state-"+e),l=r.attr("data-current");r.parent().parent().parent().attr("data-state",s),r.removeClass("btn-"+l).addClass("btn-"+t).attr("data-current",t).html((null!=n?`<i class="fas fa-${n}"></i> `:"")+o),a?r.attr("disabled","disabled"):"no"!==r.attr("data-perm")&&parseInt(r.attr("data-version"))>0&&r.removeAttr("disabled")}const f=10;let g=0;function b(e){return e=e||f,$.getJSON("/api/v1/projects/list/owned/"+g+"/"+e).fail((e,t,n)=>{$("#owned-status").html(utils.generateAlert("danger","Server error encountered, unable to get owned projects.")),console.warn("Unable to fetch owned projects (server error):",n)}).done(e=>{if(e.error)$("#owned-status").show().html(utils.generateAlert("danger","Fetching error encountered, unable to get owned projects.")),console.warn("Unable to fetch owned projects (application error):",error);else{let t=e.results;o<2&&(r(!0,t.projects.length>0),o++),function(e){let t=$("#owned-list"),o=[];e.forEach(e=>{n.emit("listen_project",{project:e.name}),o.push(e.name),g=Math.max(g,e.id),t.append(c(e,!1))}),thin_buttons.prepareButtons(),e.length>0&&(l=l.concat(o),d(o))}(t.projects),t.hasMore?utils.enableButton($("#owned-more").show(),"Load more projects"):$("#owned-more").hide()}})}let m=0;function h(e){return e=e||f,$.getJSON("/api/v1/projects/list/collabs/"+m+"/"+e).fail((e,t,n)=>{$("#collab-status").html(utils.generateAlert("danger","Server error encountered, unable to get collab projects.")),console.warn("Unable to fetch collab projects (server error):",n)}).done(e=>{if(e.error)$("#collab-status").show().html(utils.generateAlert("danger","Fetching error encountered, unable to get collab projects.")),console.warn("Unable to fetch collab projects (application error):",error);else{let t=e.results;o<2&&(r(!1,t.projects.length>0),o++),function(e){let t=$("#collab-list"),o=[];e.forEach(e=>{n.emit("listen_project",{project:e.project.name}),o.push(e.project.name),m=Math.max(m,e.id),t.append(c(e.project,"manage"!==e.mode))}),thin_buttons.prepareButtons(),e.length>0&&(l=l.concat(o),d(o))}(t.projects),t.hasMore?utils.enableButton($("#collab-more").show(),"Load more projects"):$("#collab-more").hide()}})}let y=void 0;function j(e,t){let n=$("#button-restart-"+e);t?"no"!==n.attr("data-perm")&&n.removeAttr("disabled"):n.attr("disabled","disabled")}window.projects_list={init:function(){window.hideMain(),n=io("/v1/projects",{transports:["websocket"]}),n.on("connect",(function(){console.log("Socket connected."),n.emit("authentication",{key:API_KEY}),n.on("authenticated",(function(){console.log("Socket authenticated."),n.emit("setup");let e=0,t=()=>{e++,2==e&&window.showMain()};b(f).always(t),h(f).always(t)})),n.on("unauthorized",(function(e){window.showMain();for(let e of l)p(e);$.notify({message:"Unable to authenticate to the socket. Please reload the page."},{type:"danger"}),console.log("Unauthorized from the socket",e)})),n.on("project_action",e=>{let t=e.project;switch(e.action){case"start":a[t]="none",j(t,!0),u(t,"dark","stop","Stop",!1,"running");break;case"stop":a[t]="none",j(t,!1),u(t,"success","play","Start",!1,"stopped");break;case"delete":if(t!=y){let e=$("#line-project-"+t);e.length>0&&(e.remove(),i(),s(),$.notify({message:`The project <i>${t}</i> was deleted from another session.`},{type:"info"}))}case"add":"owned"==e.type?(l.push(t),n.emit("listen_project",{project:t}),$("#owned-list").append(c({name:t,id:e.id,mode:null,version:0,url:e.url},!1)),u(t,"success","play","Start",!0,"stopped"),r(!0,!0)):"collab"==e.type&&(l.push(t.name),n.emit("listen_project",{project:t.name}),$("#collab-list").append(c(t,!e.manageable)),e.running?(j(t.name,!0),u(t.name,"dark","stop","Stop",!1,"running")):(j(t.name,!1),u(t.name,"success","play","Start",!0,"stopped")),r(!1,!0));break;case"update_collab":let o=e.collabmode;if("remove"==o)$("#line-project-"+t).remove(),s();else{let e=$("#button-state-"+t),n="manage"==o,a="dark"==e.attr("data-current"),s=e.attr("data-id"),r=e.attr("data-version"),l=r>0?e.attr("data-type"):null,i=e.attr("data-url");$("#line-project-"+t).replaceWith(c({name:t,type:l,version:r,id:s,url:i},!n)),a?(j(t,!0),u(t,"dark","stop","Stop",!n,"running")):(j(t,!1),u(t,"success","play","Start",!n,"stopped"))}break;case"special_state":let d=e.state;if("clear_special_state"==d){if("none"!=a[t]){let e=$("#line-project-"+t).attr("data-state");"running"==e?(j(t,!0),u(t,"dark","stop","Stop",!1,"running")):"stopped"==e?(j(t,!1),u(t,"success","play","Start",!1,"stopped")):p(t)}}else"starting"==d?(j(t,!1),u(t,"info","sync fa-spin","Start",!0,"stopped")):"stopping"==d&&(j(t,!1),u(t,"info","sync fa-spin","Stop",!0,"running"));a[t]=d}})})),n.on("error",e=>{window.showMain();for(let e of l)p(e);$.notify({message:"Connection with the socket lost. Please reload the page."},{type:"danger"}),console.log("Socket error",e)})},requestLimit:f,requestOwned:b,requestCollab:h,editProject:function(e){location.href="edit/"+e},deleteProject:function(e){y=e,$("#deleteModal-content").html(`Do you really want to permanently delete the project <i>${e}</i> from the database and remove all of its contents.<br/><b>This cannot be undone.</b>`);let t=$("#button-confirm-delete");utils.disableButton(t,"Please wait..."),setTimeout(()=>{utils.enableButton(t,"Sure, I want to delete this project")},5e3),$("#deleteModal").modal()},confirmDelete:function(){if($("#deleteModal").modal("hide"),null==y)return;let e=y;utils.showInfiniteLoading("Deleting project "+e+"..."),$.getJSON("/api/v1/projects/delete/"+e).fail((e,t,n)=>{console.warn(n),$.notify({message:"Unable to delete this project (server error). See console for details."},{type:"danger"})}).done(t=>{t.error?(console.warn(t.message),$.notify({message:"Unable to delete this project (application error). See console for details."},{type:"danger"})):($("#line-project-"+e).remove(),i(),l.splice(l.indexOf(e)),$.notify({message:"The project was successfully deleted."},{type:"success"}))}).always(()=>{utils.hideLoading()})},updateState:function(e){let t=$("#line-project-"+e).attr("data-state");"running"==t?(utils.showInfiniteLoading("Stopping project "+e+"..."),$.getJSON("/api/v1/projects/stop/"+e).fail((e,t,n)=>{console.warn(n),$.notify({message:"Unable to stop this project (server error). See console for details."},{type:"danger"})}).done(e=>{e.error?(console.warn(e.message),$.notify({message:"Unable to stop this project (application error). See console for details."},{type:"danger"})):$.notify({message:"The project was successfully stopped."},{type:"success"})}).always(()=>{utils.hideLoading()})):"stopped"==t?(utils.showInfiniteLoading("Starting project "+e+"..."),$.getJSON("/api/v1/projects/start/"+e).fail((e,t,n)=>{console.warn(n),$.notify({message:"Unable to start this project (server error). See console for details."},{type:"danger"})}).done(e=>{e.error?(console.warn(e.message),$.notify({message:"Unable to start this project (application error). See console for details."},{type:"danger"})):$.notify({message:"The project was successfully started."},{type:"success"})}).always(()=>{utils.hideLoading()})):$.notify({message:"Unknown actual state. Please refresh the page and inspect docker events."},{type:"warning"})},restartProject:function(e){"running"==$("#line-project-"+e).attr("data-state")?(utils.showInfiniteLoading("Restarting project "+e+"..."),$.getJSON("/api/v1/projects/stop/"+e).fail((e,t,n)=>{console.warn(n),$.notify({message:"Unable to restart this project (stopping server error). See console for details."},{type:"danger"}),utils.hideLoading()}).done(t=>{t.error?(console.warn(t.message),$.notify({message:"Unable to restart this project (stopping application error). See console for details."},{type:"danger"}),utils.hideLoading()):$.getJSON("/api/v1/projects/start/"+e).fail((e,t,n)=>{console.warn(n),$.notify({message:"Unable to restart this project. See console for details."},{type:"danger"}),$.notify({message:"The project was stopped during the process. You will need to restart it manually."},{type:"warning"}),utils.hideLoading()}).done(e=>{e.error?(console.warn(e.message),$.notify({message:"Unable to restart this project. See console for details."},{type:"danger"}),$.notify({message:"The project was stopped during the process. You will need to restart it manually."},{type:"warning"})):$.notify({message:"The project was successfully restarted."},{type:"success"}),utils.hideLoading()})})):($.notify({message:"Cannot restart a non running project."},{type:"warning"}),j(e,!1))},details:function(e){location.href="details/"+e}}}});