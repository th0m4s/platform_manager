!function(t){var e={};function n(r){if(e[r])return e[r].exports;var s=e[r]={i:r,l:!1,exports:{}};return t[r].call(s.exports,s,s.exports,n),s.l=!0,s.exports}n.m=t,n.c=e,n.d=function(t,e,r){n.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:r})},n.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},n.t=function(t,e){if(1&e&&(t=n(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var r=Object.create(null);if(n.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var s in t)n.d(r,s,function(e){return t[e]}.bind(null,s));return r},n.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return n.d(e,"a",e),e},n.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},n.p="",n(n.s=111)}({111:function(t,e){let n=void 0;function r(t,e=!0){$("#button-"+t).attr("disabled","disabled").removeClass("btn-info").removeClass("btn-warning").addClass("btn-secondary").html("<i class='fas fa-sync fa-spin'></i> Checking..."),setTimeout(()=>{$.getJSON("/api/v1/processes/check/"+t).fail((e,n,r)=>{s(t,!1)}).done(e=>{e.error?s(t,!1):e.running?s(t,!0):$("#button-"+t).removeClass("btn-info").removeClass("btn-secondary").addClass("btn-warning").attr("data-action","start").html("<i class='fas fa-play'></i> Start").removeAttr("disabled")})},e?1500:0)}function s(t,e){let n=$("#button-"+t);n.removeAttr("disabled"),e?n.removeClass("btn-warning").addClass("btn-info").removeClass("btn-secondary").html("<i class='fas fa-undo-alt'></i> Restart").attr("data-action","restart"):n.removeClass("btn-warning").removeClass("btn-info").addClass("btn-secondary").html("Manual check").attr("data-action","check")}function a(t=!0){let e=window.subprocesses[n].special;$("#restartModal").modal("hide"),utils.showInfiniteLoading((t?"Restarting":"Starting")+" subprocess..."),$.getJSON("/api/v1/processes/restart/"+n).fail((t,n,r)=>{0==e&&($.notify({message:"A server error occured during the restart procedure. View the console for details."},{type:"danger"}),console.warn(r))}).done(t=>{t.error?($.notify({message:"An application occured during the restart procedure. View the console for details."},{type:"danger"}),console.warn(t.error)):$.notify({message:"Restart signal sent."},{type:"info"})}).always(()=>{utils.hideLoading(),r(n,!0)})}window.processes_platform={init:function(){let t=$("#subprocesses-list");for(let[e,n]of Object.entries(window.subprocesses))t.append(`<li class="list-group-item"><b>${n.name} (${e}) :</b> ${n.usage}`+`<span class="float-md-right d-block d-md-inline mt-2 mt-md-0"><div class="btn-group" role="group" style="margin: -3px -10px;"><button class="btn btn-sm btn-info" data-action="restart" onclick="processes_platform.buttonClicked('${e}')" id="button-${e}"><i class="fas fa-undo-alt"></i> Restart</button></div></span> </li>`);t.parent().show(),$("#subprocesses-status").hide()},buttonClicked:function(t){let e=$("#button-"+t).attr("data-action");"restart"==e?function(t){let e=window.subprocesses[t];n=t,$("#restartModal-content").html("Do you want to restart the <i>"+e.name+"</i> subprocess?"),$("#restartModal").modal()}(t):"check"==e?r(t,!1):"start"==e&&(n=t,a(!1))},confirmRestart:a}}});