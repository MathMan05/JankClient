import { Localuser } from "./localuser.js";
import { Contextmenu } from "./contextmenu.js";
import { mobile, getBulkUsers, setTheme } from "./login.js";
async function waitforload() {
    let res;
    new Promise(r => { res = r; });
    document.addEventListener("DOMContentLoaded", function () {
        res();
    });
    await res;
}
await waitforload();
const users = getBulkUsers();
if (!users.currentuser) {
    window.location.href = '/login.html';
}
let thisuser = new Localuser(users.users[users.currentuser]);
thisuser.initwebsocket().then(_ => {
    thisuser.loaduser();
    thisuser.init();
    document.getElementById("loading").classList.add("doneloading");
    document.getElementById("loading").classList.remove("loading");
    console.log("done loading");
});
{
    const userinfo = document.getElementById("userinfo");
    const userdock = document.getElementById("userdock");
    userinfo.addEventListener("click", function (event) {
        const table = document.createElement("div");
        for (const thing of Object.values(users.users)) {
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
                thisuser.unload();
                document.getElementById("loading").classList.remove("doneloading");
                document.getElementById("loading").classList.add("loading");
                thisuser = new Localuser(specialuser);
                users["currentuser"] = specialuser.uid;
                localStorage.setItem("userinfos", JSON.stringify(users));
                thisuser.initwebsocket().then(_ => {
                    thisuser.loaduser();
                    thisuser.init();
                    document.getElementById("loading").classList.add("doneloading");
                    document.getElementById("loading").classList.remove("loading");
                    console.log("done loading");
                });
            });
        }
        {
            const td = document.createElement("div");
            td.classList.add("switchtable");
            td.append("Switch accounts ⇌");
            td.addEventListener("click", _ => {
                window.location.href = "/login.html";
            });
            table.append(td);
        }
        table.classList.add("accountSwitcher");
        if (Contextmenu.currentmenu != "") {
            Contextmenu.currentmenu.remove();
        }
        Contextmenu.currentmenu = table;
        console.log(table);
        document.body.append(table);
        event.stopImmediatePropagation();
    });
}
{
    const menu = new Contextmenu("create rightclick");
    menu.addbutton("Create channel", function () {
        thisuser.lookingguild.createchannels();
    }, null, _ => { return thisuser.isAdmin(); });
    menu.addbutton("Create category", function () {
        thisuser.lookingguild.createcategory();
    }, null, _ => { return thisuser.isAdmin(); });
    menu.bind(document.getElementById("channels"));
}
const pasteimage = document.getElementById("pasteimage");
let replyingto = null;
async function enter(event) {
    const channel = thisuser.channelfocus;
    channel.typingstart();
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        if (channel.editing) {
            channel.editing.edit(markdown.rawString);
            channel.editing = null;
        }
        else {
            replyingto = thisuser.channelfocus.replyingto;
            let replying = replyingto;
            if (replyingto) {
                replyingto.div.classList.remove("replying");
            }
            thisuser.channelfocus.replyingto = null;
            channel.sendMessage(markdown.rawString, {
                attachments: images,
                replyingto: replying,
            });
            thisuser.channelfocus.makereplybox();
        }
        while (images.length != 0) {
            images.pop();
            pasteimage.removeChild(imageshtml.pop());
        }
        typebox.innerHTML = "";
        return;
    }
}
const typebox = document.getElementById("typebox");
const markdown = new MarkDown("", thisuser);
markdown.giveBox(typebox);
typebox["markdown"] = markdown;
typebox.addEventListener("keyup", enter);
typebox.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey)
        event.preventDefault();
});
console.log(typebox);
typebox.onclick = console.log;
function getguildinfo() {
    const path = window.location.pathname.split("/");
    const channel = path[3];
    this.ws.send(JSON.stringify({ op: 14, d: { guild_id: path[2], channels: { [channel]: [[0, 99]] } } }));
}
const images = [];
const imageshtml = [];
import { File } from "./file.js";
import { MarkDown } from "./markdown.js";
document.addEventListener('paste', async (e) => {
    Array.from(e.clipboardData.files).forEach(async (f) => {
        const file = File.initFromBlob(f);
        e.preventDefault();
        const html = file.upHTML(images, f);
        pasteimage.appendChild(html);
        images.push(f);
        imageshtml.push(html);
    });
});
setTheme();
function userSettings() {
    thisuser.showusersettings();
}
document.getElementById("settings").onclick = userSettings;
function userConnections() {
    thisuser.userConnections.show();
}
document.getElementById("connections").onclick = userConnections;
function devPortal() {
    thisuser.devPortal.show();
}
document.getElementById("dev-portal").onclick = devPortal;
if (mobile) {
    document.getElementById("channelw").onclick = function () {
        document.getElementById("channels").parentNode.classList.add("collapse");
        document.getElementById("servertd").classList.add("collapse");
        document.getElementById("servers").classList.add("collapse");
    };
    document.getElementById("mobileback").textContent = "#";
    document.getElementById("mobileback").onclick = function () {
        document.getElementById("channels").parentNode.classList.remove("collapse");
        document.getElementById("servertd").classList.remove("collapse");
        document.getElementById("servers").classList.remove("collapse");
    };
}
