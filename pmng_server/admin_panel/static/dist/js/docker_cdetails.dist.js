!function(e){var t={};function n(o){if(t[o])return t[o].exports;var s=t[o]={i:o,l:!1,exports:{}};return e[o].call(s.exports,s,s.exports,n),s.l=!0,s.exports}n.m=e,n.c=t,n.d=function(e,t,o){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:o})},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},n.t=function(e,t){if(1&t&&(e=n(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var o=Object.create(null);if(n.r(o),Object.defineProperty(o,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var s in e)n.d(o,s,function(t){return e[t]}.bind(null,s));return o},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="",n(n.s=93)}({93:function(e,t){let n,o=!1;let s=!1,a=!1,i=!1,r=null,l=null,c=-1,d=-1;function u(){$.getJSON("/api/v1/docker/containers/details/"+window.reference).fail((e,t,n)=>{s||($.notify({message:"Unable to refresh container details because of a server error."},{type:"danger"}),s=!0,404!=e.status&&clearInterval(window.refreshInterval)),404==e.status&&(i?(setTimeout(()=>{window.location.href="../list"},3e3),$.notify({message:"Multiple consecutive refresh failures. This container doesn't exist anymore."},{type:"danger"})):i=!0),console.warn(n)}).done(e=>{if(e.error)s||($.notify({message:"Unable to refresh container details because of an application error."},{type:"danger"}),s=!0),404==e.code&&(i?(setTimeout(()=>{window.location.href="../list"},3e3),$.notify({message:"Multiple consecutive refresh failures. This container doesn't exist anymore."},{type:"danger"})):i=!0),console.warn(e.code,e.message);else{i=!1,o&&(o=!1,n.open());let t=e.details;$("#info-name").html(p(t.name,"containers")),$("#info-id").html(p(t.containerId,"containers")),$("#info-image").html(t.image);let s=moment(t.createdAt);null!=r&&r.unix()===s.unix()||(r=s,c>0&&clearInterval(c),c=setInterval(f,1e3),f(),$("#info-created").html(s.format("LLL")));let u=moment(t.startedAt);null!=l&&l.unix()===u.unix()||(l=u,d>0&&clearInterval(d),d=setInterval(m,1e3),m(),$("#info-started").html(u.format("LLL"))),a||($("#status-msg").hide(),$("#details-card").show());let h=$("#info-labels").html("");for(let[e,n]of Object.entries(t.labels))h.append(`<li>${e}: ${n}</li>`);let w=$("#info-networks").html("");for(let e of t.networks)w.append(`<li class="list-group-item"><i>Name (Id):</i> ${p(e.name,"networks")} (${p(e.networkId,"networks")})<br/><i>IP address:</i> ${e.ipAddress} (gateway ${e.gateway})<br/><i>MAC address:</i> ${e.macAddress}<br/>${e.aliases.length>0?"<i>Aliases:</i> "+e.aliases.join(", "):""}</li>`)}}).always(()=>{a||(s&&($("#status-msg").html("Unable to find this container."),setTimeout(()=>{window.location.href="../list"},3e3)),a=!0,window.showMain())})}function f(){$("#moment-created").html(r.fromNow())}function m(){$("#moment-started").html(l.fromNow())}function p(e,t){return`<a class="docker-link" href="../../${t}/details/${e}">${e}</a>`}window.docker_cdetails={init:function(){window.hideMain(),window.refreshInterval=setInterval(u,1e4),n=io("/v1/docker"),n.on("connect",(function(){console.log("Socket connected."),n.emit("authentication",{key:API_KEY}),n.on("authenticated",(function(){console.log("Socket authenticated."),n.emit("setup",{type:"stats",container:window.reference}),u()})),n.on("unauthorized",(function(e){window.showMain(),$.notify({message:"Unable to authenticate to the socket. Usage statistics will not be displayed."},{type:"danger"}),$("#info-stats").html("Cannot load container stats."),console.log("Unauthorized from the socket",e)}))})),n.on("error",e=>{window.showMain(),$.notify({message:"Connection with the socket lost. You may need to reload the page (container stats will not work anymore)."},{type:"danger"}),$("#info-stats").html("Cannot load container stats: socket error."),console.log("Socket error",e)}),n.on("stats",e=>{let t=e.mem_max,n=e.mem_used;$("#stats-mem").html(utils.string.formatBytes(n,0)+"/"+utils.string.formatBytes(t,0)+" ("+(n/t*100).toPrecision(2)+"%)"),$("#stats-cpu").html(e.cpu_usage.toPrecision(2)+"%");let o=e.net;$("#stats-net").html("RX "+o.rx+" ("+utils.string.formatBytes(o.rx,0)+") / TX "+o.tx+" ("+utils.string.formatBytes(o.tx,0)+")")}),n.on("setup",e=>{0==e.error&&$("#info-stats").html("<li>Memory usage: <span id='stats-mem'>Loading...</span></li><li>CPU usage: <span id='stats-cpu'>Loading...</span></li><li>Network I/O: <span id='stats-net'>Loading...</span></li>")}),n.on("stats_error",e=>{1==e.stopped?($("#info-stats").html("The container was stopped. Please wait, we're trying to reconnect..."),o=!0,n.close()):$("#info-stats").html("Cannot load container stats: "+(e.message||e))})}}}});