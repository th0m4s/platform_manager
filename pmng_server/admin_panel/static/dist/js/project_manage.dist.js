!function(e){var t={};function n(o){if(t[o])return t[o].exports;var a=t[o]={i:o,l:!1,exports:{}};return e[o].call(a.exports,a,a.exports,n),a.l=!0,a.exports}n.m=e,n.c=t,n.d=function(e,t,o){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:o})},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},n.t=function(e,t){if(1&t&&(e=n(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var o=Object.create(null);if(n.r(o),Object.defineProperty(o,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var a in e)n.d(o,a,function(t){return e[t]}.bind(null,a));return o},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="",n(n.s="mLyP")}({"8oxB":function(e,t){var n,o,a=e.exports={};function i(){throw new Error("setTimeout has not been defined")}function l(){throw new Error("clearTimeout has not been defined")}function r(e){if(n===setTimeout)return setTimeout(e,0);if((n===i||!n)&&setTimeout)return n=setTimeout,setTimeout(e,0);try{return n(e,0)}catch(t){try{return n.call(null,e,0)}catch(t){return n.call(this,e,0)}}}!function(){try{n="function"==typeof setTimeout?setTimeout:i}catch(e){n=i}try{o="function"==typeof clearTimeout?clearTimeout:l}catch(e){o=l}}();var s,u=[],c=!1,d=-1;function f(){c&&s&&(c=!1,s.length?u=s.concat(u):d=-1,u.length&&p())}function p(){if(!c){var e=r(f);c=!0;for(var t=u.length;t;){for(s=u,u=[];++d<t;)s&&s[d].run();d=-1,t=u.length}s=null,c=!1,function(e){if(o===clearTimeout)return clearTimeout(e);if((o===l||!o)&&clearTimeout)return o=clearTimeout,clearTimeout(e);try{o(e)}catch(t){try{return o.call(null,e)}catch(t){return o.call(this,e)}}}(e)}}function m(e,t){this.fun=e,this.array=t}function h(){}a.nextTick=function(e){var t=new Array(arguments.length-1);if(arguments.length>1)for(var n=1;n<arguments.length;n++)t[n-1]=arguments[n];u.push(new m(e,t)),1!==u.length||c||r(p)},m.prototype.run=function(){this.fun.apply(null,this.array)},a.title="browser",a.browser=!0,a.env={},a.argv=[],a.version="",a.versions={},a.on=h,a.addListener=h,a.once=h,a.off=h,a.removeListener=h,a.removeAllListeners=h,a.emit=h,a.prependListener=h,a.prependOnceListener=h,a.listeners=function(e){return[]},a.binding=function(e){throw new Error("process.binding is not supported")},a.cwd=function(){return"/"},a.chdir=function(e){throw new Error("process.chdir is not supported")},a.umask=function(){return 0}},JPst:function(e,t,n){"use strict";e.exports=function(e){var t=[];return t.toString=function(){return this.map((function(t){var n=function(e,t){var n=e[1]||"",o=e[3];if(!o)return n;if(t&&"function"==typeof btoa){var a=(l=o,r=btoa(unescape(encodeURIComponent(JSON.stringify(l)))),s="sourceMappingURL=data:application/json;charset=utf-8;base64,".concat(r),"/*# ".concat(s," */")),i=o.sources.map((function(e){return"/*# sourceURL=".concat(o.sourceRoot||"").concat(e," */")}));return[n].concat(i).concat([a]).join("\n")}var l,r,s;return[n].join("\n")}(t,e);return t[2]?"@media ".concat(t[2]," {").concat(n,"}"):n})).join("")},t.i=function(e,n,o){"string"==typeof e&&(e=[[null,e,""]]);var a={};if(o)for(var i=0;i<this.length;i++){var l=this[i][0];null!=l&&(a[l]=!0)}for(var r=0;r<e.length;r++){var s=[].concat(e[r]);o&&a[s[0]]||(n&&(s[2]?s[2]="".concat(n," and ").concat(s[2]):s[2]=n),t.push(s))}},t}},LboF:function(e,t,n){"use strict";var o,a=function(){return void 0===o&&(o=Boolean(window&&document&&document.all&&!window.atob)),o},i=function(){var e={};return function(t){if(void 0===e[t]){var n=document.querySelector(t);if(window.HTMLIFrameElement&&n instanceof window.HTMLIFrameElement)try{n=n.contentDocument.head}catch(e){n=null}e[t]=n}return e[t]}}(),l=[];function r(e){for(var t=-1,n=0;n<l.length;n++)if(l[n].identifier===e){t=n;break}return t}function s(e,t){for(var n={},o=[],a=0;a<e.length;a++){var i=e[a],s=t.base?i[0]+t.base:i[0],u=n[s]||0,c="".concat(s," ").concat(u);n[s]=u+1;var d=r(c),f={css:i[1],media:i[2],sourceMap:i[3]};-1!==d?(l[d].references++,l[d].updater(f)):l.push({identifier:c,updater:v(f,t),references:1}),o.push(c)}return o}function u(e){var t=document.createElement("style"),o=e.attributes||{};if(void 0===o.nonce){var a=n.nc;a&&(o.nonce=a)}if(Object.keys(o).forEach((function(e){t.setAttribute(e,o[e])})),"function"==typeof e.insert)e.insert(t);else{var l=i(e.insert||"head");if(!l)throw new Error("Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid.");l.appendChild(t)}return t}var c,d=(c=[],function(e,t){return c[e]=t,c.filter(Boolean).join("\n")});function f(e,t,n,o){var a=n?"":o.media?"@media ".concat(o.media," {").concat(o.css,"}"):o.css;if(e.styleSheet)e.styleSheet.cssText=d(t,a);else{var i=document.createTextNode(a),l=e.childNodes;l[t]&&e.removeChild(l[t]),l.length?e.insertBefore(i,l[t]):e.appendChild(i)}}function p(e,t,n){var o=n.css,a=n.media,i=n.sourceMap;if(a?e.setAttribute("media",a):e.removeAttribute("media"),i&&"undefined"!=typeof btoa&&(o+="\n/*# sourceMappingURL=data:application/json;base64,".concat(btoa(unescape(encodeURIComponent(JSON.stringify(i))))," */")),e.styleSheet)e.styleSheet.cssText=o;else{for(;e.firstChild;)e.removeChild(e.firstChild);e.appendChild(document.createTextNode(o))}}var m=null,h=0;function v(e,t){var n,o,a;if(t.singleton){var i=h++;n=m||(m=u(t)),o=f.bind(null,n,i,!1),a=f.bind(null,n,i,!0)}else n=u(t),o=p.bind(null,n,t),a=function(){!function(e){if(null===e.parentNode)return!1;e.parentNode.removeChild(e)}(n)};return o(e),function(t){if(t){if(t.css===e.css&&t.media===e.media&&t.sourceMap===e.sourceMap)return;o(e=t)}else a()}}e.exports=function(e,t){(t=t||{}).singleton||"boolean"==typeof t.singleton||(t.singleton=a());var n=s(e=e||[],t);return function(e){if(e=e||[],"[object Array]"===Object.prototype.toString.call(e)){for(var o=0;o<n.length;o++){var a=r(n[o]);l[a].references--}for(var i=s(e,t),u=0;u<n.length;u++){var c=r(n[u]);0===l[c].references&&(l[c].updater(),l.splice(c,1))}n=i}}}},NxgY:function(e,t,n){(t=n("JPst")(!1)).push([e.i,'.rowtype-buttons {\n    position: absolute;\n    right: 104px;\n    top: 8px;\n    font-size: 14px;\n    color: grey;\n    z-index: 10;\n    cursor: pointer;\n    user-select: none;\n    font-family: "Consolas";\n}\n\n.row[data-rowtype="str_default"] .rowtype-buttons {\n    display: none;\n}\n\n.row[data-rowtype="str_forced"] input, .row[data-rowtype="num_forced"] input {\n    padding-right: 50px;\n}\n\n.row[data-rowtype="str_forced"] .rowtype-num {\n    display: none;\n}\n\n.row[data-rowtype="num_forced"] .rowtype-str {\n    display: none;\n}\n\n.confirm-rc-small {\n    font-size: 13px;\n    font-family: "Consolas";\n    margin-left: 8px;\n    color: grey;\n}',""]),e.exports=t},ST4s:function(e,t,n){var o=n("LboF"),a=n("NxgY");"string"==typeof(a=a.__esModule?a.default:a)&&(a=[[e.i,a,""]]);var i={insert:"head",singleton:!1};o(a,i);e.exports=a.locals||{}},URgk:function(e,t,n){(function(e){var o=void 0!==e&&e||"undefined"!=typeof self&&self||window,a=Function.prototype.apply;function i(e,t){this._id=e,this._clearFn=t}t.setTimeout=function(){return new i(a.call(setTimeout,o,arguments),clearTimeout)},t.setInterval=function(){return new i(a.call(setInterval,o,arguments),clearInterval)},t.clearTimeout=t.clearInterval=function(e){e&&e.close()},i.prototype.unref=i.prototype.ref=function(){},i.prototype.close=function(){this._clearFn.call(o,this._id)},t.enroll=function(e,t){clearTimeout(e._idleTimeoutId),e._idleTimeout=t},t.unenroll=function(e){clearTimeout(e._idleTimeoutId),e._idleTimeout=-1},t._unrefActive=t.active=function(e){clearTimeout(e._idleTimeoutId);var t=e._idleTimeout;t>=0&&(e._idleTimeoutId=setTimeout((function(){e._onTimeout&&e._onTimeout()}),t))},n("YBdB"),t.setImmediate="undefined"!=typeof self&&self.setImmediate||void 0!==e&&e.setImmediate||this&&this.setImmediate,t.clearImmediate="undefined"!=typeof self&&self.clearImmediate||void 0!==e&&e.clearImmediate||this&&this.clearImmediate}).call(this,n("yLpj"))},YBdB:function(e,t,n){(function(e,t){!function(e,n){"use strict";if(!e.setImmediate){var o,a,i,l,r,s=1,u={},c=!1,d=e.document,f=Object.getPrototypeOf&&Object.getPrototypeOf(e);f=f&&f.setTimeout?f:e,"[object process]"==={}.toString.call(e.process)?o=function(e){t.nextTick((function(){m(e)}))}:!function(){if(e.postMessage&&!e.importScripts){var t=!0,n=e.onmessage;return e.onmessage=function(){t=!1},e.postMessage("","*"),e.onmessage=n,t}}()?e.MessageChannel?((i=new MessageChannel).port1.onmessage=function(e){m(e.data)},o=function(e){i.port2.postMessage(e)}):d&&"onreadystatechange"in d.createElement("script")?(a=d.documentElement,o=function(e){var t=d.createElement("script");t.onreadystatechange=function(){m(e),t.onreadystatechange=null,a.removeChild(t),t=null},a.appendChild(t)}):o=function(e){setTimeout(m,0,e)}:(l="setImmediate$"+Math.random()+"$",r=function(t){t.source===e&&"string"==typeof t.data&&0===t.data.indexOf(l)&&m(+t.data.slice(l.length))},e.addEventListener?e.addEventListener("message",r,!1):e.attachEvent("onmessage",r),o=function(t){e.postMessage(l+t,"*")}),f.setImmediate=function(e){"function"!=typeof e&&(e=new Function(""+e));for(var t=new Array(arguments.length-1),n=0;n<t.length;n++)t[n]=arguments[n+1];var a={callback:e,args:t};return u[s]=a,o(s),s++},f.clearImmediate=p}function p(e){delete u[e]}function m(e){if(c)setTimeout(m,0,e);else{var t=u[e];if(t){c=!0;try{!function(e){var t=e.callback,n=e.args;switch(n.length){case 0:t();break;case 1:t(n[0]);break;case 2:t(n[0],n[1]);break;case 3:t(n[0],n[1],n[2]);break;default:t.apply(void 0,n)}}(t)}finally{p(e),c=!1}}}}}("undefined"==typeof self?void 0===e?this:e:self)}).call(this,n("yLpj"),n("8oxB"))},mLyP:function(e,t,n){"use strict";n.r(t),function(e){n("ST4s");let t=[],o=0;function a(e){return"number"==typeof e||null!=e&&"string"==typeof e&&e.trim().length>0&&!isNaN(Number(e))}function i(e,t){let n=Math.floor(1e7*Math.random());$("#env-list").append(`<div class="row env-row mb-2"><div class="col-md-4"><input type="text" required class="form-control input-env-key" placeholder="Variable name" value="${e}"></div><div class="col-md-8"><div class="input-group"><input type="text" class="form-control input-env-val" oninput="project_manage.onRowInput(this);" placeholder="Value" id="env_${n}"><div class="input-group-append"><button class="btn btn-danger btn-delete" type="button" onclick="project_manage.deleteRow(this);"><i class="fas fa-trash-alt"></i> Delete</button></div></div></div></div>`),$("#env_"+n).val(t),s()}function l(e,t){let n=Math.floor(1e7*Math.random());$("#customconf-list").append(`<div class="row customconf-row mb-2" data-rowtype="${function(e){return"number"==typeof e?"num_forced":a(e)?"str_forced":"str_default"}(t)}"><div class="col-md-4"><input type="text" required class="form-control input-customconf-key" placeholder="Variable name" value="${e}"></div><div class="col-md-8"><div class="input-group"><input type="text" class="form-control input-customconf-val" oninput="project_manage.onRowInput(this);" placeholder="Value" id="customconf_${n}"><div class="input-group-append"><span class='rowtype-buttons'><span class='rowtype-str' onclick='project_manage.setRowTypeFromButton(this, "num");'>str</span><span class='rowtype-num' onclick='project_manage.setRowTypeFromButton(this, "str");'>num</span></span><button class="btn btn-danger btn-delete" type="button" onclick="project_manage.deleteRow(this);"><i class="fas fa-trash-alt"></i> Delete</button></div></div></div></div>`),$("#customconf_"+n).val(t),s()}function r(e,t,n){let o=Math.round(1e5*Math.random());$("#domains-list").append(`<div class="row domain-row mb-2"><div class="col"><div class="input-group"><input type="text" class="form-control input-domain" placeholder="Custom domain" value="${e}"><div class="input-group-append"><div class="input-group-text"><div class="custom-control custom-checkbox"><input type="checkbox" class="custom-control-input input-enablesub" id="domain-sub-${o}"${t?" checked":""}><label class="custom-control-label no-select" for="domain-sub-${o}">Enable subdomains</label></div></div><div class="input-group-text"><div class="custom-control custom-checkbox"><input type="checkbox" class="custom-control-input input-fulldns" id="domain-fulldns-${o}"${n?" checked":""}><label class="custom-control-label no-select" for="domain-fulldns-${o}">Enable full DNS management</label></div></div><button class="btn btn-danger btn-delete" type="button" onclick="project_manage.deleteRow(this);"><i class="fas fa-trash-alt"></i> Delete</button></div></div></div></div>`),s()}function s(){$(".domain-row").length>0?$("#domain-info").show():$("#domain-info").hide()}function u(){return $("input, .bootstrap-tagsinput, .button-add-domain-line, .button-add-env-line, .btn-delete, #button-add-domain, #button-add-env")}function c(){u().attr("disabled","disabled").addClass("disabled")}function d(){u().removeAttr("disabled").removeClass("disabled"),$(".always-disabled").attr("disabled","disabled").addClass("disabled")}let f=void 0;function p(e,t){return e[t?"new_enablesub":"enablesub"]?e[t?"new_fulldns":"full_dns"]?"subs and full dns enabled":"subs enabled, full dns disabled":e[t?"new_fulldns":"full_dns"]?"subs disabled, full dns enabled":"subs and full dns disabled"}function m(){let e=$("#input-plugins").val().split(","),t=$("#input-collaborators").val().split(","),n=$(".env-row"),o={};for(let e=0;e<n.length;e++){let t=$(n.get(e)),a=t.find(".input-env-key").val().trim();a.length>0&&(o[a]=t.find(".input-env-val").val())}let a=$(".customconf-row"),i={};for(let e=0;e<a.length;e++){let t=$(a.get(e)),n=t.find(".input-customconf-key").val().trim();if(n.length>0){let e=t.find(".input-customconf-val").val();if("num_forced"==t.attr("data-rowtype")){let t=Number(e);isNaN(t)||(e=t)}i[n]=e}}let l=$(".domain-row"),r=[];for(let e=0;e<l.length;e++){let t=$(l.get(e)),n=t.find(".input-domain").val().trim();n.length>0&&r.push({domain:n,enablesub:t.find(".input-enablesub").is(":checked"),full_dns:t.find(".input-fulldns").is(":checked")})}let s={},u=0;s.plugins={add:[],remove:[]};let c=Object.keys(values.plugins);for(let t of c)e.includes(t)||(s.plugins.remove.push(t),u++);e.forEach(e=>{e.trim().length>0&&(c.includes(e)||(s.plugins.add.push(e),u++))}),s.collabs={add:[],remove:[]};for(let e of values.collabs)t.includes(e)||(s.collabs.remove.push(e),u++);t.forEach(e=>{e.trim().length>0&&(values.collabs.includes(e)||(s.collabs.add.push(e),u++))}),s.domains={add:[],remove:[],modify:[]};let d=[],f={};for(let e of r)f[e.domain]={enablesub:e.enablesub,full_dns:e.full_dns};let p=Object.keys(f);for(let e of values.domains){let t=e.domain;d.push(t),p.includes(t)?e.enablesub==f[t].enablesub&&e.full_dns==f[t].full_dns||(s.domains.modify.push({domain:t,new_enablesub:f[t].enablesub,new_fulldns:f[t].full_dns}),u++):(s.domains.remove.push(t),u++)}for(let e of r)d.includes(e.domain)||(s.domains.add.push(e),u++);s.env={add:[],remove:[],modify:[]};let m=Object.keys(o),h=Object.keys(values.userenv);for(let e of h)m.includes(e)?values.userenv[e]!==o[e]&&(s.env.modify.push({key:e,newvalue:o[e]}),u++):(s.env.remove.push(e),u++);for(let e of m)h.includes(e)||(s.env.add.push({key:e,value:o[e]}),u++);s.customconf={add:[],remove:[],modify:[]};let v=Object.keys(i),g=Object.keys(values.customconf);for(let e of g)v.includes(e)?values.customconf[e]!==i[e]&&(s.customconf.modify.push({key:e,newvalue:i[e]}),u++):(s.customconf.remove.push(e),u++);for(let e of v)g.includes(e)||(s.customconf.add.push({key:e,value:i[e]}),u++);return{differences:s,count:u}}let h=!1,v=!1;window.project_manage={init:function(){const n=["mariadb","redis","persistent-storage","custom-port","srv-record","plan-limiter","auto-redirect"];let a=$("#input-collaborators");a.tagsinput({tagClass:"badge-secondary tagsbadge"}),e(()=>utils.updateTagsInputWidth()),a.on("beforeItemAdd",e=>{e.item.toLowerCase()==current&&(e.cancel=!0)}).on("itemAdded",e=>{let t=e.item,n=null,o=$("#collab-badges").children("span");for(let e=0;e<o.length;e++){let a=$(o.get(e));if(a.text()==t){n=a;break}}let i=t.toLowerCase(),l=n.html();n.html(`<span id="status-collab-${i}">${i+" (Checking...)"}</span>`+l.substring(i.length,l.length)),n=$("#status-collab-"+i),null!=e.options&&e.options.default?n.html(i).parent().removeClass("badge-secondary").addClass("badge-info"):$.getJSON("/api/v1/users/exists/"+i).fail((e,n,o)=>{$.notify({message:`Unable to check user <i>${i}</i> because of a server error.`},{type:"danger"}),console.warn(o),a.tagsinput("remove",t)}).done(e=>{e.error?($.notify({message:`Unable to check user <i>${i}</i> because of an application error.`},{type:"warning"}),console.warn(e.code,e.message),a.tagsinput("remove",t)):e.exists?n.html(i).parent().removeClass("badge-secondary").addClass("badge-info"):($.notify({message:`User <i>${i}</i> doesn't exist.`},{type:"warning"}),a.tagsinput("remove",t))})}),a.tagsinput("input").parent().attr("id","collab-badges");let s=$("#input-plugins"),u=s.tagsinput("input");if(u.typeahead({hint:!1,highlight:!0,minLength:1},{name:"plugins",source:new Bloodhound({datumTokenizer:Bloodhound.tokenizers.whitespace,queryTokenizer:Bloodhound.tokenizers.whitespace,local:n})}),u.on("typeahead:select",(e,t)=>{s.tagsinput("add",t)}),s.on("itemAdded",e=>{n.includes(e.item)||(s.tagsinput("remove",e.item),$.notify({message:"This plugin doesn't exists."},{type:"warning"}))}),edit){$.get("/api/v1/projects/isrunning/"+values.name).fail((e,t,n)=>{$.notify({message:"Unable to check if project is running."},{type:"warning"}),console.warn("Unable to access project state (server error):",n)}).done(e=>{e.error?($.notify({message:"Unable to check if project is running."},{type:"warning"}),console.warn("Unable to access project state (application error):",error)):o=e.running?1:-1});for(let[e,t]of Object.entries(values.userenv))i(e,t);for(let[e,t]of Object.entries(values.customconf))l(e,t);values.domains.forEach(e=>{r(e.domain,e.enablesub,e.full_dns)}),Object.keys(values.plugins).forEach(e=>{s.tagsinput("add",e)}),values.collabs.forEach(e=>{a.tagsinput("add",e,{default:!0})})}$.getJSON("/api/v1/projects/forbiddennames").fail((e,t,n)=>{console.warn("Cannot get forbidden names",n)}).done(e=>{t=e}),window.onbeforeunload=()=>{if(!h&&(!edit&&$("#input-project-name").val().length>0||m().count>0))return"You have unsaved changes on this page. Do you want to leave?"}},addEnv:function(){i("","")},addDomain:function(){r("",!0,!0)},addCustomConf:function(){l("","")},deleteRow:function(e){$(e).parent().parent().parent().parent().remove(),s()},confirm:function(){let e=$("#confirm-button");if(edit){let e=m(),t=e.count,n=e.differences;if(t>0){let e=[],i=[],l=!1,r=!1,s=0;if(f=n,n.plugins.remove.length>0){let t="You removed the following plugin"+(n.plugins.remove.length>1?"s":"")+":<ul>";r=!0,n.plugins.remove.forEach(e=>{t+="<li>"+e+"</li>","persistent-storage"==e?(l=!0,i.push("<i class='fas fa-exclamation-triangle'></i> Warning: By removing the persistent-storage plugin, you are removing all the files stored for this project.")):"mariadb"==e?(l=!0,i.push("<i class='fas fa-exclamation-triangle'></i> Warning: By removing the mariadb plugin, you are removing all the contents of the database of this project.")):"custom-port"==e&&(l=!0,i.push("<i class='fas fa-exclamation-triangle'></i> Warning: By removing the custom-port plugin, your project will not be accessible through the customized port, and this port will be available for another project."))}),t+="</ul>",e.push(t)}if(n.plugins.add.length>0){let t="You added the following plugin"+(n.plugins.add.length>1?"s":"")+":<ul>";r=!0,n.plugins.add.forEach(e=>{t+="<li>"+e+"</li>","custom-port"==e?(s++,l=!0,i.push("<i class='fas fa-info-circle'></i> Information: The custom-port plugin will not be initialized and will not be bound to any port until you select one from the Details page of the project.")):"plan-limiter"==e&&(s++,l=!0,i.push("<i class='fas fa-info-circle'></i> Information: The plan-limiter plugin will not be initialized and your project will continue to use the maximum allowed settings until you setup the plugin from the Details page of the project.."))}),t+="</ul>",e.push(t)}if(n.collabs.remove.length>0){let t="You removed the following collaborator"+(n.collabs.remove.length>1?"s":"")+":<ul>";n.collabs.remove.forEach(e=>{t+="<li>"+e+"</li>"}),t+="</ul>",e.push(t)}if(n.collabs.add.length>0){let t="You added the following collaborator"+(n.collabs.add.length>1?"s":"")+":<ul>";n.collabs.add.forEach(e=>{t+="<li>"+e+"</li>"}),t+="</ul>",e.push(t)}if(n.domains.remove.length>0){let t="You removed the following custom domain"+(n.domains.remove.length>1?"s":"")+":<ul>";n.domains.remove.forEach(e=>{t+="<li>"+e+"</li>"}),t+="</ul>",e.push(t)}if(n.domains.add.length>0){let t="You added the following custom domain"+(n.domains.add.length>1?"s":"")+":<ul>";n.domains.add.forEach(e=>{t+="<li>"+e.domain+" ("+p(e,!1)+")</li>"}),t+="</ul>",e.push(t)}if(n.domains.modify.length>0){let t="You modified the following custom domain"+(n.domains.modify.length>1?"s":"")+":<ul>";n.domains.modify.forEach(e=>{t+="<li>"+e.domain+" ("+p(e,!0)+")</li>"}),t+="</ul>",e.push(t)}if(n.env.remove.length>0){let t="You removed the following environment variable"+(n.env.remove.length>1?"s":"")+":<ul>";r=!0,n.env.remove.forEach(e=>{t+="<li>"+e+"</li>"}),t+="</ul>",e.push(t)}if(n.env.add.length>0){let t="You added the following environment variable"+(n.env.add.length>1?"s":"")+":<ul>";r=!0,n.env.add.forEach(e=>{t+="<li>"+e.key+": "+e.value+"</li>"}),t+="</ul>",e.push(t)}if(n.env.modify.length>0){let t="You modified the following environment variable"+(n.env.modify.length>1?"s":"")+":<ul>";r=!0,n.env.modify.forEach(e=>{t+="<li>"+e.key+": "+e.newvalue+"</li>"}),t+="</ul>",e.push(t)}if(n.customconf.remove.length>0){let t="You removed the following realtime configuration variable"+(n.customconf.remove.length>1?"s":"")+":<ul>";s++,n.customconf.remove.forEach(e=>{t+="<li>"+e+"</li>"}),t+="</ul>",e.push(t)}if(n.customconf.add.length>0){let t="You added the following realtime configuration variable"+(n.customconf.add.length>1?"s":"")+":<ul>";s++,n.customconf.add.forEach(e=>{t+="<li>"+e.key+": "+e.value,"number"==typeof e.value?t+="<span class='confirm-rc-small'>(number)</span>":a(e.value)&&(t+="<span class='confirm-rc-small'>(string)</span>"),t+="</li>"}),t+="</ul>",e.push(t)}if(n.customconf.modify.length>0){let t="You modified the following realtime configuration variable"+(n.customconf.modify.length>1?"s":"")+":<ul>";s++,n.customconf.modify.forEach(e=>{t+="<li>"+e.key+": "+e.newvalue,"number"==typeof e.newvalue?t+="<span class='confirm-rc-small'>(number)</span>":a(e.newvalue)&&(t+="<span class='confirm-rc-small'>(string)</span>"),t+="</li>"}),t+="</ul>",e.push(t)}s==t&&(r=!1);let u="";if(r)switch(u="<br/><br/>",o){case-1:u+="Changes will be applied on the next start.";break;case 0:u+="Unable to check if the project is running. Changes may require a manual restart.";break;case 1:u+="Your project will be restarted to apply the changes."}v=r,$("#confirmModal-content").html("Do you want to save this project?<br/><br/>"+e.join("")+(0==i.length?"":"<br/>"+i.join("<br/>"))+u);let c=$("#button-confirm-save");l?(utils.disableButton(c,"Are you sure?"),setTimeout(()=>{utils.enableButton(c,"Confirm save")},5e3)):utils.enableButton(c,"Confirm save"),$("#confirmModal").modal()}else $.notify({message:"No modifications made."},{type:"info"})}else{let n={};if(n.projectname=$("#input-project-name").val(),t.includes(n.projectname.toLowerCase()))return $.notify({message:"This name cannot be used for a project."},{type:"danger"}),!1;h=!0,c(),utils.disableButton(e,"Creating the project..."),n.pluginnames=$("#input-plugins").val().split(","),n.collaborators=$("#input-collaborators").val().split(","),n.pluginnames.length>0&&0==n.pluginnames[0].trim().length&&(n.pluginnames=[]),n.collaborators.length>0&&0==n.collaborators[0].trim().length&&(n.collaborators=[]);let o=$(".env-row"),a={};for(let e=0;e<o.length;e++){let t=$(o.get(e)),n=t.find(".input-env-key").val().trim();n.length>0&&(a[n]=t.find(".input-env-val").val())}n.userenv=a;let i=$(".customconf-row"),l={};for(let e=0;e<i.length;e++){let t=$(i.get(e)),n=t.find(".input-customconf-key").val().trim();if(n.length>0){let e=t.find(".input-customconf-val").val();if("num_forced"==t.attr("data-rowtype")){let t=Number(e);isNaN(t)||(e=t)}wantconf[n]=e}}n.customconf=l;let r=$(".domain-row"),s=[];for(let e=0;e<r.length;e++){let t=$(r.get(e)),n=t.find(".input-domain").val().trim();n.length>0&&s.push({domain:n,enablesub:t.find(".input-enablesub").is(":checked")})}n.customdomains=s,$.post("/api/v1/projects/create",n).fail((t,n,o)=>{h=!1,$.notify({message:"Unable to contact server. See console for details."},{type:"danger"}),console.warn("Unable to create project (server error):",o),d(),utils.enableButton(e,"Create this project")}).done(t=>{t.error?(h=!1,409==t.code?(utils.addNotification(t.message,"warning"),location.href="list"):($.notify({message:"Unable to create this project. See console for details."},{type:"danger"}),console.warn("Unable to create project (application error):",error),d(),utils.enableButton(e,"Create this project"))):(utils.addNotification("Project successfully created.","success"),location.href="list")})}return!1},confirmSave:function(){if(null==f)return;let e=f;f=null,h=!0,$("#confirmModal").modal("hide");let t=$("#confirm-button");c(),utils.disableButton(t,"Saving the project..."),$.post("/api/v1/projects/edit/"+values.name,{differences:JSON.stringify(e),restart:-1!=o&&v?"true":"false"}).fail((e,n,o)=>{h=!1,$.notify({message:"Unable to contact server. See console for details."},{type:"danger"}),console.warn("Unable to save the project (server error):",o),d(),$("#input-project-name").attr("disabled","disabled"),utils.enableButton(t,"Save this project")}).done(e=>{e.error?(h=!1,$.notify({message:"Unable to save this project. See console for details."},{type:"danger"}),console.warn("Unable to save the project (application error):",error),d(),$("#input-project-name").attr("disabled","disabled"),utils.enableButton(t,"Save this project")):(utils.addNotification("Project successfully saved.","success"),location.href="../list")})},onRowInput:function(e){let t=(e=$(e)).parent().parent().parent(),n=t.attr("data-rowtype");a(e.val())?t.attr("data-rowtype","str_default"==n?"str_forced":n):t.attr("data-rowtype","str_default")},setRowTypeFromButton:function(e,t){$(e).parent().parent().parent().parent().parent().attr("data-rowtype",t+"_forced")}}}.call(this,n("URgk").setImmediate)},yLpj:function(e,t){var n;n=function(){return this}();try{n=n||new Function("return this")()}catch(e){"object"==typeof window&&(n=window)}e.exports=n}});