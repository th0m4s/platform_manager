!function(e){var t={};function o(a){if(t[a])return t[a].exports;var s=t[a]={i:a,l:!1,exports:{}};return e[a].call(s.exports,s,s.exports,o),s.l=!0,s.exports}o.m=e,o.c=t,o.d=function(e,t,a){o.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:a})},o.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},o.t=function(e,t){if(1&t&&(e=o(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var a=Object.create(null);if(o.r(a),Object.defineProperty(a,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var s in e)o.d(a,s,function(t){return e[t]}.bind(null,s));return a},o.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return o.d(t,"a",t),t},o.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},o.p="",o(o.s=111)}({111:function(e,t){Chart.helpers.color;let o=["#3B6A9C","#007BFF","#86C0FF"],a=void 0;let s={};let n=void 0;function r(e,t=!0){$("#button-"+e).attr("disabled","disabled").removeClass("btn-info").removeClass("btn-warning").addClass("btn-secondary").html("<i class='fas fa-sync fa-spin'></i>"),setTimeout(()=>{$.getJSON("/api/v1/processes/check/"+e).fail((t,o,a)=>{i(e,!1)}).done(t=>{t.error?i(e,!1):t.running?i(e,!0):$("#button-"+e).removeClass("btn-info").removeClass("btn-secondary").addClass("btn-warning").attr("data-action","start").html("<i class='fas fa-play'></i>").removeAttr("disabled")})},t?1500:0)}function i(e,t){let o=$("#button-"+e);o.removeAttr("disabled"),t?o.removeClass("btn-warning").addClass("btn-info").removeClass("btn-secondary").html("<i class='fas fa-undo-alt'></i>").attr("data-action","restart"):o.removeClass("btn-warning").removeClass("btn-info").addClass("btn-secondary").html("Check").attr("data-action","check")}function l(e=!0){let t=window.subprocesses[n].check>0;$("#restartModal").modal("hide"),utils.showInfiniteLoading((e?"Restarting":"Starting")+" subprocess..."),$.getJSON("/api/v1/processes/restart/"+n).fail((e,o,a)=>{t&&($.notify({message:"A server error occured during the restart procedure. Open the console for details."},{type:"danger"}),console.warn(a))}).done(e=>{e.error?($.notify({message:"An application occured during the restart procedure. Open the console for details."},{type:"danger"}),console.warn(e.error)):$.notify({message:"Restart signal sent."},{type:"info"})}).always(()=>{utils.hideLoading(),r(n,!0)})}window.processes_usage={init:function(){a=io("/v1/processes"),a.on("connect",(function(){console.log("Socket connected."),a.emit("authentication",{key:API_KEY}),a.on("authenticated",(function(){console.log("Socket authenticated."),a.emit("setup",{proc:"all"})})),a.on("unauthorized",(function(e){$.notify({message:"Unable to authenticate to the socket. Please reload the page."},{type:"danger"}),console.error("Unauthorized from the socket",e)})),a.on("setup",e=>{e.error?($.notify({message:"Unable to setup the socket. Please reload the page."},{type:"danger"}),console.error("Socket setup error",e.message)):function(){let e=$("#subprocesses-row");for(let[t,a]of Object.entries(window.subprocesses))if(!window.not_applicable.includes(t)&&a.check<2){let n=a.check>=0;e.append(`<div class="col-xl-3 col-lg-4 col-md-6 mb-3"><h5 class="subprocess-title" style="display: inline-block;" data-toggle="tooltip" title="${a.text}">${a.name}<span style="display: none;" id="pid-${t}"></span>:</h5>`+'<div class="btn-group btn-group-sm" style="position: absolute; right: 15; top: -4; height: 31px" role="group">'+(n?`<button class="btn btn-info" data-action="restart" onclick="processes_usage.buttonClicked('${t}')" id="button-${t}"><i class="fas fa-undo-alt"></i></button>`:"")+'<button class="btn btn-secondary"><i class="fas fa-expand-alt"></i></button></div>'+`<div style="width: 100%; height: 200px;"><canvas height="200px" width="100%" id="chart-${t}"></canvas></div></div>`),s[t]=new Chart($("#chart-"+t),{type:"line",data:{datasets:[{label:"RSS",data:[],borderColor:o[0],fill:!1},{label:"Heap Total",data:[],borderColor:o[1],fill:!1},{label:"Heap Used",data:[],borderColor:o[2],fill:!1}]},options:{scales:{xAxes:[{type:"realtime",realtime:{duration:6e4,delay:2e3,pause:!1,ttl:void 0},ticks:{display:!1}}],yAxes:[{type:"linear",ticks:{beginAtZero:!0,suggestedMin:0,suggestedMax:10485760,callback:e=>e<1?e:window.utils.string.formatBytes(e,0,!0)}}]},maintainAspectRatio:!1}})}e.show(),$("#subprocesses-status").hide(),$('.subprocess-title[data-toggle="tooltip"]').tooltip({html:!0,placement:"bottom",template:"<div class='tooltip subprocess-tooltip' role='tooltip'><div class='arrow'></div><div class='tooltip-inner'></div></div>"})}()}),a.on("usage",e=>{let t=Date.now(),o=s[e.id];null!=o&&(o.data.datasets[0].data.push({x:t,y:e.mem.rss}),o.data.datasets[1].data.push({x:t,y:e.mem.heapTotal}),o.data.datasets[2].data.push({x:t,y:e.mem.heapUsed}),o.update({preservation:!0}))}),a.on("pid",e=>{$("#pid-"+e.id).html(" ("+e.pid+")").show()})})),a.on("error",e=>{$.notify({message:"Connection with the socket lost. Please reload the page."},{type:"danger"}),console.log("Socket error",e)})},buttonClicked:function(e){let t=$("#button-"+e).attr("data-action");"restart"==t?function(e){let t=window.subprocesses[e];n=e,$("#restartModal-content").html("Do you want to restart the <i>"+t.name+"</i> subprocess?"),$("#restartModal").modal()}(e):"check"==t?r(e,!1):"start"==t&&(n=e,l(!1))},confirmRestart:l}}});