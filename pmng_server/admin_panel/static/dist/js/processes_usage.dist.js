!function(e){var t={};function a(o){if(t[o])return t[o].exports;var s=t[o]={i:o,l:!1,exports:{}};return e[o].call(s.exports,s,s.exports,a),s.l=!0,s.exports}a.m=e,a.c=t,a.d=function(e,t,o){a.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:o})},a.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},a.t=function(e,t){if(1&t&&(e=a(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var o=Object.create(null);if(a.r(o),Object.defineProperty(o,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var s in e)a.d(o,s,function(t){return e[t]}.bind(null,s));return o},a.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return a.d(t,"a",t),t},a.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},a.p="",a(a.s=112)}({112:function(e,t){Chart.helpers.color;let a=["#3B6A9C","#007BFF","#86C0FF"],o=void 0,s=!1;let l={mem:{},cpu:{}},n=!1;let r={mem:!0,cpu:!1};let i=void 0;function c(e,t=0){$("#button-"+e).attr("disabled","disabled").removeClass("btn-info").removeClass("btn-warning").addClass("btn-secondary").html("<i class='fas fa-sync fa-spin'></i>"),setTimeout(()=>{$.getJSON("/api/v1/processes/check/"+e).fail((t,a,o)=>{d(e,!1)}).done(t=>{t.error?d(e,!1):t.running?d(e,!0):$("#button-"+e).removeClass("btn-info").removeClass("btn-secondary").addClass("btn-warning").attr("data-action","start").html("<i class='fas fa-play'></i>").removeAttr("disabled")})},t)}function d(e,t){let a=$("#button-"+e);a.removeAttr("disabled"),t?a.removeClass("btn-warning").addClass("btn-info").removeClass("btn-secondary").html("<i class='fas fa-undo-alt'></i>").attr("data-action","restart"):a.removeClass("btn-warning").removeClass("btn-info").addClass("btn-secondary").html("Check").attr("data-action","check")}function p(e=!0){let t=window.subprocesses[i].check>0;$("#restartModal").modal("hide"),utils.showInfiniteLoading((e?"Restarting":"Starting")+" subprocess..."),$.getJSON("/api/v1/processes/restart/"+i).fail((e,a,o)=>{t&&($.notify({message:"A server error occured during the restart procedure. Open the console for details."},{type:"danger"}),console.warn(o))}).done(e=>{e.error?($.notify({message:"An application occured during the restart procedure. Open the console for details."},{type:"danger"}),console.warn(e.error)):$.notify({message:"Restart signal sent."},{type:"info"})}).always(()=>{utils.hideLoading(),c(i,t?1500:7e3)})}window.processes_usage={init:function(){o=io("/v1/system"),window.socket=o,o.on("connect",(function(){s=!1,console.log("Socket connected."),o.emit("authentication",{key:API_KEY}),o.on("authenticated",(function(){s||(s=!0,console.log("Socket authenticated."),o.emit("setup",{type:"processes",proc:"all"}))})),o.on("unauthorized",(function(e){$.notify({message:"Unable to authenticate to the socket. Please reload the page."},{type:"danger"}),console.error("Unauthorized from the socket",e)})),o.on("setup",e=>{e.error?($.notify({message:"Unable to setup the socket. Please reload the page."},{type:"danger"}),console.error("Socket setup error",e.message)):(!function(){let e=$("#subprocesses-row");if(n)return;n=!0;for(let[t,o]of Object.entries(window.subprocesses))if(!window.not_applicable.includes(t)&&o.check<2){let s=o.check>=0;e.append(`<div class="col-xl-4 col-lg-6 col-12 mb-3 chart-panel"><h5 class="subprocess-title" style="display: inline-block;" data-toggle="tooltip" title="${o.text}">${o.name}<span style="display: none;" id="pid-${t}"></span>:</h5>`+'<div class="btn-group btn-group-sm" style="position: absolute; right: 15; top: -4; height: 31px" role="group">'+(s?`<button class="btn btn-info" data-action="restart" onclick="processes_usage.buttonClicked('${t}')" id="button-${t}"><i class="fas fa-undo-alt"></i></button>`:"")+'<button class="btn btn-secondary"><i class="fas fa-expand-alt"></i></button></div>'+`<div style="width: 100%; height: 200px;" class="row"><div class="col-12 chart-parent chart-mem"><canvas height="200px" width="100%" id="mem-${t}"></canvas></div><div class="col-12 chart-parent chart-cpu" style="display: none;"><canvas height="200px" width="100%" id="cpu-${t}"></canvas></div></div></div>`),l.mem[t]=new Chart($("#mem-"+t),{type:"line",data:{datasets:[{label:"RSS",data:[],borderColor:a[0],fill:!1},{label:"Heap Total",data:[],borderColor:a[1],fill:!1},{label:"Heap Used",data:[],borderColor:a[2],fill:!1}]},options:{scales:{xAxes:[{type:"realtime",realtime:{duration:6e4,delay:2e3,pause:!1,ttl:void 0},ticks:{display:!1}}],yAxes:[{type:"linear",ticks:{beginAtZero:!0,suggestedMin:0,suggestedMax:10485760,callback:e=>e<1?e:window.utils.string.formatBytes(e,0,!0)}}]},maintainAspectRatio:!1}}),l.cpu[t]=new Chart($("#cpu-"+t),{type:"line",data:{datasets:[{label:"Process total %",data:[],borderColor:a[0],fill:!1},{label:"User %",data:[],borderColor:a[1],fill:!1},{label:"System %",data:[],borderColor:a[2],fill:!1}]},options:{scales:{xAxes:[{type:"realtime",realtime:{duration:6e4,delay:2e3,pause:!1,ttl:void 0},ticks:{display:!1}}],yAxes:[{type:"linear",ticks:{beginAtZero:!0,suggestedMin:0,suggestedMax:2,callback:e=>e+"%"}}]},maintainAspectRatio:!1}})}e.show(),$("#subprocesses-status").hide(),$('.subprocess-title[data-toggle="tooltip"]').tooltip({html:!0,placement:"bottom",template:"<div class='tooltip subprocess-tooltip' role='tooltip'><div class='arrow'></div><div class='tooltip-inner'></div></div>"})}(),$("#toggle-visible-group").show())}),o.on("usage",e=>{let t=Date.now(),a=l.mem[e.id];if(null!=a){let o=e.mem;a.data.datasets[0].data.push({x:t,y:o.rss}),a.data.datasets[1].data.push({x:t,y:o.heapTotal}),a.data.datasets[2].data.push({x:t,y:o.heapUsed}),a.update({preservation:!0})}let o=l.cpu[e.id];if(null!=o){let a=e.cpu,s=Math.round(a.user/a.total*1e3)/10,l=Math.round(a.sys/a.total*1e3)/10;o.data.datasets[0].data.push({x:t,y:s+l}),o.data.datasets[1].data.push({x:t,y:s}),o.data.datasets[2].data.push({x:t,y:l}),o.update({preservation:!0})}}),o.on("pid",e=>{$("#pid-"+e.id).html(" ("+e.pid+")").show()})})),o.on("error",e=>{$.notify({message:"Connection with the socket lost. Please reload the page."},{type:"danger"}),console.log("Socket error",e)})},buttonClicked:function(e){let t=$("#button-"+e).attr("data-action");"restart"==t?function(e){let t=window.subprocesses[e];i=e,$("#restartModal-content").html("Do you want to restart the <i>"+t.name+"</i> subprocess?"),$("#restartModal").modal()}(e):"check"==t?c(e,0):"start"==t&&(i=e,p(!1))},confirmRestart:p,toggleVisible:function(e){let t=$("#toggle-visible-"+e);r[e]=!r[e],$(".toggle-visible").blur(),r[e]?t.addClass("active"):t.removeClass("active");let a=(r.mem?1:0)+(r.cpu?1:0);0==a&&(r["mem"==e?"cpu":"mem"]=!0,$("#toggle-visible-"+("mem"==e?"cpu":"mem")).addClass("active")),r.mem?$(".chart-mem").show():$(".chart-mem").hide(),r.cpu?$(".chart-cpu").show():$(".chart-cpu").hide(),a<=1?($(".chart-parent").removeClass("col-lg-6").addClass("col-12"),$(".chart-panel").addClass("col-xl-4 col-lg-6 col-12").removeClass("col-xl-6")):($(".chart-parent").removeClass("col-12").addClass("col-lg-6"),$(".chart-panel").removeClass("col-xl-4 col-lg-6 col-12").addClass("col-xl-6"))}}}});