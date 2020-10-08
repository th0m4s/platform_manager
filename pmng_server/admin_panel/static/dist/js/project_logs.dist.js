!function(e){var o={};function t(n){if(o[n])return o[n].exports;var r=o[n]={i:n,l:!1,exports:{}};return e[n].call(r.exports,r,r.exports,t),r.l=!0,r.exports}t.m=e,t.c=o,t.d=function(e,o,n){t.o(e,o)||Object.defineProperty(e,o,{enumerable:!0,get:n})},t.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},t.t=function(e,o){if(1&o&&(e=t(e)),8&o)return e;if(4&o&&"object"==typeof e&&e&&e.__esModule)return e;var n=Object.create(null);if(t.r(n),Object.defineProperty(n,"default",{enumerable:!0,value:e}),2&o&&"string"!=typeof e)for(var r in e)t.d(n,r,function(o){return e[o]}.bind(null,r));return n},t.n=function(e){var o=e&&e.__esModule?function(){return e.default}:function(){return e};return t.d(o,"a",o),o},t.o=function(e,o){return Object.prototype.hasOwnProperty.call(e,o)},t.p="",t(t.s=107)}({107:function(e,o){let t=void 0,n=0,r=!1,l=$("#previous-logs-btn");function a(e,o=!1){e?l.attr("disabled","disabled").html("<i class='fas fa-sync fa-spin'></i> Loading..."):o?l.removeAttr("disabled").html('<i class="fas fa-backward"></i> Load previous logs'):l.attr("disabled","disabled").html("Previous logs loaded")}function s(e,o=""){return`<span class="log-line${""==o?"":" "+o} log-${e.substr(31,3).toLowerCase()}">${e}</span>\n`}function i(e){e?$("#download-logs-btn").attr("disabled","disabled").html('<i class="fas fa-sync fa-spin"></i> Downloading...'):$("#download-logs-btn").removeAttr("disabled").html('<i class="fas fa-file-download"></i> Download current logs')}window.project_logs={init:function(){t=io("/v1/logs"),t.on("connect",(function(){console.log("Socket connected."),t.emit("authentication",{key:API_KEY});let e=$("#logs-samp");t.on("authenticated",(function(){console.log("Socket authenticated."),t.emit("project_logs",{project:window.projectname}),e.html("This panel will automatically updates when logs are received. Use the above button to load previous logs.")})),t.on("unauthorized",(function(e){$.notify({message:"Unable to authenticate to the socket. Please reload the page."},{type:"danger"}),console.error("Unauthorized from the socket",e)})),t.on("logs_start_position",e=>{n=e.position,console.log("Start reading from byte "+n),a(!1,!0)}),t.on("project_log",o=>{r||(r=!0,e.html("")),e.append(s(o.line))}),t.on("log_error",e=>{$.notify({message:"Log reading error. Please reload the page (open console for details)."},{type:"danger"}),console.error("Log error:",e.error)})})),t.on("error",e=>{$.notify({message:"Connection with the socket lost. Please reload the page."},{type:"danger"}),console.log("Socket error",e)})},loadPreviousLogs:function(){a(!0),$.getJSON("/api/v1/logs/project/"+window.projectname+"/previousLogs/"+n).fail((e,o,t)=>{a(!1,!0),$.notify({message:"Server error while reading logs: "+t},{type:"danger"}),console.error(o,t)}).done(e=>{if(a(!1,e.error),e.error)$.notify({message:"Application error while reading logs: "+e.message},{type:"danger"}),console.error(e.message);else if(0==e.lines.length)$("#logs-samp").html("No previous logs found. New logs will automatically be displayed here.");else{r||$("#logs-samp").html("");let o=e.lines,t="";for(let e=0;e<o.length;e++)t+=s(o[e],"previous-log-line");$("#logs-samp").prepend(t),r=!0}})},downloadAllLogs:function(){i(!0),$.get("/api/v1/logs/project/"+window.projectname+"/logs").fail((e,o,t)=>{$.notify({message:"Cannot download logs, please use the PMNG CLI: "+t},{type:"danger"}),console.error(o,t)}).done(e=>{download(e,window.projectname+"_"+(new Date).getTime()+".log","text/plain"),$.notify({message:"File log successfully downloaded."},{type:"success"})}).always(()=>{i(!1)})}}}});