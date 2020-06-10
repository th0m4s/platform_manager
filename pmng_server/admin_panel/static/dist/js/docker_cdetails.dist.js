!function(e){var t={};function n(r){if(t[r])return t[r].exports;var o=t[r]={i:r,l:!1,exports:{}};return e[r].call(o.exports,o,o.exports,n),o.l=!0,o.exports}n.m=e,n.c=t,n.d=function(e,t,r){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:r})},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},n.t=function(e,t){if(1&t&&(e=n(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var r=Object.create(null);if(n.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var o in e)n.d(r,o,function(t){return e[t]}.bind(null,o));return r},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="",n(n.s=17)}({17:function(e,t){let n=!1,r=!1,o=!1,i=null,a=null,l=-1,s=-1;function d(){$.getJSON("/api/v1/docker/containers/details/"+window.nameOrId).fail((e,t,r)=>{n||($.notify({message:"Unable to refresh container details because of a server error."},{type:"danger"}),n=!0,404!=e.status&&clearInterval(window.refreshInterval)),404==e.status&&(o?(setTimeout(()=>{window.location.href="../list"},3e3),$.notify({message:"Multiple consecutive refresh failures. This container doesn't exist anymore."},{type:"danger"})):o=!0),console.warn(r)}).done(e=>{if(e.error)n||($.notify({message:"Unable to refresh container details because of an application error."},{type:"danger"}),n=!0),console.warn(e.code,e.message);else{o=!1;let t=e.details;$("#info-name").html(c(t.name,"containers")),$("#info-id").html(c(t.containerId,"containers")),$("#info-image").html(t.image);let n=moment(t.createdAt);null!=i&&i.unix()===n.unix()||(i=n,l>0&&clearInterval(l),l=setInterval(f,1e3),f(),$("#info-created").html(n.format("LLL")));let d=moment(t.startedAt);null!=a&&a.unix()===d.unix()||(a=d,s>0&&clearInterval(s),s=setInterval(u,1e3),u(),$("#info-started").html(d.format("LLL"))),r||($("#status-msg").hide(),$("#details-card").show());let m=$("#info-labels").html("");for(let[e,n]of Object.entries(t.labels))console.log(e,n),m.append(`<li>${e}: ${n}</li>`);let p=$("#info-networks").html("");for(let e of t.networks)p.append(`<li class="list-group-item"><i>Name (Id):</i> ${c(e.name,"networks")} (${c(e.networkId,"networks")})<br/><i>IP address:</i> ${e.ipAddress} (gateway ${e.gateway})<br/><i>MAC address:</i> ${e.macAddress}<br/>${e.aliases.length>0?"<i>Aliases:</i> "+e.aliases.join(", "):""}</li>`)}}).always(()=>{r||(n&&($("#status-msg").html("Unable to find this container."),setTimeout(()=>{window.location.href="../list"},3e3)),r=!0,utils.hideLoading())})}function f(){$("#moment-created").html(i.fromNow())}function u(){$("#moment-started").html(a.fromNow())}function c(e,t){return`<a class="docker-link" href="../../${t}/details/${e}">${e}</a>`}window.docker_cdetails={init:function(){utils.showInfiniteLoading("Loading container details..."),window.refreshInterval=setInterval(d,1e4),d()}}}});