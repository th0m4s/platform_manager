!function(e){var t={};function o(n){if(t[n])return t[n].exports;var r=t[n]={i:n,l:!1,exports:{}};return e[n].call(r.exports,r,r.exports,o),r.l=!0,r.exports}o.m=e,o.c=t,o.d=function(e,t,n){o.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:n})},o.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},o.t=function(e,t){if(1&t&&(e=o(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var n=Object.create(null);if(o.r(n),Object.defineProperty(n,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var r in e)o.d(n,r,function(t){return e[t]}.bind(null,r));return n},o.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return o.d(t,"a",t),t},o.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},o.p="",o(o.s=24)}({24:function(e,t){let o=-1;function n(){o>0&&(clearInterval(o),o=-1)}function r(){o=setInterval(()=>{l(s,!0)},1e4)}let s=[];function a(e,t){let o=t?" disabled":"";return`<li class="list-group-item" id="line-project-${e.name}" data-state="unknown">`+`<b>Project #${e.id} : </b>${e.name} (v${e.version})<span class="text-secondary d-block d-md-inline"><samp class="ml-4">${e.version>0?e.type:"No version deployed"}</samp></span>`+`<span class="float-md-right d-block d-md-inline mt-2 mt-md-0"><div class="btn-group" role="group" style="margin: -3px -10px;"><button class="btn btn-sm btn-info" onclick="projects_list.details('${e.name}')"><i class="fas fa-info-circle"></i> Details</button><button class="btn btn-sm btn-primary" onclick="projects_list.editProject('${e.name}')"${o}><i class="fas fa-edit"></i> Edit</button><button class="btn btn-sm btn-info" data-current="info" id="button-state-${e.name}" onclick="projects_list.updateState('${e.name}')" ${t?'data-perm="no"':""} data-version="${e.version}" disabled><i class="fas fa-sync fa-spin"></i> Syncing...</button>`+`<button class="btn btn-sm btn-secondary" id="button-restart-${e.name}" onclick="projects_list.restartProject('${e.name}')" ${t?'data-perm="no"':""} disabled><i class="fas fa-undo-alt"></i> Restart</button><button class="btn btn-sm btn-danger" onclick="projects_list.deleteProject('${e.name}')"${o}><i class="fas fa-trash-alt"></i> Delete</button></div></span></li>`}function l(e,t){$.getJSON("/api/v1/projects/arerunning/"+e.join(",")).done(o=>{if(o.error)e.forEach(e=>{b(e,!1),i(e,"warning",null,"Unknown",!0,"unknown")}),console.warn(o.message),$.notify({message:"Unable to check states (application error). See console for details."},{type:"danger"}),t&&n();else for(let[e,t]of Object.entries(o.results))t?(b(e,!0),i(e,"dark","stop","Stop",!1,"running")):(b(e,!1),i(e,"success","play","Start",!1,"stopped"))}).fail((o,r,s)=>{e.forEach(e=>{b(e,!1),i(e,"warning",null,"Unknown",!0,"unknown")}),console.warn(s),$.notify({message:"Unable to check states (server error). See console for details."},{type:"danger"}),t&&n()})}function i(e,t,o,n,r,s){let a=$("#button-state-"+e),l=a.attr("data-current");a.parent().parent().parent().attr("data-state",s),a.removeClass("btn-"+l).addClass("btn-"+t).attr("data-current",t).html((null!=o?`<i class="fas fa-${o}"></i> `:"")+n),r?a.attr("disabled","disabled"):"no"!==a.attr("data-perm")&&parseInt(a.attr("data-version"))>0&&a.removeAttr("disabled")}const c=10;let d=0;function p(e){return e=e||c,$.getJSON("/api/v1/projects/list/owned/"+d+"/"+e).fail((e,t,o)=>{$("#owned-status").html(utils.generateAlert("danger","Server error encountered, unable to get owned projects.")),console.warn("Unable to fetch owned projects (server error):",o)}).done(e=>{if(e.error)$("#owned-status").show().html(utils.generateAlert("danger","Fetching error encountered, unable to get owned projects.")),console.warn("Unable to fetch owned projects (application error):",error);else{let t=e.results;t.projects.length>0?$("#owned-status").hide():$("#owned-status").html("No projects found."),function(e){let t=$("#owned-list"),o=[];e.forEach(e=>{o.push(e.name),d=Math.max(d,e.id),t.append(a(e,!1))}),e.length>0&&(t.parent().show(),s=s.concat(o),l(o,!1))}(t.projects),t.hasMore?utils.enableButton($("#owned-more").show(),"Load more projects"):$("#owned-more").hide()}})}let u=0;function f(e){return e=e||c,$.getJSON("/api/v1/projects/list/collabs/"+u+"/"+e).fail((e,t,o)=>{$("#collab-status").html(utils.generateAlert("danger","Server error encountered, unable to get collab projects.")),console.warn("Unable to fetch collab projects (server error):",o)}).done(e=>{if(e.error)$("#collab-status").show().html(utils.generateAlert("danger","Fetching error encountered, unable to get collab projects.")),console.warn("Unable to fetch collab projects (application error):",error);else{let t=e.results;t.projects.length>0?$("#collab-status").hide():$("#collab-status").html("No projects found."),function(e){let t=$("#collab-list"),o=[];e.forEach(e=>{o.push(e.project.name),u=Math.max(u,e.id),t.append(a(e.project,"manage"!==e.mode))}),e.length>0&&(t.parent().show(),s=s.concat(o),l(o,!1))}(t.projects),t.hasMore?utils.enableButton($("#collab-more").show(),"Load more projects"):$("#collab-more").hide()}})}let g=void 0;function b(e,t){let o=$("#button-restart-"+e);t?"no"!==o.attr("data-perm")&&o.removeAttr("disabled"):o.attr("disabled","disabled")}window.projects_list={init:function(){utils.showInfiniteLoading("Loading projects..."),p(c).always(()=>{f(c).always(()=>{utils.hideLoading(),r()})})},requestLimit:c,requestOwned:p,requestCollab:f,editProject:function(e){location.href="edit/"+e},deleteProject:function(e){g=e,$("#deleteModal-content").html(`Do you really want to permanently delete the project <i>${e}</i> from the database and remove all of its contents.<br/><b>This cannot be undone.</b>`);let t=$("#button-confirm-delete");utils.disableButton(t,"Please wait..."),setTimeout(()=>{utils.enableButton(t,"Sure, I want to delete this project")},5e3),$("#deleteModal").modal()},confirmDelete:function(){if($("#deleteModal").modal("hide"),null==g)return;let e=g;g=void 0,utils.showInfiniteLoading("Deleting project "+e+"..."),$.getJSON("/api/v1/projects/delete/"+e).fail((e,t,o)=>{console.warn(o),$.notify({message:"Unable to delete this project (server error). See console for details."},{type:"danger"})}).done(t=>{t.error?(console.warn(t.message),$.notify({message:"Unable to delete this project (application error). See console for details."},{type:"danger"})):($("#line-project-"+e).remove(),$.notify({message:"The project was successfully deleted."},{type:"success"}))}).always(()=>{utils.hideLoading()})},updateState:function(e){let t=$("#line-project-"+e).attr("data-state");"running"==t?(utils.showInfiniteLoading("Stopping project "+e+"..."),$.getJSON("/api/v1/projects/stop/"+e).fail((e,t,o)=>{console.warn(o),$.notify({message:"Unable to stop this project (server error). See console for details."},{type:"danger"})}).done(t=>{t.error?(console.warn(t.message),$.notify({message:"Unable to stop this project (application error). See console for details."},{type:"danger"})):($.notify({message:"The project was successfully stopped."},{type:"success"}),i(e,"success","play","Start",!1,"stopped"),b(e,!1),-1==o&&r())}).always(()=>{utils.hideLoading()})):"stopped"==t?(utils.showInfiniteLoading("Starting project "+e+"..."),$.getJSON("/api/v1/projects/start/"+e).fail((e,t,o)=>{console.warn(o),$.notify({message:"Unable to start this project (server error). See console for details."},{type:"danger"})}).done(t=>{t.error?(console.warn(t.message),$.notify({message:"Unable to start this project (application error). See console for details."},{type:"danger"})):($.notify({message:"The project was successfully started."},{type:"success"}),i(e,"dark","stop","Stop",!1,"running"),b(e,!0),-1==o&&r())}).always(()=>{utils.hideLoading()})):$.notify({message:"Unknown actual state. Please refresh the page and inspect docker events."},{type:"warning"})},restartProject:function(e){"running"==$("#line-project-"+e).attr("data-state")?(utils.showInfiniteLoading("Restarting project "+e+"..."),$.getJSON("/api/v1/projects/stop/"+e).fail((t,o,n)=>{console.warn(n),$.notify({message:"Unable to restart this project (stopping server error). See console for details."},{type:"danger"}),b(e,!1),utils.hideLoading()}).done(t=>{t.error?(console.warn(t.message),$.notify({message:"Unable to restart this project (stopping application error). See console for details."},{type:"danger"}),b(e,!1),utils.hideLoading()):(i(e,"success","play","Start",!1,"stopped"),b(e,!1),-1==o&&r(),$.getJSON("/api/v1/projects/start/"+e).fail((e,t,o)=>{console.warn(o),$.notify({message:"Unable to restart this project (starting server error). See console for details."},{type:"danger"}),$.notify({message:"The project was stopped during the process. You will need to restart it manually."},{type:"warning"}),utils.hideLoading()}).done(t=>{t.error?(console.warn(t.message),$.notify({message:"Unable to restart this project (starting application error). See console for details."},{type:"danger"}),$.notify({message:"The project was stopped during the process. You will need to restart it manually."},{type:"warning"}),utils.hideLoading()):($.notify({message:"The project was successfully restarted."},{type:"success"}),i(e,"dark","stop","Stop",!1,"running"),b(e,!0),-1==o&&r(),utils.hideLoading())}))})):($.notify({message:"Cannot restart a non running project."},{type:"warning"}),b(e,!1))},details:function(e){location.href="details/"+e}}}});