!function(e){var n={};function t(o){if(n[o])return n[o].exports;var a=n[o]={i:o,l:!1,exports:{}};return e[o].call(a.exports,a,a.exports,t),a.l=!0,a.exports}t.m=e,t.c=n,t.d=function(e,n,o){t.o(e,n)||Object.defineProperty(e,n,{enumerable:!0,get:o})},t.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},t.t=function(e,n){if(1&n&&(e=t(e)),8&n)return e;if(4&n&&"object"==typeof e&&e&&e.__esModule)return e;var o=Object.create(null);if(t.r(o),Object.defineProperty(o,"default",{enumerable:!0,value:e}),2&n&&"string"!=typeof e)for(var a in e)t.d(o,a,function(n){return e[n]}.bind(null,a));return o},t.n=function(e){var n=e&&e.__esModule?function(){return e.default}:function(){return e};return t.d(n,"a",n),n},t.o=function(e,n){return Object.prototype.hasOwnProperty.call(e,n)},t.p="",t(t.s=104)}({104:function(e,n){let t={},o=!1,a=0;function i(){$("#save-button").removeAttr("disabled")}let r=[];function l(){let e=[];for(let n of window.inputs){let t=c(n.type,n.config,!0);t!=window.config[n.config]&&e.push([n.config,t])}return e}function c(e,n,t){switch(e){case"email":case"text":case"password":return $("#input-"+n).val();case"number":return(t?parseInt:e=>e)($("#input-"+n).val());case"checkbox":return(t?e=>e:e=>e?"true":"false")($("#input-"+n).is(":checked"))}}function s(e,n,t){switch(e){case"email":case"text":case"password":case"number":$("#input-"+n).val(t);break;case"checkbox":$("#input-"+n).attr("checked",t)}}function u(e,n,t,o,a,i){return`<div class="form-group"><label for="input-${a}" class="mb-1">${n}:</label><input required`+(i?` onchange="plugin_config.checkOne('${a}')"`:"")+` type="${e}" class="form-control" id="input-${a}" placeholder="${o}">`+(t.length>0?`<small id="small-${a}" class="form-text text-muted">${t}</small>`:"")+"</div>"}window.plugin_config={init:function(){let e=window.inputs,n="",r={};for(let t of e){let e=null!=t.remoteCheck;switch(t.type){case"number":case"email":case"text":case"password":n+=u(t.type,t.text,t.small||"",t.placeholder||"",t.config,e),e&&(r[t.config]=()=>new Promise((e,n)=>{let o=c(t.type,t.config,!1);window.config[t.config]==o?e("No change."):$.getJSON("/api/v1/plugins/"+window.pluginname+t.remoteCheck+window.projectname+"/"+o).fail((e,o,a)=>{console.warn("Unable to check value for "+t.config+":",a),i(),n("Unable to check value for input "+t.config+".")}).done(t=>{t.valid?e(t.message):n(t.message)})}));break;case"checkbox":n+=(f=t.text,p=t.small||"",`<div class="form-check"><input class="form-check-input" type="checkbox" id="input-${d=t.config}"><label class="form-check-label" for="input-${d}">${f}</label>`+(p.length>0?`<small id="small-${d}" class="form-text text-muted">${p}</small>`:"")+"</div>")}}var f,p,d;t=r,$("#inputs").html(n);for(let n of e)s(n.type,n.config,window.config[n.config]);i(),$.get("/api/v1/projects/isrunning/"+window.projectname).fail((e,n,t)=>{$.notify({message:"Unable to check if project is running."},{type:"warning"}),console.warn("Unable to access project state (server error):",t)}).done(e=>{e.error?($.notify({message:"Unable to check if project is running."},{type:"warning"}),console.warn("Unable to access project state (application error):",error)):a=e.running?1:-1}),window.onbeforeunload=()=>{if(!o&&l().length>0)return"You have unsaved changes on this page. Do you want to leave?"}},save:function(){$("#save-button").attr("disabled","disabled");let e=l();if(e.length>0){r=e;let n=[];for(let e of Object.values(t))n.push(e());Promise.all(n).then(()=>{i();let e="<br/>Unable to check if this project is running.<br/>It may require a manual restart to apply the new configuration.";1==a?e="Your project may be restarted to apply this configuration.":-1==a&&(e="This configuration will be used on the next start of your project."),$("#confirmModal-content").html("Do you want to save this configuration?<br/>"+e),$("#confirmModal").modal()}).catch(e=>{$.notify({message:"Cannot submit configuration: "+e},{type:"warning"}),i()})}else $.notify({message:"No changes made."},{type:"warning"}),i();return!1},checkOne:function(e){t[e]().then(()=>{$("#input-"+e).addClass("valid").removeClass("invalid")}).catch(n=>{$("#input-"+e).addClass("invalid").removeClass("valid"),$.notify({message:"Cannot validate "+e+": "+n},{type:"warning"})}).finally(()=>{$("input.invalid").length>0?$("#save-button").attr("disabled","disabled"):i()})},confirmSave:function(){$("#confirmModal").modal("hide"),r.length>0&&(utils.showInfiniteLoading("Saving plugin configuration..."),$.post("/api/v1/plugins/"+window.pluginname,{changes:r,project:window.projectname}).fail((e,n,t)=>{console.warn("Save error (server): "+t),$.notify({message:"Cannot save plugin config (server error). See console for details."},{type:"danger"}),i(),utils.hideLoading()}).done(e=>{e.error?(console.warn("Save error (application): "+e.message),$.notify({message:"Cannot save plugin config (application error). See console for details."},{type:"danger"}),i(),utils.hideLoading()):(o=!0,location.href="../../details/"+window.projectname+"/saved")}))},getChanges:l}}});