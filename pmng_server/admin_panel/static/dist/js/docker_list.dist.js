!function(e){var t={};function n(i){if(t[i])return t[i].exports;var r=t[i]={i:i,l:!1,exports:{}};return e[i].call(r.exports,r,r.exports,n),r.l=!0,r.exports}n.m=e,n.c=t,n.d=function(e,t,i){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:i})},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},n.t=function(e,t){if(1&t&&(e=n(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var i=Object.create(null);if(n.r(i),Object.defineProperty(i,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var r in e)n.d(i,r,function(t){return e[t]}.bind(null,r));return i},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="",n(n.s=18)}({18:function(e,t){let n=!1,i=!1;function r(){$.getJSON("/api/v1/docker/containers/running").fail((e,t,i)=>{n||($.notify({message:"Unable to list containers because of a server error."},{type:"danger"}),n=!0,clearInterval(window.refreshInterval),$(".status-msg").html("An error occured while the list was retrieved by the server. Please try again.")),console.warn(i)}).done(e=>{if(e.error)n||($.notify({message:"Unable to list containers because of an application error."},{type:"danger"}),n=!0,clearInterval(window.refreshInterval),$(".status-msg").html("An error occured while the list was processed by the platform. Please try again.")),console.warn(e.code,e.message);else{let n=e.containers;if(0==n.projects.length)$("#projects-card").hide(),$("#projects-status").html("No running project containers.").show();else{$("#projects-status").hide();let e=$("#projects-list").html("");for(let t of n.projects){let n=`<li class="list-group-item" id="line-project-${t.name}">`+`<b>Project ${t.projectname} : </b> Running in container <i>${t.name}</i> (id ${t.id})`+`<span class="float-md-right d-block d-md-inline mt-2 mt-md-0"><div class="btn-group" role="group" style="margin: -3px -10px;"><button class="btn btn-sm btn-info" onclick="docker_list.showContainerDetails('${t.name}')"><i class="fas fa-info-circle"></i> Details</button></div></span> </li>`;e.append(n)}e.parent().show()}if(0==n.platform.length)$("#platform-card").hide(),$("#platform-status").html("No running platform containers.").show();else{$("#platform-status").hide();let e=$("#platform-list").html("");for(let i of n.platform){let n=`<li class="list-group-item" id="line-platform-${i.name}">`+`<b>${t=i.kind,({globalplugin:"Global plugin",plugin:"Plugin"}[t]||"")+" "+(i.pluginname||"<i>Unknown</i>")+("plugin"==i.kind?` (for project <i>${i.projectname}</i>)`:"")} : </b> Running in container <i>${i.name}</i> (id ${i.id})`+`<span class="float-md-right d-block d-md-inline mt-2 mt-md-0"><div class="btn-group" role="group" style="margin: -3px -10px;"><button class="btn btn-sm btn-info" onclick="docker_list.showContainerDetails('${i.name}')"><i class="fas fa-info-circle"></i> Details</button></div></span> </li>`;e.append(n)}e.parent().show()}if(0==n.others.length)$("#others-card").hide(),$("#others-status").html("No other running containers.").show();else{$("#others-status").hide();let e=$("#others-list").html("");for(let t of n.others){let n=`<li class="list-group-item" id="line-others-${t.name}">`+`<b>${o(t.kind)+" <i>"+t.name}</i> : </b> Based on image <i>${t.image}</i> (id ${t.id})`+`<span class="float-md-right d-block d-md-inline mt-2 mt-md-0"><div class="btn-group" role="group" style="margin: -3px -10px;"><button class="btn btn-sm btn-info" onclick="docker_list.showContainerDetails('${t.name}')"><i class="fas fa-info-circle"></i> Details</button></div></span> </li>`;e.append(n)}e.parent().show()}}var t}).always(()=>{i||(i=!0,utils.hideLoading())})}function o(e){return{not_reco:"Unrecognized PMNG container",not_pmng:"Third party container"}[e]||""}window.docker_list={init:function(){utils.showInfiniteLoading("Loading containers..."),window.refreshInterval=setInterval(r,1e4),r()},showContainerDetails:function(e){window.location.href="details/"+e}}}});