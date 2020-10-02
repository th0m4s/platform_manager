!function(e){var t={};function n(r){if(t[r])return t[r].exports;var o=t[r]={i:r,l:!1,exports:{}};return e[r].call(o.exports,o,o.exports,n),o.l=!0,o.exports}n.m=e,n.c=t,n.d=function(e,t,r){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:r})},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},n.t=function(e,t){if(1&t&&(e=n(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var r=Object.create(null);if(n.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var o in e)n.d(r,o,function(t){return e[t]}.bind(null,o));return r},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="",n(n.s=95)}({95:function(e,t){let n=!1,r=!1,o=!1,i=null,a=-1;function l(){$.getJSON("/api/v1/docker/networks/details/"+window.reference).fail((e,t,r)=>{n||($.notify({message:"Unable to refresh network details because of a server error."},{type:"danger"}),n=!0,404!=e.status&&clearInterval(window.refreshInterval)),404==e.status&&(o?(setTimeout(()=>{window.location.href="../list"},3e3),$.notify({message:"Multiple consecutive refresh failures. This network doesn't exist anymore."},{type:"danger"})):o=!0),console.warn(r)}).done(e=>{if(e.error)n||($.notify({message:"Unable to refresh network details because of an application error."},{type:"danger"}),n=!0),console.warn(e.code,e.message);else{o=!1;let t=e.details;$("#info-name").html(d(t.name,"networks")),$("#info-id").html(d(t.networkId,"networks")),$("#info-driver").html(t.driver);let n=moment(t.createdAt);null!=i&&i.unix()===n.unix()||(i=n,a>0&&clearInterval(a),a=setInterval(s,1e3),s(),$("#info-created").html(n.format("LLL"))),r||($("#status-msg").hide(),$("#details-card").show());let l=$("#info-labels").html("");for(let[e,n]of Object.entries(t.labels))console.log(e,n),l.append(`<li>${e}: ${n}</li>`);let f=$("#info-containers").html("");for(let e of t.containers)f.append(`<li class="list-group-item"><i>Name (Id):</i> ${d(e.name,"containers")} (${d(e.id,"containers")})<br/><i>IP address:</i> ${e.ipAddress.split("/")[0]}<br/><i>MAC address:</i> ${e.macAddress}</li>`)}}).always(()=>{r||(n&&($("#status-msg").html("Unable to find this container."),setTimeout(()=>{window.location.href="../list"},3e3)),r=!0,window.showMain())})}function s(){$("#moment-created").html(i.fromNow())}function d(e,t){return`<a class="docker-link" href="../../${t}/details/${e}">${e}</a>`}window.docker_ndetails={init:function(){window.hideMain(),window.refreshInterval=setInterval(l,1e4),l()}}}});