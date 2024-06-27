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
function setDynamicHeight() {
    var servertdHeight = document.getElementById('servertd').offsetHeight + document.getElementById('typebox').offsetHeight + document.getElementById('pasteimage').offsetHeight;
    document.documentElement.style.setProperty('--servertd-height', servertdHeight + 'px');
}
const resizeObserver = new ResizeObserver(() => {
    setDynamicHeight();
});
resizeObserver.observe(document.getElementById('servertd'));
resizeObserver.observe(document.getElementById('typebox'));
resizeObserver.observe(document.getElementById('pasteimage'));
setDynamicHeight();
const users = getBulkUsers();
if (!users.currentuser) {
    window.location.href = '/login.html';
}
var info = users.users[users.currentuser].serverurls;
let token = users.users[users.currentuser].token;
let READY;
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
        const table = document.createElement("table");
        for (const thing of Object.values(users.users)) {
            const specialuser = thing;
            console.log(specialuser.pfpsrc);
            const tr = document.createElement("tr");
            const td = document.createElement("td");
            const userinfo = document.createElement("table");
            userinfo.classList.add("switchtable");
            const row = document.createElement("tr");
            userinfo.append(row);
            const pfpcell = document.createElement("td");
            row.append(pfpcell);
            const pfp = document.createElement("img");
            pfpcell.append(pfp);
            const usertd = document.createElement("td");
            row.append(usertd);
            const user = document.createElement("div");
            usertd.append(user);
            user.append(specialuser.username);
            user.append(document.createElement("br"));
            const span = document.createElement("span");
            span.textContent = specialuser.serverurls.wellknown.hostname;
            user.append(span);
            span.classList.add("serverURL");
            pfp.src = specialuser.pfpsrc;
            pfp.classList.add("pfp");
            td.append(userinfo);
            tr.append(td);
            table.append(tr);
            tr.addEventListener("click", _ => {
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
            const tr = document.createElement("tr");
            const td = document.createElement("td");
            tr.append(td);
            td.append("Switch accounts ⇌");
            td.addEventListener("click", _ => {
                window.location.href = "/login.html";
            });
            table.append(tr);
        }
        table.classList.add("accountSwitcher");
        if (Contextmenu.currentmenu != "") {
            Contextmenu.currentmenu.remove();
        }
        Contextmenu.currentmenu = table;
        console.log(table);
        userdock.append(table);
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
function editchannelf(channel) { channel.editChannel(); }
const pasteimage = document.getElementById("pasteimage");
let replyingto = null;
async function enter(event) {
    const channel = thisuser.channelfocus;
    channel.typingstart();
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        if (channel.editing) {
            channel.editing.edit((typebox).value);
            channel.editing = null;
        }
        else {
            let replying = replyingto?.all;
            if (replyingto) {
                replyingto.classList.remove("replying");
            }
            replyingto = false;
            channel.sendMessage(typebox.value, {
                attachments: images,
                replyingto: replying,
            });
        }
        while (images.length != 0) {
            images.pop();
            pasteimage.removeChild(imageshtml.pop());
        }
        typebox.value = "";
        return;
    }
}
const typebox = document.getElementById("typebox");
typebox.addEventListener("keyup", enter);
typebox.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey)
        event.preventDefault();
});
console.log(typebox);
typebox.onclick = console.log;
let serverz = 0;
let serverid = [];
let cchanel = 0;
function getguildinfo() {
    const path = window.location.pathname.split("/");
    const channel = path[3];
    this.ws.send(JSON.stringify({ op: 14, d: { guild_id: path[2], channels: { [channel]: [[0, 99]] } } }));
}
const images = [];
const imageshtml = [];
function createunknown(fname, fsize) {
    const div = document.createElement("table");
    div.classList.add("unknownfile");
    const nametr = document.createElement("tr");
    div.append(nametr);
    const fileicon = document.createElement("td");
    nametr.append(fileicon);
    fileicon.append("🗎");
    fileicon.classList.add("fileicon");
    fileicon.rowSpan = 2;
    const nametd = document.createElement("td");
    {
        nametd.textContent = fname;
    }
    nametd.classList.add("filename");
    nametr.append(nametd);
    const sizetr = document.createElement("tr");
    const size = document.createElement("td");
    sizetr.append(size);
    size.textContent = "Size:" + filesizehuman(fsize);
    size.classList.add("filesize");
    div.appendChild(sizetr);
    return div;
}
function filesizehuman(fsize) {
    var i = fsize == 0 ? 0 : Math.floor(Math.log(fsize) / Math.log(1024));
    return +((fsize / Math.pow(1024, i)).toFixed(2)) * 1 + ' ' + ['Bytes', 'Kilobytes', 'Megabytes', 'Gigabytes', 'Terabytes'][i];
}
function createunknownfile(file) {
    return createunknown(file.name, file.size);
}
function filetohtml(file) {
    if (file.type.startsWith('image/')) {
        const img = document.createElement('img');
        const blob = URL.createObjectURL(file);
        img.src = blob;
        return img;
    }
    else {
        console.log(file.name);
        return createunknownfile(file);
    }
}
document.addEventListener('paste', async (e) => {
    Array.from(e.clipboardData.files).forEach(async (file) => {
        e.preventDefault();
        const html = filetohtml(file);
        pasteimage.appendChild(html);
        const blob = URL.createObjectURL(file);
        images.push(file);
        imageshtml.push(html);
        console.log(file.type);
    });
});
setTheme();
function userSettings() {
    thisuser.usersettings.show();
}
document.getElementById("settings").onclick = userSettings;
let triggered = false;
document.getElementById("messagecontainer").addEventListener("scroll", (e) => {
    const messagecontainer = document.getElementById("messagecontainer");
    if (messagecontainer.scrollTop < 2000) {
        if (!triggered) {
            thisuser.lookingguild.prevchannel.grabmoremessages().then(() => {
                triggered = false;
                if (messagecontainer.scrollTop === 0) {
                    messagecontainer.scrollTop = 1;
                }
            });
        }
        triggered = true;
    }
    else {
        if (Math.abs(messagecontainer.scrollHeight - messagecontainer.scrollTop - messagecontainer.clientHeight) < 3) {
            thisuser.lookingguild.prevchannel.readbottom();
        }
    }
    //
});
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
/*
{
    const messages=document.getElementById("messages");
    let height=messages.clientHeight;
    //
    const resizeObserver=new ResizeObserver(()=>{
        console.log(messages.scrollTop,messages.clientHeight-height-messages.scrollHeight);
        messages.scrollTop-=height-messages.scrollHeight;
        console.log(messages.scrollTop)
        //if(shouldsnap){
        //    document.getElementById("messagecontainer").scrollTop = document.getElementById("messagecontainer").scrollHeight;
        //}
        height=messages.scrollHeight;
    })
    resizeObserver.observe(messages)
}
*/
