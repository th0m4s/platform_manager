!function(o){var n={};function s(e){if(n[e])return n[e].exports;var a=n[e]={i:e,l:!1,exports:{}};return o[e].call(a.exports,a,a.exports,s),a.l=!0,a.exports}s.m=o,s.c=n,s.d=function(o,n,e){s.o(o,n)||Object.defineProperty(o,n,{enumerable:!0,get:e})},s.r=function(o){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(o,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(o,"__esModule",{value:!0})},s.t=function(o,n){if(1&n&&(o=s(o)),8&n)return o;if(4&n&&"object"==typeof o&&o&&o.__esModule)return o;var e=Object.create(null);if(s.r(e),Object.defineProperty(e,"default",{enumerable:!0,value:o}),2&n&&"string"!=typeof o)for(var a in o)s.d(e,a,function(n){return o[n]}.bind(null,a));return e},s.n=function(o){var n=o&&o.__esModule?function(){return o.default}:function(){return o};return s.d(n,"a",n),n},s.o=function(o,n){return Object.prototype.hasOwnProperty.call(o,n)},s.p="",s(s.s="9kSn")}({"9kSn":function(o,n){function s(){$(".passwords-col").css("max-width","");let o=0,n=0;$(".passwords-row").each((s,e)=>{let a=(e=$(e)).find(".input-group-prepend").width();a>o&&(o=a,n=e.find(".passwords-col").width())}),n>0&&$(".passwords-col").css("max-width",n)}window.mails_passwords={init:function(){let o=window.emails.length,n=$("#passwords-list"),e=1==o?" only-row":"";for(let{id:o,email:s}of window.emails)n.append(`<div data-id="${o}" data-email="${s}" class="row mb-3 justify-content-end passwords-row${e}"><div class="col-md-auto"><div class="input-group-prepend"><span class="input-group-text">${s}</span></div></div>\n            <div class="col passwords-col"><div class="input-group"><input required type="password" class="form-control mail-passwords-main" id="input-${o}" placeholder="Password">\n            <input required type="password" class="form-control" id="confirm-${o}" placeholder="Confirmation">\n            <div class="input-group-append mail-passwords-showHover"><button onclick="mails_passwords.copyBefore(this)" class="btn btn-dark mail-passwords-copyBefore" type="button"><i class="fas fa-copy"></i> Copy from previous</button><button onclick="mails_passwords.copyNext(this)" class="btn btn-secondary mail-passwords-copyNext" type="button"><i class="fas fa-clipboard"></i> Copy to next</button></div></div></div></div>`);1==o?$("#missing-some").html("one"):0==o&&location.reload(),s(),$(window).resize((function(){s()})),window.noDashboardRedirect&&($(".to-dashboard").hide(),$(".to-other").show())},sendForm:function(){let o=[],n=void 0;$(".passwords-row").each((s,e)=>{let a=(e=$(e)).find("input.mail-passwords-main").val();if(e.find("input:not(.mail-passwords-main)").val()!=a)return n=e.attr("data-email"),!1;o.push({id:e.attr("data-id"),password:a})});let s=window.emails.length>1?"s":"";return null!=n?$.notify({message:"Confirmation for <i>"+n+"</i> is incorrect."},{type:"warning"}):(utils.showInfiniteLoading("Saving password"+s+"..."),$.post("/api/v1/mails/setPasswords",{encrypted:!1,passwords:o}).fail((o,n,e)=>{$.notify({message:"Cannot save password"+s+". See console for details.<br/>If the error keeps repeating, try logout and login again."},{type:"danger"}),console.error("Cannot save (server error):",e)}).done(o=>{o.error?($.notify({message:"Cannot save password"+s+". See console for details.<br/>If the error keeps repeating, try logout and login again."},{type:"danger"}),console.error("Cannot save (application error):",message)):(utils.addNotification("Mail password"+s+" saved.","success"),location.reload())}).always(()=>{utils.hideLoading()})),!1},copyNext:function(o){let n=$(o).parent().parent().parent().parent(),s=n.find("input.mail-passwords-main").val(),e=n.find("input:not(.mail-passwords-main)").val();n.nextAll().find("input.mail-passwords-main").val(s),n.nextAll().find("input:not(.mail-passwords-main)").val(e)},copyBefore:function(o){let n=$(o).parent().parent().parent().parent(),s=n.prev();console.log(n),console.log(s);let e=s.find("input.mail-passwords-main").val(),a=s.find("input:not(.mail-passwords-main)").val();n.find("input.mail-passwords-main").val(e),n.find("input:not(.mail-passwords-main)").val(a)}}}});