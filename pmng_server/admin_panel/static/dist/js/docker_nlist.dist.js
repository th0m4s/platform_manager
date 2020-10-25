!function(e){var t={};function o(n){if(t[n])return t[n].exports;var r=t[n]={i:n,l:!1,exports:{}};return e[n].call(r.exports,r,r.exports,o),r.l=!0,r.exports}o.m=e,o.c=t,o.d=function(e,t,n){o.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:n})},o.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},o.t=function(e,t){if(1&t&&(e=o(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var n=Object.create(null);if(o.r(n),Object.defineProperty(n,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var r in e)o.d(n,r,function(t){return e[t]}.bind(null,r));return n},o.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return o.d(t,"a",t),t},o.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},o.p="",o(o.s=98)}({98:function(e,t){let o=void 0;function n(e){e?($("#networks-status").hide(),$("#networks-card").show()):($("#networks-status").html("No network found (check your Docker installation for bridge, none and host networks).").show(),$("#networks-card").hide())}function r(e){let t=`<li class="list-group-item line-network" data-sort="${e.name}" id="line-${e.name}">`+`<b>Network ${i(e.name)}</b> <i>(id ${i(e.networkId)})</i>`+`<span class="float-md-right d-block d-md-inline mt-2 mt-md-0"><div class="btn-group" role="group" style="margin: -3px -10px;"><button class="btn btn-sm btn-info" onclick="docker_nlist.showNetworkDetails('${e.name}')"><i class="fas fa-info-circle"></i> Details</button></div></span> </li>`;$("#networks-list").append(t),function(){let e=$("#networks-list"),t=$.makeArray(e.children(".line-network"));t=t.sort((e,t)=>{let o=$(e).attr("data-sort"),n=$(t).attr("data-sort");return o<n?-1:o>n?1:0}),e.html(""),$.each(t,(function(){e.append(this)}))}()}function i(e){return`<a href="details/${e}" class="docker-link">${e}</a>`}window.docker_nlist={init:function(){window.hideMain(),o=io("/v1/docker"),o.on("connect",(function(){console.log("Socket connected."),o.emit("authentication",{key:API_KEY}),o.on("authenticated",(function(){console.log("Socket authenticated."),o.emit("setup",{type:"networks"}),$.getJSON("/api/v1/docker/networks/list").fail((e,t,o)=>{$.notify({message:"Unable to list networks because of a server error."},{type:"danger"}),console.warn(o),$(".status-msg").html("An error occured while the list was retrieved by the server. Please reload the page.")}).done(e=>{if(e.error)$.notify({message:"Unable to list networks because of an application error."},{type:"danger"}),console.warn(e.code,e.message),$(".status-msg").html("An error occured while the list was processed by the platform. Please reload the page.");else{let t=e.networks;if($("#networks-list").html(""),0==t.length)n(!1);else{n(!0),$("#networks-status").hide();for(let e of t)r(e)}}}).always(()=>{window.showMain()})})),o.on("unauthorized",(function(e){window.showMain(),$.notify({message:"Unable to authenticate to the socket. You may need to reload the page."},{type:"danger"}),console.log("Unauthorized from the socket",e)}))})),o.on("error",e=>{window.showMain(),$.notify({message:"Connection with the socket lost. You may need to reload the page."},{type:"danger"}),console.log("Socket error",e)}),o.on("network_action",e=>{let t=e.item;switch(e.action){case"add":r(t);break;case"remove":$("#line-"+t).remove()}})},showNetworkDetails:function(e){window.location.href="details/"+e}}}});