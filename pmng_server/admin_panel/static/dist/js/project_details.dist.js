!function(e){var t={};function n(o){if(t[o])return t[o].exports;var i=t[o]={i:o,l:!1,exports:{}};return e[o].call(i.exports,i,i.exports,n),i.l=!0,i.exports}n.m=e,n.c=t,n.d=function(e,t,o){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:o})},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},n.t=function(e,t){if(1&t&&(e=n(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var o=Object.create(null);if(n.r(o),Object.defineProperty(o,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var i in e)n.d(o,i,function(t){return e[t]}.bind(null,i));return o},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="",n(n.s=102)}({10:function(e,t,n){(function(e,t){!function(e,n){"use strict";if(!e.setImmediate){var o,i,a,r,s,l=1,c={},u=!1,d=e.document,m=Object.getPrototypeOf&&Object.getPrototypeOf(e);m=m&&m.setTimeout?m:e,"[object process]"==={}.toString.call(e.process)?o=function(e){t.nextTick((function(){p(e)}))}:!function(){if(e.postMessage&&!e.importScripts){var t=!0,n=e.onmessage;return e.onmessage=function(){t=!1},e.postMessage("","*"),e.onmessage=n,t}}()?e.MessageChannel?((a=new MessageChannel).port1.onmessage=function(e){p(e.data)},o=function(e){a.port2.postMessage(e)}):d&&"onreadystatechange"in d.createElement("script")?(i=d.documentElement,o=function(e){var t=d.createElement("script");t.onreadystatechange=function(){p(e),t.onreadystatechange=null,i.removeChild(t),t=null},i.appendChild(t)}):o=function(e){setTimeout(p,0,e)}:(r="setImmediate$"+Math.random()+"$",s=function(t){t.source===e&&"string"==typeof t.data&&0===t.data.indexOf(r)&&p(+t.data.slice(r.length))},e.addEventListener?e.addEventListener("message",s,!1):e.attachEvent("onmessage",s),o=function(t){e.postMessage(r+t,"*")}),m.setImmediate=function(e){"function"!=typeof e&&(e=new Function(""+e));for(var t=new Array(arguments.length-1),n=0;n<t.length;n++)t[n]=arguments[n+1];var i={callback:e,args:t};return c[l]=i,o(l),l++},m.clearImmediate=f}function f(e){delete c[e]}function p(e){if(u)setTimeout(p,0,e);else{var t=c[e];if(t){u=!0;try{!function(e){var t=e.callback,n=e.args;switch(n.length){case 0:t();break;case 1:t(n[0]);break;case 2:t(n[0],n[1]);break;case 3:t(n[0],n[1],n[2]);break;default:t.apply(void 0,n)}}(t)}finally{f(e),u=!1}}}}}("undefined"==typeof self?void 0===e?this:e:self)}).call(this,n(2),n(5))},102:function(e,t,n){(function(e){function t(e){return"view"==e?"View-only mode":"Full-access mode"}function n(n,o,i,r,s){return e(()=>{$("#button-collab-invert-"+n).removeClass("btn-info"),a(n,r)}),`<li class="list-group-item" id="line-collab-${n}">`+`<b>Collaboration #${n} : </b>${i} (user #${o})<span class="text-secondary d-block d-md-inline"><samp class="ml-4" id="collab-explaination-${n}">${t(r)}</samp></span>`+(s?"":`<span class="float-md-right d-block d-md-inline mt-2 mt-md-0"><div class="btn-group" role="group" style="margin: -3px -10px;"><button class="btn btn-sm btn-danger" onclick="project_details.removeCollab('${i}', ${n}, this)"><i class="fas fa-trash-alt"></i> Remove</button>`+`<button class="btn btn-sm btn-info" data-mode="unknown" id="button-collab-invert-${n}" onclick="project_details.invertCollabMode(${n})"><i class="fas fa-sync fa-spin"></i> Loading...</button></div></span>`)+"</li>"}function o(e,t,n,o){return`<li class="list-group-item" id="line-domain-${e}">`+`<b>Custom domain #${e} : </b>${t} (subs ${n?"enabled":"disabled"})`+(o?"":`<span class="float-md-right d-block d-md-inline mt-2 mt-md-0"><div class="btn-group" role="group" style="margin: -3px -10px;"><button class="btn btn-sm btn-danger" onclick="project_details.removeDomain('${t}', ${e}, this)"><i class="fas fa-trash-alt"></i> Remove</button></div></span>`)+"</li>"}function i(e,t,n){return`<li class="list-group-item" id="line-plugin-${e}">`+`<b>Plugin ${e} : </b> <span id="plugin-usage-${e}">Loading usage...</span>`+'<span class="float-md-right d-block d-md-inline mt-2 mt-md-0"><div class="btn-group" role="group" style="margin: -3px -10px;">'+(t.detailed?`<button class="btn btn-sm btn-info" onclick="project_details.pluginDetails('${e}')"><i class="fas fa-info-circle"></i> View plugin details</button>`:"")+(t.configurable&&!n?`<button class="btn btn-sm btn-primary" onclick="project_details.editPlugin('${e}')"><i class="fas fa-edit"></i> Edit plugin configuration</button>`:"")+"</div></span></li>"}function a(e,n){$("#button-collab-invert-"+e).html("view"==n?'<i class="fas fa-lock"></i> Give full access':'<i class="fas fa-lock-open"></i> Demote access').removeClass("btn-"+("view"==n?"primary":"success")).addClass("btn-"+("view"==n?"success":"primary")).attr("data-mode",n),$("#collab-explaination-"+e).html(t(n))}let r=!1;function s(){$.getJSON("/api/v1/projects/usage/"+window.project.name).fail((e,t,n)=>{r||($.notify({message:"Unable to check usage status because of a server error."},{type:"danger"}),r=!0),console.warn(n)}).done(e=>{if(e.error)r||($.notify({message:"Unable to check usage status because of an application error."},{type:"danger"}),r=!0),console.warn(e.code,e.message);else for(let[t,n]of Object.entries(e.usage)){let e=$("#plugin-usage-"+t);switch(n.type){case"measure_error":console.warn(n.error),e.html("Unable to measure usage for this plugin.");break;case"unlimited":case"limited":e.html(n.formatted);break;case"custom_text":e.html(n.text);break;case"not_measurable":e.html("Usage not measurable for this plugin.")}}})}let l=void 0,c=void 0,u=void 0;let d=!0;function m(){d?($("#detailsShowHide-button").html("Reveal sensitive hidden details"),$(".hidden-details").css("user-select","none").css("filter","blur(5px)")):($("#detailsShowHide-button").html("Hide sensitive details"),$(".hidden-details").css("user-select","inherit").css("filter","blur(0px)")),d=!d}function f(e){return e?$("#forcepush-text").html("Cancel git forced push"):$("#forcepush-text").html("Allow git forced push")}window.project_details={init:function(){let e=!0;if(window.owner.length>0&&(e=!1,$("#owner-info").html(" (project owned by "+window.owner+")")),window.project.collabs.length>0){let t=$("#collabs-list");for(let o of window.project.collabs)t.append(n(o.collabid,o.userid,o.name,o.mode,!e));t.parent().show(),$("#collabs-status").hide()}else $("#collabs-status").html("No collaborations on this project.");if(window.project.domains.length>0){let t=$("#domains-list");for(let n of window.project.domains)t.append(o(n.domainid,n.domain,n.enablesub,!e));t.parent().show(),$("#domains-status").hide()}else $("#domains-status").html("No custom domains bound to this project.");if(Object.keys(window.project.plugins).length>0){let t=$("#plugins-list");for(let[n,o]of Object.entries(window.project.plugins))t.append(i(n,o,!e));setInterval(s,3e4);s(),t.parent().show(),$("#plugins-status").hide()}else $("#plugins-status").html("No plugins added to this project.");f(window.project.forcepush).parent().removeAttr("disabled")},invertCollabMode:function(e){let t="view";"view"==$("#button-collab-invert-"+e).attr("data-mode")&&(t="manage");let n=$("#button-collab-invert-"+e);utils.disableButton(n),$.post("/api/v1/projects/updatecollab/"+e+"/"+t).fail((e,t,o)=>{$.notify({message:"Unable to change the mode of this collaboration because of a server error."},{type:"danger"}),console.warn(o),utils.enableButton(n)}).done(o=>{o.error?($.notify({message:"Unable to change the mode of this collaboration because of an application error."},{type:"danger"}),console.warn(error),utils.enableButton(n)):(a(e,t),"view"==t?$.notify({message:"Collaboration mode changed to <i>View-only</i>."},{type:"success"}):$.notify({message:"Collaboration mode changed to <i>Full-access</i>."},{type:"success"}),utils.enableButton(n))})},removeCollab:function(e,t,n){u=n,l=t,c="collab",$("#deleteModal-content").html(`Do you want to remove <i>${e}</i> as a collaborator from this project?`),$("#deleteModal-title").html("Remove a collaborator"),$("#deleteModal-confirm").html("Remove this collaborator"),$("#deleteModal").modal()},removeDomain:function(e,t,n){u=n,l=t,c="domain",$("#deleteModal-content").html(`Do you want to remove the domain <i>${e}</i> from this project?`),$("#deleteModal-title").html("Remove a custom domain"),$("#deleteModal-confirm").html("Remove this domain"),$("#deleteModal").modal()},confirmDelete:function(){switch($("#deleteModal").modal("hide"),utils.disableButton(u),c){case"collab":$.post("/api/v1/projects/removecollab/"+l).fail((e,t,n)=>{$.notify({message:"Unable to remove this collaboration because of a server error."},{type:"danger"}),console.warn(n),utils.enableButton(u)}).done(e=>{e.error?($.notify({message:"Unable to remove this collaboration because of an application error."},{type:"danger"}),console.warn(error),utils.enableButton(u)):($(u).parent().parent().parent().remove(),$.notify({message:"This collaborator was removed for the project."},{type:"success"}))});break;case"domain":$.post("/api/v1/projects/removedomain/"+l).fail((e,t,n)=>{$.notify({message:"Unable to remove this custom domain because of a server error."},{type:"danger"}),console.warn(n),utils.enableButton(u)}).done(e=>{e.error?($.notify({message:"Unable to remove this custom domain because of an application error."},{type:"danger"}),console.warn(error),utils.enableButton(u)):($(u).parent().parent().parent().remove(),$.notify({message:"This custom domain was removed.<br/>Users cannot use it anymore to access the project."},{type:"success"}))});break;default:$.notify({message:`Cannot delete an object of type ${c}.`},{type:"warning"})}},editPlugin:function(e){location.href="../pluginConfig/"+window.project.name+"/"+e},pluginDetails:function(e){utils.showInfiniteLoading("Loading plugin details..."),$.getJSON("/api/v1/projects/pluginDetails/"+window.project.name+"/"+e).fail((e,t,n)=>{$.notify({message:"Unable to plugins details because of a server error."},{type:"danger"}),console.warn("Cannot load plugin details:",n)}).done(t=>{if(t.error)$.notify({message:"Unable to plugins details because of an application error."},{type:"danger"}),console.warn("Cannot load plugin details:",error);else{let n=!0,o=t.details;switch(o.type){case"html":$("#detailsModal-content").html(o.html);break;default:n=!1}n?($("#detailsModal-title").html("Details of plugin <i>"+e+"</i>"),$("#detailsModal").modal(),$(".hidden-details").length>0?(d=!0,m(),$("#detailsShowHide-button").show()):$("#detailsShowHide-button").hide()):$.notify({message:"This plugin doesn't have any details here."},{type:"warning"})}}).always(()=>{utils.hideLoading()})},toggleHiddenDetails:m,toggleForcePush:function(){let e=!window.project.forcepush,t=$("#toggle-forcepush-btn");t.attr("disabled","disabled"),$.getJSON("/api/v1/projects/updateForcepush/"+window.project.name+"/"+e).fail((e,t,n)=>{$.notify({message:"Unable to update forcepush."},{type:"danger"}),console.warn("Cannot update forcepush:",n),textSpan.html("Server error")}).done(n=>{n.error?($.notify({message:"Unable to update forcepush."},{type:"danger"}),console.warn("Cannot update forcepush:",error),textSpan.html("Application error")):(t.removeAttr("disabled"),f(e),window.project.forcepush=e)})}}}).call(this,n(9).setImmediate)},2:function(e,t){var n;n=function(){return this}();try{n=n||new Function("return this")()}catch(e){"object"==typeof window&&(n=window)}e.exports=n},5:function(e,t){var n,o,i=e.exports={};function a(){throw new Error("setTimeout has not been defined")}function r(){throw new Error("clearTimeout has not been defined")}function s(e){if(n===setTimeout)return setTimeout(e,0);if((n===a||!n)&&setTimeout)return n=setTimeout,setTimeout(e,0);try{return n(e,0)}catch(t){try{return n.call(null,e,0)}catch(t){return n.call(this,e,0)}}}!function(){try{n="function"==typeof setTimeout?setTimeout:a}catch(e){n=a}try{o="function"==typeof clearTimeout?clearTimeout:r}catch(e){o=r}}();var l,c=[],u=!1,d=-1;function m(){u&&l&&(u=!1,l.length?c=l.concat(c):d=-1,c.length&&f())}function f(){if(!u){var e=s(m);u=!0;for(var t=c.length;t;){for(l=c,c=[];++d<t;)l&&l[d].run();d=-1,t=c.length}l=null,u=!1,function(e){if(o===clearTimeout)return clearTimeout(e);if((o===r||!o)&&clearTimeout)return o=clearTimeout,clearTimeout(e);try{o(e)}catch(t){try{return o.call(null,e)}catch(t){return o.call(this,e)}}}(e)}}function p(e,t){this.fun=e,this.array=t}function b(){}i.nextTick=function(e){var t=new Array(arguments.length-1);if(arguments.length>1)for(var n=1;n<arguments.length;n++)t[n-1]=arguments[n];c.push(new p(e,t)),1!==c.length||u||s(f)},p.prototype.run=function(){this.fun.apply(null,this.array)},i.title="browser",i.browser=!0,i.env={},i.argv=[],i.version="",i.versions={},i.on=b,i.addListener=b,i.once=b,i.off=b,i.removeListener=b,i.removeAllListeners=b,i.emit=b,i.prependListener=b,i.prependOnceListener=b,i.listeners=function(e){return[]},i.binding=function(e){throw new Error("process.binding is not supported")},i.cwd=function(){return"/"},i.chdir=function(e){throw new Error("process.chdir is not supported")},i.umask=function(){return 0}},9:function(e,t,n){(function(e){var o=void 0!==e&&e||"undefined"!=typeof self&&self||window,i=Function.prototype.apply;function a(e,t){this._id=e,this._clearFn=t}t.setTimeout=function(){return new a(i.call(setTimeout,o,arguments),clearTimeout)},t.setInterval=function(){return new a(i.call(setInterval,o,arguments),clearInterval)},t.clearTimeout=t.clearInterval=function(e){e&&e.close()},a.prototype.unref=a.prototype.ref=function(){},a.prototype.close=function(){this._clearFn.call(o,this._id)},t.enroll=function(e,t){clearTimeout(e._idleTimeoutId),e._idleTimeout=t},t.unenroll=function(e){clearTimeout(e._idleTimeoutId),e._idleTimeout=-1},t._unrefActive=t.active=function(e){clearTimeout(e._idleTimeoutId);var t=e._idleTimeout;t>=0&&(e._idleTimeoutId=setTimeout((function(){e._onTimeout&&e._onTimeout()}),t))},n(10),t.setImmediate="undefined"!=typeof self&&self.setImmediate||void 0!==e&&e.setImmediate||this&&this.setImmediate,t.clearImmediate="undefined"!=typeof self&&self.clearImmediate||void 0!==e&&e.clearImmediate||this&&this.clearImmediate}).call(this,n(2))}});