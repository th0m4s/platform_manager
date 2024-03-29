function init() {
    let count = window.domains.length, list = $("#domains-list");
    if(count == 0) {
        $("#no-domains").show();
        list.hide();
    } else {
        let projects = {};
        for(let domain of window.domains) {
            let project = domain.projectname || "def";
            if(projects[project] == undefined) projects[project] = [];
            projects[project].push(domain);
        }

        for(let [project, pDomains] of Object.entries(projects)) {
            let projectLine = project == "def" ? "Platform domains" : "Domains linked to project <i>" + project + "</i>";
            let domainsHtml = pDomains.map((d) => "<li>" + d.name + "</li>").join("");

            let btnHtml = "";
            if(project != "def")
                btnHtml = `<div class="btn-group" role="group" style="position: absolute; right: 10px; top: 10px;"><a onclick="utils.setBackCookie()" href="/panel/projects/details/${project}" class="btn btn-sm btn-info thinable-btn"><i class="fas fa-info-circle"></i> <span>View project details</span></a><a onclick="utils.setBackCookie()" href="/panel/projects/edit/${project}" class="btn btn-sm btn-primary thinable-btn"><i class="fas fa-edit"></i> <span>Edit project</span></a></div>`;

            list.append(`<li class="list-group-item">${projectLine}:${btnHtml}<ul>${domainsHtml}</ul></li>`);
        }
    }

    thin_buttons.prepareButtons();
}


window.mails_domains = {init};