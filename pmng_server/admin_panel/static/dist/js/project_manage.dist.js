!function(e){var t={};function n(o){if(t[o])return t[o].exports;var i=t[o]={i:o,l:!1,exports:{}};return e[o].call(i.exports,i,i.exports,n),i.l=!0,i.exports}n.m=e,n.c=t,n.d=function(e,t,o){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:o})},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},n.t=function(e,t){if(1&t&&(e=n(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var o=Object.create(null);if(n.r(o),Object.defineProperty(o,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var i in e)n.d(o,i,function(t){return e[t]}.bind(null,i));return o},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="",n(n.s=108)}({10:function(e,t,n){(function(e,t){!function(e,n){"use strict";if(!e.setImmediate){var o,i,l,a,s,r=1,u={},c=!1,d=e.document,f=Object.getPrototypeOf&&Object.getPrototypeOf(e);f=f&&f.setTimeout?f:e,"[object process]"==={}.toString.call(e.process)?o=function(e){t.nextTick((function(){m(e)}))}:!function(){if(e.postMessage&&!e.importScripts){var t=!0,n=e.onmessage;return e.onmessage=function(){t=!1},e.postMessage("","*"),e.onmessage=n,t}}()?e.MessageChannel?((l=new MessageChannel).port1.onmessage=function(e){m(e.data)},o=function(e){l.port2.postMessage(e)}):d&&"onreadystatechange"in d.createElement("script")?(i=d.documentElement,o=function(e){var t=d.createElement("script");t.onreadystatechange=function(){m(e),t.onreadystatechange=null,i.removeChild(t),t=null},i.appendChild(t)}):o=function(e){setTimeout(m,0,e)}:(a="setImmediate$"+Math.random()+"$",s=function(t){t.source===e&&"string"==typeof t.data&&0===t.data.indexOf(a)&&m(+t.data.slice(a.length))},e.addEventListener?e.addEventListener("message",s,!1):e.attachEvent("onmessage",s),o=function(t){e.postMessage(a+t,"*")}),f.setImmediate=function(e){"function"!=typeof e&&(e=new Function(""+e));for(var t=new Array(arguments.length-1),n=0;n<t.length;n++)t[n]=arguments[n+1];var i={callback:e,args:t};return u[r]=i,o(r),r++},f.clearImmediate=p}function p(e){delete u[e]}function m(e){if(c)setTimeout(m,0,e);else{var t=u[e];if(t){c=!0;try{!function(e){var t=e.callback,n=e.args;switch(n.length){case 0:t();break;case 1:t(n[0]);break;case 2:t(n[0],n[1]);break;case 3:t(n[0],n[1],n[2]);break;default:t.apply(void 0,n)}}(t)}finally{p(e),c=!1}}}}}("undefined"==typeof self?void 0===e?this:e:self)}).call(this,n(2),n(5))},108:function(e,t,n){(function(e){let t=[],n=0;function o(e,t){let n=Math.floor(1e7*Math.random());$("#env-list").append(`<div class="row env-row mb-2"><div class="col-md-4"><input type="text" required class="form-control input-env-key" placeholder="Variable name" value="${e}"></div><div class="col-md-8">`+`<div class="input-group"><input type="text" class="form-control input-env-val" placeholder="Value" id="env_${n}"><div class="input-group-append">`+'<button class="btn btn-danger btn-delete" type="button" onclick="project_manage.deleteRow(this);"><i class="fas fa-trash-alt"></i> Delete</button></div></div></div></div>'),$("#env_"+n).val(t),l()}function i(e,t,n){let o=Math.round(1e5*Math.random());$("#domains-list").append('<div class="row domain-row mb-2"><div class="col">'+`<div class="input-group"><input type="text" class="form-control input-domain" placeholder="Custom domain" value="${e}"><div class="input-group-append">`+`<div class="input-group-text"><div class="custom-control custom-checkbox"><input type="checkbox" class="custom-control-input input-enablesub" id="domain-sub-${o}"${t?" checked":""}><label class="custom-control-label no-select" for="domain-sub-${o}">Enable subdomains</label></div></div>`+`<div class="input-group-text"><div class="custom-control custom-checkbox"><input type="checkbox" class="custom-control-input input-fulldns" id="domain-fulldns-${o}"${n?" checked":""}><label class="custom-control-label no-select" for="domain-fulldns-${o}">Enable full DNS management</label></div></div>`+'<button class="btn btn-danger btn-delete" type="button" onclick="project_manage.deleteRow(this);"><i class="fas fa-trash-alt"></i> Delete</button></div></div></div></div>'),l()}function l(){$(".domain-row").length>0?$("#domain-info").show():$("#domain-info").hide()}function a(){return $("input, .bootstrap-tagsinput, .button-add-domain-line, .button-add-env-line, .btn-delete, #button-add-domain, #button-add-env")}function s(){a().attr("disabled","disabled").addClass("disabled")}function r(){a().removeAttr("disabled").removeClass("disabled"),$(".always-disabled").attr("disabled","disabled").addClass("disabled")}let u=void 0;function c(e,t){return e[t?"new_enablesub":"enablesub"]?e[t?"new_fulldns":"full_dns"]?"subs and full dns enabled":"subs enabled, full dns disabled":e[t?"new_fulldns":"full_dns"]?"subs disabled, full dns enabled":"subs and full dns disabled"}function d(){let e=$("#input-plugins").val().split(","),t=$("#input-collaborators").val().split(","),n=$(".env-row"),o={};for(let e=0;e<n.length;e++){let t=$(n.get(e)),i=t.find(".input-env-key").val().trim();i.length>0&&(o[i]=t.find(".input-env-val").val())}let i=$(".domain-row"),l=[];for(let e=0;e<i.length;e++){let t=$(i.get(e)),n=t.find(".input-domain").val().trim();n.length>0&&l.push({domain:n,enablesub:t.find(".input-enablesub").is(":checked"),full_dns:t.find(".input-fulldns").is(":checked")})}let a={},s=0;a.plugins={add:[],remove:[]};let r=Object.keys(values.plugins);for(let t of r)e.includes(t)||(a.plugins.remove.push(t),s++);e.forEach(e=>{e.trim().length>0&&(r.includes(e)||(a.plugins.add.push(e),s++))}),a.collabs={add:[],remove:[]};for(let e of values.collabs)t.includes(e)||(a.collabs.remove.push(e),s++);t.forEach(e=>{e.trim().length>0&&(values.collabs.includes(e)||(a.collabs.add.push(e),s++))}),a.domains={add:[],remove:[],modify:[]};let u=[],c={};for(let e of l)c[e.domain]={enablesub:e.enablesub,full_dns:e.full_dns};let d=Object.keys(c);for(let e of values.domains){let t=e.domain;u.push(t),d.includes(t)?e.enablesub==c[t].enablesub&&e.full_dns==c[t].full_dns||(a.domains.modify.push({domain:t,new_enablesub:c[t].enablesub,new_fulldns:c[t].full_dns}),s++):(a.domains.remove.push(t),s++)}for(let e of l)u.includes(e.domain)||(a.domains.add.push(e),s++);a.env={add:[],remove:[],modify:[]};let f=Object.keys(o),p=Object.keys(values.userenv);for(let e of p)f.includes(e)?values.userenv[e]!==o[e]&&(a.env.modify.push({key:e,newvalue:o[e]}),s++):(a.env.remove.push(e),s++);for(let e of f)p.includes(e)||(a.env.add.push({key:e,value:o[e]}),s++);return{differences:a,count:s}}let f=!1,p=!1;window.project_manage={init:function(){const l=["mariadb","redis","persistent-storage","custom-port","srv-record","plan-limiter"];let a=$("#input-collaborators");a.tagsinput({tagClass:"badge-secondary tagsbadge"}),e(()=>utils.updateTagsInputWidth()),a.on("beforeItemAdd",e=>{e.item.toLowerCase()==current&&(e.cancel=!0)}).on("itemAdded",e=>{let t=e.item,n=null,o=$("#collab-badges").children("span");for(let e=0;e<o.length;e++){let i=$(o.get(e));if(i.text()==t){n=i;break}}let i=t.toLowerCase(),l=n.html();n.html(`<span id="status-collab-${i}">${i+" (Checking...)"}</span>`+l.substring(i.length,l.length)),n=$("#status-collab-"+i),null!=e.options&&e.options.default?n.html(i).parent().removeClass("badge-secondary").addClass("badge-info"):$.getJSON("/api/v1/users/exists/"+i).fail((e,n,o)=>{$.notify({message:`Unable to check user <i>${i}</i> because of a server error.`},{type:"danger"}),console.warn(o),a.tagsinput("remove",t)}).done(e=>{e.error?($.notify({message:`Unable to check user <i>${i}</i> because of an application error.`},{type:"warning"}),console.warn(e.code,e.message),a.tagsinput("remove",t)):e.exists?n.html(i).parent().removeClass("badge-secondary").addClass("badge-info"):($.notify({message:`User <i>${i}</i> doesn't exist.`},{type:"warning"}),a.tagsinput("remove",t))})}),a.tagsinput("input").parent().attr("id","collab-badges");let s=$("#input-plugins"),r=s.tagsinput("input");if(r.typeahead({hint:!1,highlight:!0,minLength:1},{name:"plugins",source:new Bloodhound({datumTokenizer:Bloodhound.tokenizers.whitespace,queryTokenizer:Bloodhound.tokenizers.whitespace,local:l})}),r.on("typeahead:select",(e,t)=>{s.tagsinput("add",t)}),s.on("itemAdded",e=>{l.includes(e.item)||(s.tagsinput("remove",e.item),$.notify({message:"This plugin doesn't exists."},{type:"warning"}))}),edit){$.get("/api/v1/projects/isrunning/"+values.name).fail((e,t,n)=>{$.notify({message:"Unable to check if project is running."},{type:"warning"}),console.warn("Unable to access project state (server error):",n)}).done(e=>{e.error?($.notify({message:"Unable to check if project is running."},{type:"warning"}),console.warn("Unable to access project state (application error):",error)):n=e.running?1:-1});for(let[e,t]of Object.entries(values.userenv))o(e,t);values.domains.forEach(e=>{i(e.domain,e.enablesub,e.full_dns)}),Object.keys(values.plugins).forEach(e=>{s.tagsinput("add",e)}),values.collabs.forEach(e=>{a.tagsinput("add",e,{default:!0})})}$.getJSON("/api/v1/projects/forbiddennames").fail((e,t,n)=>{console.warn("Cannot get forbidden names",n)}).done(e=>{t=e}),window.onbeforeunload=()=>{if(!f&&(!edit&&$("#input-project-name").val().length>0||d().count>0))return"You have unsaved changes on this page. Do you want to leave?"}},addEnv:function(){o("","")},addDomain:function(){i("",!0,!0)},deleteRow:function(e){$(e).parent().parent().parent().parent().remove(),l()},confirm:function(){let e=$("#confirm-button");if(edit){let e=d(),t=e.count,o=e.differences;if(t>0){let e=[],i=[],l=!1,a=!1,s=0;if(u=o,o.plugins.remove.length>0){let t="You removed the following plugin"+(o.plugins.remove.length>1?"s":"")+":<ul>";a=!0,o.plugins.remove.forEach(e=>{t+="<li>"+e+"</li>","persistent-storage"==e?(l=!0,i.push("<i class='fas fa-exclamation-triangle'></i> Warning: By removing the persistent-storage plugin, you are removing all the files stored for this project.")):"mariadb"==e?(l=!0,i.push("<i class='fas fa-exclamation-triangle'></i> Warning: By removing the mariadb plugin, you are removing all the contents of the database of this project.")):"custom-port"==e&&(l=!0,i.push("<i class='fas fa-exclamation-triangle'></i> Warning: By removing the custom-port plugin, your project will not be accessible through the customized port, and this port will be available for another project."))}),t+="</ul>",e.push(t)}if(o.plugins.add.length>0){let t="You added the following plugin"+(o.plugins.add.length>1?"s":"")+":<ul>";a=!0,o.plugins.add.forEach(e=>{t+="<li>"+e+"</li>","custom-port"==e?(s++,l=!0,i.push("<i class='fas fa-info-circle'></i> Information: The custom-port plugin will not be initialized and will not be bound to any port until you select one from the Details page of the project.")):"plan-limiter"==e&&(s++,l=!0,i.push("<i class='fas fa-info-circle'></i> Information: The plan-limiter plugin will not be initialized and your project will continue to use the maximum allowed settings until you setup the plugin from the Details page of the project.."))}),t+="</ul>",e.push(t)}if(o.collabs.remove.length>0){let t="You removed the following collaborator"+(o.collabs.remove.length>1?"s":"")+":<ul>";o.collabs.remove.forEach(e=>{t+="<li>"+e+"</li>"}),t+="</ul>",e.push(t)}if(o.collabs.add.length>0){let t="You added the following collaborator"+(o.collabs.add.length>1?"s":"")+":<ul>";o.collabs.add.forEach(e=>{t+="<li>"+e+"</li>"}),t+="</ul>",e.push(t)}if(o.domains.remove.length>0){let t="You removed the following custom domain"+(o.domains.remove.length>1?"s":"")+":<ul>";o.domains.remove.forEach(e=>{t+="<li>"+e+"</li>"}),t+="</ul>",e.push(t)}if(o.domains.add.length>0){let t="You added the following custom domain"+(o.domains.add.length>1?"s":"")+":<ul>";o.domains.add.forEach(e=>{t+="<li>"+e.domain+" ("+c(e,!1)+")</li>"}),t+="</ul>",e.push(t)}if(o.domains.modify.length>0){let t="You modified the following custom domain"+(o.domains.modify.length>1?"s":"")+":<ul>";o.domains.modify.forEach(e=>{t+="<li>"+e.domain+" ("+c(e,!0)+")</li>"}),t+="</ul>",e.push(t)}if(o.env.remove.length>0){let t="You removed the following environment variable"+(o.env.remove.length>1?"s":"")+":<ul>";a=!0,o.env.remove.forEach(e=>{t+="<li>"+e+"</li>"}),t+="</ul>",e.push(t)}if(o.env.add.length>0){let t="You added the following environment variable"+(o.env.add.length>1?"s":"")+":<ul>";a=!0,o.env.add.forEach(e=>{t+="<li>"+e.key+": "+e.value+"</li>"}),t+="</ul>",e.push(t)}if(o.env.modify.length>0){let t="You modified the following environment variable"+(o.env.modify.length>1?"s":"")+":<ul>";a=!0,o.env.modify.forEach(e=>{t+="<li>"+e.key+": "+e.newvalue+"</li>"}),t+="</ul>",e.push(t)}s==t&&(a=!1);let r="";if(a)switch(r="<br/><br/>",n){case-1:r+="Changes will be applied on the next start.";break;case 0:r+="Unable to check if the project is running. Changes may require a manual restart.";break;case 1:r+="Your project will be restarted to apply the changes."}p=a,$("#confirmModal-content").html("Do you want to save this project?<br/><br/>"+e.join("")+(0==i.length?"":"<br/>"+i.join("<br/>"))+r);let d=$("#button-confirm-save");l?(utils.disableButton(d,"Are you sure?"),setTimeout(()=>{utils.enableButton(d,"Confirm save")},5e3)):utils.enableButton(d,"Confirm save"),$("#confirmModal").modal()}else $.notify({message:"No modifications made."},{type:"info"})}else{let n={};if(n.projectname=$("#input-project-name").val(),t.includes(n.projectname.toLowerCase()))return $.notify({message:"This name cannot be used for a project."},{type:"danger"}),!1;f=!0,s(),utils.disableButton(e,"Creating the project..."),n.pluginnames=$("#input-plugins").val().split(","),n.collaborators=$("#input-collaborators").val().split(","),n.pluginnames.length>0&&0==n.pluginnames[0].trim().length&&(n.pluginnames=[]),n.collaborators.length>0&&0==n.collaborators[0].trim().length&&(n.collaborators=[]);let o=$(".env-row"),i={};for(let e=0;e<o.length;e++){let t=$(o.get(e)),n=t.find(".input-env-key").val().trim();n.length>0&&(i[n]=t.find(".input-env-val").val())}n.userenv=i;let l=$(".domain-row"),a=[];for(let e=0;e<l.length;e++){let t=$(l.get(e)),n=t.find(".input-domain").val().trim();n.length>0&&a.push({domain:n,enablesub:t.find(".input-enablesub").is(":checked")})}n.customdomains=a,$.post("/api/v1/projects/create",n).fail((t,n,o)=>{f=!1,$.notify({message:"Unable to contact server. See console for details."},{type:"danger"}),console.warn("Unable to create project (server error):",o),r(),utils.enableButton(e,"Create this project")}).done(t=>{t.error?(f=!1,409==t.code?(utils.addNotification(t.message,"warning"),location.href="list"):($.notify({message:"Unable to create this project. See console for details."},{type:"danger"}),console.warn("Unable to create project (application error):",error),r(),utils.enableButton(e,"Create this project"))):(utils.addNotification("Project successfully created.","success"),location.href="list")})}return!1},confirmSave:function(){if(null==u)return;let e=u;u=null,f=!0,$("#confirmModal").modal("hide");let t=$("#confirm-button");s(),utils.disableButton(t,"Saving the project..."),$.post("/api/v1/projects/edit/"+values.name,{differences:JSON.stringify(e),restart:-1!=n&&p?"true":"false"}).fail((e,n,o)=>{f=!1,$.notify({message:"Unable to contact server. See console for details."},{type:"danger"}),console.warn("Unable to save the project (server error):",o),r(),$("#input-project-name").attr("disabled","disabled"),utils.enableButton(t,"Save this project")}).done(e=>{e.error?(f=!1,$.notify({message:"Unable to save this project. See console for details."},{type:"danger"}),console.warn("Unable to save the project (application error):",error),r(),$("#input-project-name").attr("disabled","disabled"),utils.enableButton(t,"Save this project")):(utils.addNotification("Project successfully saved.","success"),location.href="../list")})}}}).call(this,n(9).setImmediate)},2:function(e,t){var n;n=function(){return this}();try{n=n||new Function("return this")()}catch(e){"object"==typeof window&&(n=window)}e.exports=n},5:function(e,t){var n,o,i=e.exports={};function l(){throw new Error("setTimeout has not been defined")}function a(){throw new Error("clearTimeout has not been defined")}function s(e){if(n===setTimeout)return setTimeout(e,0);if((n===l||!n)&&setTimeout)return n=setTimeout,setTimeout(e,0);try{return n(e,0)}catch(t){try{return n.call(null,e,0)}catch(t){return n.call(this,e,0)}}}!function(){try{n="function"==typeof setTimeout?setTimeout:l}catch(e){n=l}try{o="function"==typeof clearTimeout?clearTimeout:a}catch(e){o=a}}();var r,u=[],c=!1,d=-1;function f(){c&&r&&(c=!1,r.length?u=r.concat(u):d=-1,u.length&&p())}function p(){if(!c){var e=s(f);c=!0;for(var t=u.length;t;){for(r=u,u=[];++d<t;)r&&r[d].run();d=-1,t=u.length}r=null,c=!1,function(e){if(o===clearTimeout)return clearTimeout(e);if((o===a||!o)&&clearTimeout)return o=clearTimeout,clearTimeout(e);try{o(e)}catch(t){try{return o.call(null,e)}catch(t){return o.call(this,e)}}}(e)}}function m(e,t){this.fun=e,this.array=t}function h(){}i.nextTick=function(e){var t=new Array(arguments.length-1);if(arguments.length>1)for(var n=1;n<arguments.length;n++)t[n-1]=arguments[n];u.push(new m(e,t)),1!==u.length||c||s(p)},m.prototype.run=function(){this.fun.apply(null,this.array)},i.title="browser",i.browser=!0,i.env={},i.argv=[],i.version="",i.versions={},i.on=h,i.addListener=h,i.once=h,i.off=h,i.removeListener=h,i.removeAllListeners=h,i.emit=h,i.prependListener=h,i.prependOnceListener=h,i.listeners=function(e){return[]},i.binding=function(e){throw new Error("process.binding is not supported")},i.cwd=function(){return"/"},i.chdir=function(e){throw new Error("process.chdir is not supported")},i.umask=function(){return 0}},9:function(e,t,n){(function(e){var o=void 0!==e&&e||"undefined"!=typeof self&&self||window,i=Function.prototype.apply;function l(e,t){this._id=e,this._clearFn=t}t.setTimeout=function(){return new l(i.call(setTimeout,o,arguments),clearTimeout)},t.setInterval=function(){return new l(i.call(setInterval,o,arguments),clearInterval)},t.clearTimeout=t.clearInterval=function(e){e&&e.close()},l.prototype.unref=l.prototype.ref=function(){},l.prototype.close=function(){this._clearFn.call(o,this._id)},t.enroll=function(e,t){clearTimeout(e._idleTimeoutId),e._idleTimeout=t},t.unenroll=function(e){clearTimeout(e._idleTimeoutId),e._idleTimeout=-1},t._unrefActive=t.active=function(e){clearTimeout(e._idleTimeoutId);var t=e._idleTimeout;t>=0&&(e._idleTimeoutId=setTimeout((function(){e._onTimeout&&e._onTimeout()}),t))},n(10),t.setImmediate="undefined"!=typeof self&&self.setImmediate||void 0!==e&&e.setImmediate||this&&this.setImmediate,t.clearImmediate="undefined"!=typeof self&&self.clearImmediate||void 0!==e&&e.clearImmediate||this&&this.clearImmediate}).call(this,n(2))}});