!function(e){var t={};function n(o){if(t[o])return t[o].exports;var i=t[o]={i:o,l:!1,exports:{}};return e[o].call(i.exports,i,i.exports,n),i.l=!0,i.exports}n.m=e,n.c=t,n.d=function(e,t,o){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:o})},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},n.t=function(e,t){if(1&t&&(e=n(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var o=Object.create(null);if(n.r(o),Object.defineProperty(o,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var i in e)n.d(o,i,function(t){return e[t]}.bind(null,i));return o},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="",n(n.s=18)}({18:function(e,t){let n=void 0;let o={projects:"No running project containers.",platform:"No running platform containers.",others:"No other running containers."};function i(e,t){t?($("#"+e+"-card").show(),$("#"+e+"-status").hide()):($("#"+e+"-card").hide(),$("#"+e+"-status").html(o[e]).show())}function r(e){let t=`<li class="list-group-item line-project" id="line-${e.name}">`+`<b>Project ${e.projectname} : </b> Running in container <i>${s(e.name)}</i> (id ${s(e.id)})`+`<span class="float-md-right d-block d-md-inline mt-2 mt-md-0"><div class="btn-group" role="group" style="margin: -3px -10px;"><button class="btn btn-sm btn-info" onclick="docker_clist.showContainerDetails('${e.name}')"><i class="fas fa-info-circle"></i> Details</button></div></span> </li>`;$("#projects-list").append(t)}function a(e){let t=`<li class="list-group-item line-platform" id="line-${e.name}">`+`<b>${n=e.kind,({globalplugin:"Global plugin",plugin:"Plugin",deployment:"Deployment"}[n]||"")+("deployment"!=e.kind?" "+(e.pluginname||"<i>Unknown</i>"):"")+("plugin"==e.kind?` (for project <i>${e.projectname}</i>)`:"deployment"==e.kind?` of project ${e.projectname}`:"")} : </b> Running in container <i>${s(e.name)}</i> (id ${s(e.id)})`+`<span class="float-md-right d-block d-md-inline mt-2 mt-md-0"><div class="btn-group" role="group" style="margin: -3px -10px;"><button class="btn btn-sm btn-info" onclick="docker_c\n    list.showContainerDetails('${e.name}')"><i class="fas fa-info-circle"></i> Details</button></div></span> </li>`;var n;$("#platform-list").append(t)}function l(e){let t=`<li class="list-group-item line-other" id="line-${e.name}">`+`<b>${n=e.kind,({not_reco:"Unrecognized PMNG container",not_pmng:"Third party container"}[n]||"")+" <i>"+s(e.name)}</i> : </b> Based on image <i>${e.image}</i> (id ${s(e.id)})`+`<span class="float-md-right d-block d-md-inline mt-2 mt-md-0"><div class="btn-group" role="group" style="margin: -3px -10px;"><button class="btn btn-sm btn-info" onclick="docker_clist.showContainerDetails('${e.name}')"><i class="fas fa-info-circle"></i> Details</button></div></span> </li>`;var n;$("#others-list").append(t)}function s(e){return`<a href="details/${e}" class="docker-link">${e}</a>`}window.docker_clist={init:function(){utils.showInfiniteLoading("Loading containers..."),n=io("/v1/docker"),n.on("connect",(function(){console.log("Socket connected."),n.emit("authentication",{key:API_KEY}),n.on("authenticated",(function(){console.log("Socket authenticated."),n.emit("setup",{type:"containers"}),$("#projects-list").html(""),$.getJSON("/api/v1/docker/containers/running").fail((e,t,o)=>{$.notify({message:"Unable to list containers because of a server error."},{type:"danger"}),console.warn(o),$(".status-msg").html("An error occured while the list was retrieved by the server. Please reload the page."),n.close()}).done(e=>{if(e.error)$.notify({message:"Unable to list containers because of an application error."},{type:"danger"}),console.warn(e.code,e.message),$(".status-msg").html("An error occured while the list was processed by the platform. Please reload the page."),n.close();else{let t=e.containers;if(0==t.projects.length)i("projects",!1);else{i("projects",!0);for(let e of t.projects)r(e)}if(0==t.platform.length)i("platform",!1);else{i("platform",!0);for(let e of t.platform)a(e)}if(0==t.others.length)i("others",!1);else{i("others",!0);for(let e of t.others)l(e)}}}).always(()=>{utils.hideLoading()})})),n.on("unauthorized",(function(e){utils.hideLoading(),$.notify({message:"Unable to authenticate to the socket. Please reload the page."},{type:"danger"}),console.log("Unauthorized from the socket",e)}))})),n.on("error",e=>{utils.hideLoading(),$.notify({message:"Connection with the socket lost. Please reload the page."},{type:"danger"}),console.log("Socket error",e)}),n.on("container_action",e=>{let t=e.item;switch(e.action){case"add":let e=void 0;switch(t.category){case"projects":e=r;break;case"platform":e=a;break;case"others":e=l}null!=e&&e(t.result);break;case"remove":$("#line-"+t).remove()}i("projects",$(".line-project").length>0),i("platform",$(".line-platform").length>0),i("others",$(".line-other").length>0)})},showContainerDetails:function(e){window.location.href="details/"+e}}}});