!function(e){var t={};function n(o){if(t[o])return t[o].exports;var i=t[o]={i:o,l:!1,exports:{}};return e[o].call(i.exports,i,i.exports,n),i.l=!0,i.exports}n.m=e,n.c=t,n.d=function(e,t,o){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:o})},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},n.t=function(e,t){if(1&t&&(e=n(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var o=Object.create(null);if(n.r(o),Object.defineProperty(o,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var i in e)n.d(o,i,function(t){return e[t]}.bind(null,i));return o},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="",n(n.s=112)}({10:function(e,t,n){(function(e,t){!function(e,n){"use strict";if(!e.setImmediate){var o,i,a,r,s,l=1,c={},d=!1,u=e.document,p=Object.getPrototypeOf&&Object.getPrototypeOf(e);p=p&&p.setTimeout?p:e,"[object process]"==={}.toString.call(e.process)?o=function(e){t.nextTick((function(){f(e)}))}:!function(){if(e.postMessage&&!e.importScripts){var t=!0,n=e.onmessage;return e.onmessage=function(){t=!1},e.postMessage("","*"),e.onmessage=n,t}}()?e.MessageChannel?((a=new MessageChannel).port1.onmessage=function(e){f(e.data)},o=function(e){a.port2.postMessage(e)}):u&&"onreadystatechange"in u.createElement("script")?(i=u.documentElement,o=function(e){var t=u.createElement("script");t.onreadystatechange=function(){f(e),t.onreadystatechange=null,i.removeChild(t),t=null},i.appendChild(t)}):o=function(e){setTimeout(f,0,e)}:(r="setImmediate$"+Math.random()+"$",s=function(t){t.source===e&&"string"==typeof t.data&&0===t.data.indexOf(r)&&f(+t.data.slice(r.length))},e.addEventListener?e.addEventListener("message",s,!1):e.attachEvent("onmessage",s),o=function(t){e.postMessage(r+t,"*")}),p.setImmediate=function(e){"function"!=typeof e&&(e=new Function(""+e));for(var t=new Array(arguments.length-1),n=0;n<t.length;n++)t[n]=arguments[n+1];var i={callback:e,args:t};return c[l]=i,o(l),l++},p.clearImmediate=m}function m(e){delete c[e]}function f(e){if(d)setTimeout(f,0,e);else{var t=c[e];if(t){d=!0;try{!function(e){var t=e.callback,n=e.args;switch(n.length){case 0:t();break;case 1:t(n[0]);break;case 2:t(n[0],n[1]);break;case 3:t(n[0],n[1],n[2]);break;default:t.apply(void 0,n)}}(t)}finally{m(e),d=!1}}}}}("undefined"==typeof self?void 0===e?this:e:self)}).call(this,n(2),n(5))},112:function(e,t,n){(function(e){let t=!1;function n(){let e=Object.keys(window.project.rgitIntegrations).length,n=e>0;if(e>0){let e=$("#rgitinte-list").html("");for(let[n,o]of Object.entries(window.project.rgitIntegrations))e.append(i(n,o.repo,o.branch,!t))}$("#rgitinte-status")[n?"hide":"show"](),$("#rgitinte-card")[n?"show":"hide"](),$("#rgitinte-add")[e<Object.keys(window.remoteGits).length&&t?"show":"hide"]()}function o(e){return"view"==e?"View-only mode":"Full-access mode"}function i(e,t,n,o){let i=window.remoteGits[e];return`<li class="list-group-item" id="line-rgitinte-${e}">`+`<b>${(0!=i.icon?`<i class="${i.icon}"></i> `:"")+i.name}: </b>${t} <span class="text-secondary d-block d-md-inline"><samp class="ml-4">${n}</samp></span>`+(o?"":`<span class="float-md-right d-block d-md-inline mt-2 mt-md-0"><div class="btn-group" role="group" style="margin: -3px -10px;"><button class="btn btn-sm btn-danger" onclick="project_details.removeGitInte('${e}', this)"><i class="fas fa-trash-alt"></i> Remove</button>`+"</div></span>")+"</li>"}function a(t,n,i,a,r){return e(()=>{$("#button-collab-invert-"+t).removeClass("btn-info"),l(t,a)}),`<li class="list-group-item" id="line-collab-${t}">`+`<b>Collaboration #${t}: </b>${i} (user #${n})<span class="text-secondary d-block d-md-inline"><samp class="ml-4" id="collab-explaination-${t}">${o(a)}</samp></span>`+(r?"":`<span class="float-md-right d-block d-md-inline mt-2 mt-md-0"><div class="btn-group" role="group" style="margin: -3px -10px;"><button class="btn btn-sm btn-danger" onclick="project_details.removeCollab('${i}', ${t}, this)"><i class="fas fa-trash-alt"></i> Remove</button>`+`<button class="btn btn-sm btn-info" data-mode="unknown" id="button-collab-invert-${t}" onclick="project_details.invertCollabMode(${t})"><i class="fas fa-sync fa-spin"></i> Loading...</button></div></span>`)+"</li>"}function r(e,t,n,o){return`<li class="list-group-item" id="line-domain-${e}">`+`<b>Custom domain #${e}: </b>${t} (subs ${n?"enabled":"disabled"})`+(o?"":`<span class="float-md-right d-block d-md-inline mt-2 mt-md-0"><div class="btn-group" role="group" style="margin: -3px -10px;"><button class="btn btn-sm btn-danger" onclick="project_details.removeDomain('${t}', ${e}, this)"><i class="fas fa-trash-alt"></i> Remove</button></div></span>`)+"</li>"}function s(e,t,n){return`<li class="list-group-item" id="line-plugin-${e}">`+`<b>Plugin ${e}: </b> <span id="plugin-usage-${e}">Loading usage...</span>`+'<span class="float-md-right d-block d-md-inline mt-2 mt-md-0"><div class="btn-group" role="group" style="margin: -3px -10px;">'+(t.detailed?`<button class="btn btn-sm btn-info" onclick="project_details.pluginDetails('${e}')"><i class="fas fa-info-circle"></i> View plugin details</button>`:"")+(t.configurable&&!n?`<button class="btn btn-sm btn-primary" onclick="project_details.editPlugin('${e}')"><i class="fas fa-edit"></i> Edit plugin configuration</button>`:"")+"</div></span></li>"}function l(e,t){$("#button-collab-invert-"+e).html("view"==t?'<i class="fas fa-lock"></i> Give full access':'<i class="fas fa-lock-open"></i> Demote access').removeClass("btn-"+("view"==t?"primary":"success")).addClass("btn-"+("view"==t?"success":"primary")).attr("data-mode",t),$("#collab-explaination-"+e).html(o(t))}let c=!1;function d(){$.getJSON("/api/v1/projects/usage/"+window.project.name).fail((e,t,n)=>{c||($.notify({message:"Unable to check usage status because of a server error."},{type:"danger"}),c=!0),console.warn(n)}).done(e=>{if(e.error)c||($.notify({message:"Unable to check usage status because of an application error."},{type:"danger"}),c=!0),console.warn(e.code,e.message);else for(let[t,n]of Object.entries(e.usage)){let e=$("#plugin-usage-"+t);switch(n.type){case"measure_error":console.warn(n.error),e.html("Unable to measure usage for this plugin.");break;case"unlimited":case"limited":e.html(n.formatted);break;case"custom_text":e.html(n.text);break;case"not_measurable":e.html("Usage not measurable for this plugin.")}}})}let u=void 0,p=void 0,m=void 0;let f=!0;function g(){f?($("#detailsShowHide-button").html("Reveal sensitive hidden details"),$(".hidden-details").css("user-select","none").css("filter","blur(5px)")):($("#detailsShowHide-button").html("Hide sensitive details"),$(".hidden-details").css("user-select","inherit").css("filter","blur(0px)")),f=!f}function h(e){return e?$("#forcepush-text").html("Cancel git forced push"):$("#forcepush-text").html("Allow git forced push")}function b(){$("#gitinte-repo").html("").parent().parent().hide(),v()}function v(){$("#gitinte-branch").html("").parent().parent().hide(),$("#gitinte-confirm").attr("disabled","disabled")}let w={};window.project_details={init:function(){if(window.owner.length>0?$("#owner-info").html(" (project owned by "+window.owner+")"):t=!0,$("#rgitinte-status").html("No git integrations on this project."),n(),window.project.collabs.length>0){let e=$("#collabs-list");for(let n of window.project.collabs)e.append(a(n.collabid,n.userid,n.name,n.mode,!t));e.parent().show(),$("#collabs-status").hide()}else $("#collabs-status").html("No collaborations on this project.");if(window.project.domains.length>0){let e=$("#domains-list");for(let n of window.project.domains)e.append(r(n.domainid,n.domain,n.enablesub,!t));e.parent().show(),$("#domains-status").hide()}else $("#domains-status").html("No custom domains bound to this project.");if(Object.keys(window.project.plugins).length>0){let e=$("#plugins-list");for(let[n,o]of Object.entries(window.project.plugins))e.append(s(n,o,!t));setInterval(d,3e4);d(),e.parent().show(),$("#plugins-status").hide()}else $("#plugins-status").html("No plugins added to this project.");h(window.project.forcepush).parent().removeAttr("disabled")},invertCollabMode:function(e){let t="view";"view"==$("#button-collab-invert-"+e).attr("data-mode")&&(t="manage");let n=$("#button-collab-invert-"+e);utils.disableButton(n),$.post("/api/v1/projects/updatecollab/"+e+"/"+t).fail((e,t,o)=>{$.notify({message:"Unable to change the mode of this collaboration because of a server error."},{type:"danger"}),console.warn(o),utils.enableButton(n)}).done(o=>{o.error?($.notify({message:"Unable to change the mode of this collaboration because of an application error."},{type:"danger"}),console.warn(error),utils.enableButton(n)):(l(e,t),"view"==t?$.notify({message:"Collaboration mode changed to <i>View-only</i>."},{type:"success"}):$.notify({message:"Collaboration mode changed to <i>Full-access</i>."},{type:"success"}),utils.enableButton(n))})},removeCollab:function(e,t,n){m=n,u=t,p="collab",$("#deleteModal-content").html(`Do you want to remove <i>${e}</i> as a collaborator from this project?`),$("#deleteModal-title").html("Remove a collaborator"),$("#deleteModal-confirm").html("Remove this collaborator"),$("#deleteModal").modal()},removeDomain:function(e,t,n){m=n,u=t,p="domain",$("#deleteModal-content").html(`Do you want to remove the domain <i>${e}</i> from this project?`),$("#deleteModal-title").html("Remove a custom domain"),$("#deleteModal-confirm").html("Remove this domain"),$("#deleteModal").modal()},confirmDelete:function(){switch($("#deleteModal").modal("hide"),utils.disableButton(m),p){case"collab":$.post("/api/v1/projects/removecollab/"+u).fail((e,t,n)=>{$.notify({message:"Unable to remove this collaboration because of a server error."},{type:"danger"}),console.warn(n),utils.enableButton(m)}).done(e=>{e.error?($.notify({message:"Unable to remove this collaboration because of an application error."},{type:"danger"}),console.warn(error),utils.enableButton(m)):($(m).parent().parent().parent().remove(),$.notify({message:"This collaborator was removed for the project."},{type:"success"}))});break;case"domain":$.post("/api/v1/projects/removedomain/"+u).fail((e,t,n)=>{$.notify({message:"Unable to remove this custom domain because of a server error."},{type:"danger"}),console.warn(n),utils.enableButton(m)}).done(e=>{e.error?($.notify({message:"Unable to remove this custom domain because of an application error."},{type:"danger"}),console.warn(error),utils.enableButton(m)):($(m).parent().parent().parent().remove(),$.notify({message:"This custom domain was removed.<br/>Users cannot use it anymore to access the project."},{type:"success"}))});break;case"rgitinte":$.getJSON("/api/v1/git/"+u+"/removeIntegration/"+window.project.name).fail((e,t,n)=>{$.notify({message:"Cannot remove this integration. Open the console for details."},{type:"danger"}),console.error("Cannot remove integration (server "+t+"): "+n)}).done(e=>{e.error?($.notify({message:"Cannot remove this integration. Open the console for details."},{type:"danger"}),console.error("Cannot remove integration (application): "+error)):($.notify({message:"Integration successfully removed."},{type:"success"}),delete window.project.rgitIntegrations[u],n())});break;default:$.notify({message:`Cannot delete an object of type ${p}.`},{type:"warning"})}},editPlugin:function(e){location.href="../pluginConfig/"+window.project.name+"/"+e},pluginDetails:function(e){utils.showInfiniteLoading("Loading plugin details..."),$.getJSON("/api/v1/projects/pluginDetails/"+window.project.name+"/"+e).fail((e,t,n)=>{$.notify({message:"Unable to plugins details because of a server error."},{type:"danger"}),console.warn("Cannot load plugin details:",n)}).done(t=>{if(t.error)$.notify({message:"Unable to plugins details because of an application error."},{type:"danger"}),console.warn("Cannot load plugin details:",error);else{let n=!0,o=t.details;switch(o.type){case"html":$("#detailsModal-content").html(o.html);break;default:n=!1}n?($("#detailsModal-title").html("Details of plugin <i>"+e+"</i>"),$("#detailsModal").modal(),$(".hidden-details").length>0?(f=!0,g(),$("#detailsShowHide-button").show()):$("#detailsShowHide-button").hide()):$.notify({message:"This plugin doesn't have any details here."},{type:"warning"})}}).always(()=>{utils.hideLoading()})},toggleHiddenDetails:g,toggleForcePush:function(){let e=!window.project.forcepush,t=$("#toggle-forcepush-btn");t.attr("disabled","disabled"),$.getJSON("/api/v1/projects/updateForcepush/"+window.project.name+"/"+e).fail((e,t,n)=>{$.notify({message:"Unable to update forcepush."},{type:"danger"}),console.warn("Cannot update forcepush:",n),textSpan.html("Server error")}).done(n=>{n.error?($.notify({message:"Unable to update forcepush."},{type:"danger"}),console.warn("Cannot update forcepush:",error),textSpan.html("Application error")):(t.removeAttr("disabled"),h(e),window.project.forcepush=e)})},addGitInte:function(){let e=$("#gitinte-provider").html("<option selected value='' id='gitinte-provider-empty'></option>"),t=Object.keys(window.project.rgitIntegrations);for(let n in remoteGits)t.includes(n)||e.append(`<option value="${n}">${remoteGits[n].name}</option>`);b(),$("#gitinte-viewaccount").hide(),$("#addGitInte-modal select").removeAttr("disabled"),$("#addGitInte-modal").modal()},gitInteProviderChosen:function(){$("#gitinte-provider-empty").remove();let e=$("#gitinte-provider").val();e.length>0?remoteGits[e].available?($("#gitinte-provider, #gitinte-repo").attr("disabled","disabled"),$("#gitinte-repo").parent().parent().show(),$("#gitinte-viewaccount").hide(),v(),$.getJSON("/api/v1/git/github/listRepositories").fail((e,t,n)=>{$("#addGitInte-modal").modal("hide"),$.notify({message:"Cannot list repositories. Open the console for details."},{type:"warning"}),console.error("Cannot list repos (server "+t+"): "+n)}).done(e=>{if(e.error)$("#addGitInte-modal").modal("hide"),$.notify({message:"Cannot list repositories. Open the console for details."},{type:"warning"}),console.error("Cannot list repos (application): "+e.message,message.details);else{$("#gitinte-provider, #gitinte-repo").removeAttr("disabled");let t=$("#gitinte-repo").html("<option selected value='' id='gitinte-repo-empty'></option>");w={},lastFetchedBranches=[];for(let n of e.repositories)w[n.repo_id]=n,t.append(`<option value="${n.repo_id}">${n.full_name}</option>`)}})):(b(),$("#gitinte-viewaccount").show()):b()},gitInteRepoChosen:function(){$("#gitinte-provider-empty").remove();let e=$("#gitinte-repo").val().toString();e.length>0?($("#gitinte-provider, #gitinte-repo, #gitinte-branch").attr("disabled","disabled"),$("#gitinte-branch").parent().parent().show(),$.getJSON("/api/v1/git/github/listBranches/"+w[e].full_name).fail((e,t,n)=>{$("#addGitInte-modal").modal("hide"),$.notify({message:"Cannot list branches. Open the console for details."},{type:"warning"}),console.error("Cannot list branches (server "+t+"): "+n)}).done(e=>{if(e.error)$("#addGitInte-modal").modal("hide"),$.notify({message:"Cannot list branches. Open the console for details."},{type:"warning"}),console.error("Cannot list branches (application): "+e.message,e.details);else{$("#gitinte-provider, #gitinte-repo, #gitinte-branch").removeAttr("disabled");let t=$("#gitinte-branch").html("<option selected value='' id='gitinte-branch-empty'></option>");for(let n of e.branches)t.append(`<option value="${n}">${n}</option>`)}})):v()},gitInteBranchChosen:function(){$("#gitinte-branch-empty").remove(),$("#gitinte-confirm").removeAttr("disabled")},confirmAddGitInte:function(){$("#addGitInte-modal").modal("hide");let e=$("#gitinte-provider").val()||"",t=$("#gitinte-repo").val()||"",o=$("#gitinte-branch").val()||"";e.length>0&&t.length>0&&o.length>0?(utils.showInfiniteLoading("Adding "+remoteGits[e].name+" integration..."),$.post("/api/v1/git/"+e+"/addIntegration",{repo_id:t,branch:o,projectname:window.project.name}).fail((e,t,n)=>{$.notify({message:"Cannot add this integration. Open the console for details."},{type:"danger"}),console.error("Cannot add integration (server "+t+"): "+n)}).done(i=>{i.error?($.notify({message:"Cannot add this integration. Open the console for details."},{type:"danger"}),console.error("Cannot add integration (application): "+error)):($.notify({message:"Integration added with success."},{type:"success"}),window.project.rgitIntegrations[e]={branch:o,repo:w[t].full_name,remote:e},n())}).always(()=>{utils.hideLoading()})):$.notify({message:"Invalid git integration properties."},{type:"warning"})},removeGitInte:function(e,t){null!=window.project.rgitIntegrations[e]?(m=t,u=e,p="rgitinte",$("#deleteModal-content").html(`Do you want to remove the ${remoteGits[e].name} integration from this project?`),$("#deleteModal-title").html("Remove a git integration"),$("#deleteModal-confirm").html("Remove this integration"),$("#deleteModal").modal()):$.notify({message:"Invalid git provider."},{type:"warning"})}}}).call(this,n(9).setImmediate)},2:function(e,t){var n;n=function(){return this}();try{n=n||new Function("return this")()}catch(e){"object"==typeof window&&(n=window)}e.exports=n},5:function(e,t){var n,o,i=e.exports={};function a(){throw new Error("setTimeout has not been defined")}function r(){throw new Error("clearTimeout has not been defined")}function s(e){if(n===setTimeout)return setTimeout(e,0);if((n===a||!n)&&setTimeout)return n=setTimeout,setTimeout(e,0);try{return n(e,0)}catch(t){try{return n.call(null,e,0)}catch(t){return n.call(this,e,0)}}}!function(){try{n="function"==typeof setTimeout?setTimeout:a}catch(e){n=a}try{o="function"==typeof clearTimeout?clearTimeout:r}catch(e){o=r}}();var l,c=[],d=!1,u=-1;function p(){d&&l&&(d=!1,l.length?c=l.concat(c):u=-1,c.length&&m())}function m(){if(!d){var e=s(p);d=!0;for(var t=c.length;t;){for(l=c,c=[];++u<t;)l&&l[u].run();u=-1,t=c.length}l=null,d=!1,function(e){if(o===clearTimeout)return clearTimeout(e);if((o===r||!o)&&clearTimeout)return o=clearTimeout,clearTimeout(e);try{o(e)}catch(t){try{return o.call(null,e)}catch(t){return o.call(this,e)}}}(e)}}function f(e,t){this.fun=e,this.array=t}function g(){}i.nextTick=function(e){var t=new Array(arguments.length-1);if(arguments.length>1)for(var n=1;n<arguments.length;n++)t[n-1]=arguments[n];c.push(new f(e,t)),1!==c.length||d||s(m)},f.prototype.run=function(){this.fun.apply(null,this.array)},i.title="browser",i.browser=!0,i.env={},i.argv=[],i.version="",i.versions={},i.on=g,i.addListener=g,i.once=g,i.off=g,i.removeListener=g,i.removeAllListeners=g,i.emit=g,i.prependListener=g,i.prependOnceListener=g,i.listeners=function(e){return[]},i.binding=function(e){throw new Error("process.binding is not supported")},i.cwd=function(){return"/"},i.chdir=function(e){throw new Error("process.chdir is not supported")},i.umask=function(){return 0}},9:function(e,t,n){(function(e){var o=void 0!==e&&e||"undefined"!=typeof self&&self||window,i=Function.prototype.apply;function a(e,t){this._id=e,this._clearFn=t}t.setTimeout=function(){return new a(i.call(setTimeout,o,arguments),clearTimeout)},t.setInterval=function(){return new a(i.call(setInterval,o,arguments),clearInterval)},t.clearTimeout=t.clearInterval=function(e){e&&e.close()},a.prototype.unref=a.prototype.ref=function(){},a.prototype.close=function(){this._clearFn.call(o,this._id)},t.enroll=function(e,t){clearTimeout(e._idleTimeoutId),e._idleTimeout=t},t.unenroll=function(e){clearTimeout(e._idleTimeoutId),e._idleTimeout=-1},t._unrefActive=t.active=function(e){clearTimeout(e._idleTimeoutId);var t=e._idleTimeout;t>=0&&(e._idleTimeoutId=setTimeout((function(){e._onTimeout&&e._onTimeout()}),t))},n(10),t.setImmediate="undefined"!=typeof self&&self.setImmediate||void 0!==e&&e.setImmediate||this&&this.setImmediate,t.clearImmediate="undefined"!=typeof self&&self.clearImmediate||void 0!==e&&e.clearImmediate||this&&this.clearImmediate}).call(this,n(2))}});