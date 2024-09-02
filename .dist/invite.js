import { getBulkUsers, getapiurls } from "./login.js";
(async () => {
    const users = getBulkUsers();
    const well = new URLSearchParams(window.location.search).get("instance");
    const joinable = [];
    for (const thing in users.users) {
        const user = users.users[thing];
        if (user.serverurls.wellknown.includes(well)) {
            joinable.push(user);
        }
        console.log(users.users[thing]);
    }
    let urls;
    if (!joinable.length && well) {
        const out = await getapiurls(well);
        if (out) {
            urls = out;
            for (const thing in users.users) {
                const user = users.users[thing];
                if (user.serverurls.api.includes(out.api)) {
                    joinable.push(user);
                }
                console.log(users.users[thing]);
            }
        }
        else {
            throw new Error("someone needs to handle the case where the servers don't exist");
        }
    }
    else {
        urls = joinable[0].serverurls;
    }
    if (!joinable.length) {
        document.getElementById("AcceptInvite").textContent = "Create an account to accept the invite";
    }
    const code = window.location.pathname.split("/")[2];
    let guildinfo;
    fetch(`${urls.api}/invites/${code}`, {
        method: "GET"
    }).then(_ => _.json()).then(json => {
        const guildjson = json.guild;
        guildinfo = guildjson;
        document.getElementById("invitename").textContent = guildjson.name;
        document.getElementById("invitedescription").textContent =
            `${json.inviter.username} invited you to join ${guildjson.name}`;
        if (guildjson.icon) {
            const img = document.createElement("img");
            img.src = `${urls.cdn}/icons/${guildjson.id}/${guildjson.icon}.png`;
            img.classList.add("inviteGuild");
            document.getElementById("inviteimg").append(img);
        }
        else {
            const txt = guildjson.name.replace(/'s /g, " ").replace(/\w+/g, word => word[0]).replace(/\s/g, "");
            const div = document.createElement("div");
            div.textContent = txt;
            div.classList.add("inviteGuild");
            document.getElementById("inviteimg").append(div);
        }
    });
    function showAccounts() {
        const table = document.createElement("dialog");
        for (const thing of Object.values(joinable)) {
            const specialuser = thing;
            console.log(specialuser.pfpsrc);
            const userinfo = document.createElement("div");
            userinfo.classList.add("flexltr", "switchtable");
            const pfp = document.createElement("img");
            userinfo.append(pfp);
            const user = document.createElement("div");
            userinfo.append(user);
            user.append(specialuser.username);
            user.append(document.createElement("br"));
            const span = document.createElement("span");
            span.textContent = specialuser.serverurls.wellknown.replace("https://", "").replace("http://", "");
            user.append(span);
            user.classList.add("userinfo");
            span.classList.add("serverURL");
            pfp.src = specialuser.pfpsrc;
            pfp.classList.add("pfp");
            table.append(userinfo);
            userinfo.addEventListener("click", _ => {
                console.log(thing);
                fetch(`${urls.api}/invites/${code}`, {
                    method: "POST",
                    headers: {
                        Authorization: thing.token
                    }
                }).then(_ => {
                    users.currentuser = specialuser.uid;
                    localStorage.setItem("userinfos", JSON.stringify(users));
                    window.location.href = "/channels/" + guildinfo.id;
                });
            });
        }
        {
            const td = document.createElement("div");
            td.classList.add("switchtable");
            td.append("Login or create an account ⇌");
            td.addEventListener("click", _ => {
                const l = new URLSearchParams("?");
                l.set("goback", window.location.href);
                l.set("instance", well);
                window.location.href = "/login?" + l.toString();
            });
            if (!joinable.length) {
                const l = new URLSearchParams("?");
                l.set("goback", window.location.href);
                l.set("instance", well);
                window.location.href = "/login?" + l.toString();
            }
            table.append(td);
        }
        table.classList.add("accountSwitcher");
        console.log(table);
        document.body.append(table);
    }
    document.getElementById("AcceptInvite").addEventListener("click", showAccounts);
})();
