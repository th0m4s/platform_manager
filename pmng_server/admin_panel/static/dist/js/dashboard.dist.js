!function(e){var t={};function n(o){if(t[o])return t[o].exports;var a=t[o]={i:o,l:!1,exports:{}};return e[o].call(a.exports,a,a.exports,n),a.l=!0,a.exports}n.m=e,n.c=t,n.d=function(e,t,o){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:o})},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},n.t=function(e,t){if(1&t&&(e=n(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var o=Object.create(null);if(n.r(o),Object.defineProperty(o,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var a in e)n.d(o,a,function(t){return e[t]}.bind(null,a));return o},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="",n(n.s="T3UH")}({JPst:function(e,t,n){"use strict";e.exports=function(e){var t=[];return t.toString=function(){return this.map((function(t){var n=function(e,t){var n=e[1]||"",o=e[3];if(!o)return n;if(t&&"function"==typeof btoa){var a=(i=o,s=btoa(unescape(encodeURIComponent(JSON.stringify(i)))),l="sourceMappingURL=data:application/json;charset=utf-8;base64,".concat(s),"/*# ".concat(l," */")),r=o.sources.map((function(e){return"/*# sourceURL=".concat(o.sourceRoot||"").concat(e," */")}));return[n].concat(r).concat([a]).join("\n")}var i,s,l;return[n].join("\n")}(t,e);return t[2]?"@media ".concat(t[2]," {").concat(n,"}"):n})).join("")},t.i=function(e,n,o){"string"==typeof e&&(e=[[null,e,""]]);var a={};if(o)for(var r=0;r<this.length;r++){var i=this[r][0];null!=i&&(a[i]=!0)}for(var s=0;s<e.length;s++){var l=[].concat(e[s]);o&&a[l[0]]||(n&&(l[2]?l[2]="".concat(n," and ").concat(l[2]):l[2]=n),t.push(l))}},t}},LboF:function(e,t,n){"use strict";var o,a=function(){return void 0===o&&(o=Boolean(window&&document&&document.all&&!window.atob)),o},r=function(){var e={};return function(t){if(void 0===e[t]){var n=document.querySelector(t);if(window.HTMLIFrameElement&&n instanceof window.HTMLIFrameElement)try{n=n.contentDocument.head}catch(e){n=null}e[t]=n}return e[t]}}(),i=[];function s(e){for(var t=-1,n=0;n<i.length;n++)if(i[n].identifier===e){t=n;break}return t}function l(e,t){for(var n={},o=[],a=0;a<e.length;a++){var r=e[a],l=t.base?r[0]+t.base:r[0],c=n[l]||0,u="".concat(l," ").concat(c);n[l]=c+1;var d=s(u),f={css:r[1],media:r[2],sourceMap:r[3]};-1!==d?(i[d].references++,i[d].updater(f)):i.push({identifier:u,updater:v(f,t),references:1}),o.push(u)}return o}function c(e){var t=document.createElement("style"),o=e.attributes||{};if(void 0===o.nonce){var a=n.nc;a&&(o.nonce=a)}if(Object.keys(o).forEach((function(e){t.setAttribute(e,o[e])})),"function"==typeof e.insert)e.insert(t);else{var i=r(e.insert||"head");if(!i)throw new Error("Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid.");i.appendChild(t)}return t}var u,d=(u=[],function(e,t){return u[e]=t,u.filter(Boolean).join("\n")});function f(e,t,n,o){var a=n?"":o.media?"@media ".concat(o.media," {").concat(o.css,"}"):o.css;if(e.styleSheet)e.styleSheet.cssText=d(t,a);else{var r=document.createTextNode(a),i=e.childNodes;i[t]&&e.removeChild(i[t]),i.length?e.insertBefore(r,i[t]):e.appendChild(r)}}function p(e,t,n){var o=n.css,a=n.media,r=n.sourceMap;if(a?e.setAttribute("media",a):e.removeAttribute("media"),r&&"undefined"!=typeof btoa&&(o+="\n/*# sourceMappingURL=data:application/json;base64,".concat(btoa(unescape(encodeURIComponent(JSON.stringify(r))))," */")),e.styleSheet)e.styleSheet.cssText=o;else{for(;e.firstChild;)e.removeChild(e.firstChild);e.appendChild(document.createTextNode(o))}}var m=null,h=0;function v(e,t){var n,o,a;if(t.singleton){var r=h++;n=m||(m=c(t)),o=f.bind(null,n,r,!1),a=f.bind(null,n,r,!0)}else n=c(t),o=p.bind(null,n,t),a=function(){!function(e){if(null===e.parentNode)return!1;e.parentNode.removeChild(e)}(n)};return o(e),function(t){if(t){if(t.css===e.css&&t.media===e.media&&t.sourceMap===e.sourceMap)return;o(e=t)}else a()}}e.exports=function(e,t){(t=t||{}).singleton||"boolean"==typeof t.singleton||(t.singleton=a());var n=l(e=e||[],t);return function(e){if(e=e||[],"[object Array]"===Object.prototype.toString.call(e)){for(var o=0;o<n.length;o++){var a=s(n[o]);i[a].references--}for(var r=l(e,t),c=0;c<n.length;c++){var u=s(n[c]);0===i[u].references&&(i[u].updater(),i.splice(u,1))}n=r}}}},T3UH:function(e,t,n){"use strict";n.r(t);n("YueX");let o,a,r=["#3B6A9C","#007BFF","#86C0FF"],i=void 0,s=!1,l=1e3,c=void 0,u=-1;let d=0;function f({free:e,available:t},n,r=-1){$("#info-mem").html(t+"%"),$("#info-cpu").html(n+"%"),r<0&&(r=Date.now()),r<=d||(d=r,o.data.datasets[0].data.push({x:r,y:t}),o.data.datasets[1].data.push({x:r,y:e}),o.update(),a.data.datasets[0].data.push({x:r,y:n}),a.update())}window.dashboard={init:function(){i=io("/v1/system"),window.socket=i,i.on("connect",(function(){utils.enableSocketPause(),s=!1,console.log("Socket connected."),i.emit("authentication",{key:API_KEY}),i.on("authenticated",(function(){s||(s=!0,console.log("Socket authenticated."),i.emit("setup",{type:"dashboard"}))})),i.on("unauthorized",(function(e){$.notify({message:"Unable to authenticate to the socket. Please reload the page."},{type:"danger"}),console.error("Unauthorized from the socket",e)})),i.on("stats_interval",e=>{l=e.interval}),i.on("usage_history",e=>{let t=Date.now()-l*e.length;for(let n of e.reverse())t+=l,f({free:parseInt(n.mem.free/n.mem.total*1e3)/10,available:parseInt(n.mem.available/n.mem.total*1e3)/10},parseInt(n.cpu.used/n.cpu.total*1e3)/10,t)}),i.on("system_info",e=>{$("#info-os").html(`${e.os.hostname} running ${e.os.platform} ${e.os.release}`),$("#info-node-version").html(`${e.node.version} (${e.node.arch})`),u>0&&clearInterval(u),c=moment().add(-parseInt(e.os.uptime),"seconds");let t=()=>$("#info-os-uptime").html("(started "+c.fromNow()+")");t().attr("title",c.format("LLLL")),u=setInterval(t,1e3)}),i.on("disk_space",e=>{if(e.error)$("#info-disk-bar").parent().hide(),$("#info-disk").html("Cannot read disk space!"),console.error(e.error,e.message);else{let t=parseInt(e.used/e.total*1e3)/10;$("#info-disk-bar").css("width",t+"%").parent().show(),$("#info-disk").html(`${window.utils.string.formatBytes(e.used)}/${window.utils.string.formatBytes(e.total)} (${t}%)`)}}),i.on("setup",e=>{e.error?($.notify({message:"Unable to setup the socket. Please reload the page."},{type:"danger"}),console.error("Socket setup error",e.message)):($("#graphs-status").hide(),null==o&&(o=new Chart($("#mem-chart"),{type:"line",data:{datasets:[{label:"Available memory %",data:[],borderColor:r[0],fill:!1},{label:"Free memory %",data:[],borderColor:r[1],fill:!1}]},options:{legend:{display:!1},scales:{xAxes:[{type:"realtime",realtime:{duration:6e4,delay:3e3,pause:!1,ttl:void 0},ticks:{display:!1}}],yAxes:[{type:"linear",ticks:{beginAtZero:!0,suggestedMin:0,suggestedMax:100,callback:e=>e+"%"}}]},maintainAspectRatio:!1}})),null==a&&(a=new Chart($("#cpu-chart"),{type:"line",data:{datasets:[{label:"CPU usage %",data:[],borderColor:r[0],fill:!1}]},options:{legend:{display:!1},scales:{xAxes:[{type:"realtime",realtime:{duration:6e4,delay:3e3,pause:!1,ttl:void 0},ticks:{display:!1}}],yAxes:[{type:"linear",ticks:{beginAtZero:!0,suggestedMin:0,suggestedMax:100,callback:e=>e+"%"}}]},maintainAspectRatio:!1}})))}),i.on("stats",e=>{f({free:parseInt(e.mem.free/e.mem.total*1e3)/10,available:parseInt(e.mem.available/e.mem.total*1e3)/10},parseInt(e.cpu.used/e.cpu.total*1e3)/10)})})),i.on("error",e=>{$.notify({message:"Connection with the socket lost. Please reload the page."},{type:"danger"}),console.log("Socket error",e)})}}},YueX:function(e,t,n){var o=n("LboF"),a=n("ntpf");"string"==typeof(a=a.__esModule?a.default:a)&&(a=[[e.i,a,""]]);var r={insert:"head",singleton:!1};o(a,r);e.exports=a.locals||{}},ntpf:function(e,t,n){(t=n("JPst")(!1)).push([e.i,".chart-panel .chart-row {\n    height: 200px;\n    overflow: hidden;\n}\n\n#fullscreenGraph-parent .chart-row {\n    height: 80vh;\n}\n\n.chart-parent {\n    height: 100%;\n}",""]),e.exports=t}});