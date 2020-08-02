!function(e){var t={};function o(n){if(t[n])return t[n].exports;var r=t[n]={i:n,l:!1,exports:{}};return e[n].call(r.exports,r,r.exports,o),r.l=!0,r.exports}o.m=e,o.c=t,o.d=function(e,t,n){o.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:n})},o.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},o.t=function(e,t){if(1&t&&(e=o(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var n=Object.create(null);if(o.r(n),Object.defineProperty(n,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var r in e)o.d(n,r,function(t){return e[t]}.bind(null,r));return n},o.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return o.d(t,"a",t),t},o.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},o.p="",o(o.s=24)}({24:function(e,t){let o=void 0;let n=[];function r(e,t){let o=t?" disabled":"";return`<li class="list-group-item" id="line-project-${e.name}" data-state="unknown">`+`<b>Project #${e.id} : </b>${e.name} (v${e.version})<span class="text-secondary d-block d-md-inline"><samp class="ml-4">${e.version>0?e.type:"No version deployed"}</samp></span>`+`<span class="float-md-right d-block d-md-inline mt-2 mt-md-0"><div class="btn-group" role="group" style="margin: -3px -10px;"><button class="btn btn-sm btn-info" onclick="projects_list.details('${e.name}')"><i class="fas fa-info-circle"></i> Details</button><button class="btn btn-sm btn-primary" onclick="projects_list.editProject('${e.name}')"${o}><i class="fas fa-edit"></i> Edit</button><button class="btn btn-sm btn-info" data-current="info" id="button-state-${e.name}" onclick="projects_list.updateState('${e.name}')" ${t?'data-perm="no"':""} data-version="${e.version}" disabled><i class="fas fa-sync fa-spin"></i> Syncing...</button>`+`<button class="btn btn-sm btn-secondary" id="button-restart-${e.name}" onclick="projects_list.restartProject('${e.name}')" ${t?'data-perm="no"':""} disabled><i class="fas fa-undo-alt"></i> Restart</button><button class="btn btn-sm btn-danger" onclick="projects_list.deleteProject('${e.name}')"${o}><i class="fas fa-trash-alt"></i> Delete</button></div></span></li>`}function a(e){g(e,!1),l(e,"warning",null,"Unknown",!0,"unknown")}function s(e){$.getJSON("/api/v1/projects/arerunning/"+e.join(",")).done(t=>{if(t.error)e.forEach(e=>{a(e)}),console.warn(t.message),$.notify({message:"Unable to check states, please reload the page or open the console for details."},{type:"danger"});else for(let[e,o]of Object.entries(t.results))o?(g(e,!0),l(e,"dark","stop","Stop",!1,"running")):(g(e,!1),l(e,"success","play","Start",!1,"stopped"))}).fail((t,o,n)=>{e.forEach(e=>{a(e)}),console.warn(n),$.notify({message:"Unable to check states, please reload the page or open the console for details"},{type:"danger"})})}function l(e,t,o,n,r,a){let s=$("#button-state-"+e),l=s.attr("data-current");s.parent().parent().parent().attr("data-state",a),s.removeClass("btn-"+l).addClass("btn-"+t).attr("data-current",t).html((null!=o?`<i class="fas fa-${o}"></i> `:"")+n),r?s.attr("disabled","disabled"):"no"!==s.attr("data-perm")&&parseInt(s.attr("data-version"))>0&&s.removeAttr("disabled")}const i=10;let c=0;function d(e){return e=e||i,$.getJSON("/api/v1/projects/list/owned/"+c+"/"+e).fail((e,t,o)=>{$("#owned-status").html(utils.generateAlert("danger","Server error encountered, unable to get owned projects.")),console.warn("Unable to fetch owned projects (server error):",o)}).done(e=>{if(e.error)$("#owned-status").show().html(utils.generateAlert("danger","Fetching error encountered, unable to get owned projects.")),console.warn("Unable to fetch owned projects (application error):",error);else{let t=e.results;t.projects.length>0?$("#owned-status").hide():$("#owned-status").html("No projects found."),function(e){let t=$("#owned-list"),a=[];e.forEach(e=>{o.emit("listen_project",{project:e.name}),a.push(e.name),c=Math.max(c,e.id),t.append(r(e,!1))}),e.length>0&&(t.parent().show(),n=n.concat(a),s(a))}(t.projects),t.hasMore?utils.enableButton($("#owned-more").show(),"Load more projects"):$("#owned-more").hide()}})}let p=0;function u(e){return e=e||i,$.getJSON("/api/v1/projects/list/collabs/"+p+"/"+e).fail((e,t,o)=>{$("#collab-status").html(utils.generateAlert("danger","Server error encountered, unable to get collab projects.")),console.warn("Unable to fetch collab projects (server error):",o)}).done(e=>{if(e.error)$("#collab-status").show().html(utils.generateAlert("danger","Fetching error encountered, unable to get collab projects.")),console.warn("Unable to fetch collab projects (application error):",error);else{let t=e.results;t.projects.length>0?$("#collab-status").hide():$("#collab-status").html("No projects found."),function(e){let t=$("#collab-list"),a=[];e.forEach(e=>{o.emit("listen_project",{project:project.name}),a.push(e.project.name),p=Math.max(p,e.id),t.append(r(e.project,"manage"!==e.mode))}),e.length>0&&(t.parent().show(),n=n.concat(a),s(a))}(t.projects),t.hasMore?utils.enableButton($("#collab-more").show(),"Load more projects"):$("#collab-more").hide()}})}let f=void 0;function g(e,t){let o=$("#button-restart-"+e);t?"no"!==o.attr("data-perm")&&o.removeAttr("disabled"):o.attr("disabled","disabled")}window.projects_list={init:function(){utils.showInfiniteLoading("Loading projects..."),o=io("/v1/projects"),o.on("connect",(function(){console.log("Socket connected."),o.emit("authentication",{key:API_KEY}),o.on("authenticated",(function(){console.log("Socket authenticated."),o.emit("setup"),d(i).always(()=>{u(i).always(()=>{utils.hideLoading()})})})),o.on("unauthorized",(function(e){utils.hideLoading();for(let e of n)a(e);$.notify({message:"Unable to authenticate to the socket. Please reload the page."},{type:"danger"}),console.log("Unauthorized from the socket",e)})),o.on("project_action",e=>{let t=e.project;switch(e.action){case"start":g(t,!0),l(t,"dark","stop","Stop",!1,"running");break;case"stop":g(t,!1),l(t,"success","play","Start",!1,"stopped");break;case"delete":if(t!=f){let e=$("#line-project-"+t);e.length>0&&(e.remove(),$.notify({message:`The project <i>${t}</i> was deleted from another session.`},{type:"info"}))}}})})),o.on("error",e=>{utils.hideLoading();for(let e of n)a(e);$.notify({message:"Connection with the socket lost. Please reload the page."},{type:"danger"}),console.log("Socket error",e)})},requestLimit:i,requestOwned:d,requestCollab:u,editProject:function(e){location.href="edit/"+e},deleteProject:function(e){f=e,$("#deleteModal-content").html(`Do you really want to permanently delete the project <i>${e}</i> from the database and remove all of its contents.<br/><b>This cannot be undone.</b>`);let t=$("#button-confirm-delete");utils.disableButton(t,"Please wait..."),setTimeout(()=>{utils.enableButton(t,"Sure, I want to delete this project")},5e3),$("#deleteModal").modal()},confirmDelete:function(){if($("#deleteModal").modal("hide"),null==f)return;let e=f;utils.showInfiniteLoading("Deleting project "+e+"..."),$.getJSON("/api/v1/projects/delete/"+e).fail((e,t,o)=>{console.warn(o),$.notify({message:"Unable to delete this project (server error). See console for details."},{type:"danger"})}).done(t=>{t.error?(console.warn(t.message),$.notify({message:"Unable to delete this project (application error). See console for details."},{type:"danger"})):($("#line-project-"+e).remove(),n.splice(n.indexOf(e)),$.notify({message:"The project was successfully deleted."},{type:"success"}))}).always(()=>{utils.hideLoading()})},updateState:function(e){let t=$("#line-project-"+e).attr("data-state");"running"==t?(utils.showInfiniteLoading("Stopping project "+e+"..."),$.getJSON("/api/v1/projects/stop/"+e).fail((e,t,o)=>{console.warn(o),$.notify({message:"Unable to stop this project (server error). See console for details."},{type:"danger"})}).done(e=>{e.error?(console.warn(e.message),$.notify({message:"Unable to stop this project (application error). See console for details."},{type:"danger"})):$.notify({message:"The project was successfully stopped."},{type:"success"})}).always(()=>{utils.hideLoading()})):"stopped"==t?(utils.showInfiniteLoading("Starting project "+e+"..."),$.getJSON("/api/v1/projects/start/"+e).fail((e,t,o)=>{console.warn(o),$.notify({message:"Unable to start this project (server error). See console for details."},{type:"danger"})}).done(e=>{e.error?(console.warn(e.message),$.notify({message:"Unable to start this project (application error). See console for details."},{type:"danger"})):$.notify({message:"The project was successfully started."},{type:"success"})}).always(()=>{utils.hideLoading()})):$.notify({message:"Unknown actual state. Please refresh the page and inspect docker events."},{type:"warning"})},restartProject:function(e){"running"==$("#line-project-"+e).attr("data-state")?(utils.showInfiniteLoading("Restarting project "+e+"..."),$.getJSON("/api/v1/projects/stop/"+e).fail((e,t,o)=>{console.warn(o),$.notify({message:"Unable to restart this project (stopping server error). See console for details."},{type:"danger"}),utils.hideLoading()}).done(t=>{t.error?(console.warn(t.message),$.notify({message:"Unable to restart this project (stopping application error). See console for details."},{type:"danger"}),utils.hideLoading()):$.getJSON("/api/v1/projects/start/"+e).fail((e,t,o)=>{console.warn(o),$.notify({message:"Unable to restart this project. See console for details."},{type:"danger"}),$.notify({message:"The project was stopped during the process. You will need to restart it manually."},{type:"warning"}),utils.hideLoading()}).done(e=>{e.error?(console.warn(e.message),$.notify({message:"Unable to restart this project. See console for details."},{type:"danger"}),$.notify({message:"The project was stopped during the process. You will need to restart it manually."},{type:"warning"})):$.notify({message:"The project was successfully restarted."},{type:"success"}),utils.hideLoading()})})):($.notify({message:"Cannot restart a non running project."},{type:"warning"}),g(e,!1))},details:function(e){location.href="details/"+e}}}});