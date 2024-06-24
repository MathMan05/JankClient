function setDynamicHeight() {
    var servertdHeight = document.getElementById('servertd').offsetHeight+document.getElementById('typebox').offsetHeight+document.getElementById('pasteimage').offsetHeight;
    document.documentElement.style.setProperty('--servertd-height', servertdHeight + 'px');
}
const resizeObserver = new ResizeObserver(() => {
    setDynamicHeight();
});
resizeObserver.observe(document.getElementById('servertd'));
resizeObserver.observe(document.getElementById('typebox'));
resizeObserver.observe(document.getElementById('pasteimage'));
setDynamicHeight();

const users=getBulkUsers();
if(!users.currentuser){
    window.location.href = '/login.html';
}
var info=users.users[users.currentuser].serverurls;
let token=users.users[users.currentuser].token;
let READY;

let thisuser=new localuser(users.users[users.currentuser]);
thisuser.initwebsocket().then(_=>{
    thisuser.loaduser();
    thisuser.init();
    document.getElementById("loading").classList.add("doneloading");
    document.getElementById("loading").classList.remove("loading");
    console.log("done loading")
});
{
    const userinfo=document.getElementById("userinfo");
    const userdock=document.getElementById("userdock");
    userinfo.addEventListener("click",function(event){
        const table=document.createElement("table");
        for(const thing of Object.values(users.users)){
            console.log(thing.pfpsrc)
            const tr=document.createElement("tr");
            const td=document.createElement("td");

            const userinfo=document.createElement("table");
            userinfo.classList.add("switchtable");
            const row=document.createElement("tr");
            userinfo.append(row)
            const pfpcell=document.createElement("td");
            row.append(pfpcell);
            const pfp=document.createElement("img");
            pfpcell.append(pfp);

            const usertd=document.createElement("td")
            row.append(usertd);
            const user=document.createElement("div");
            usertd.append(user);
            user.append(thing.username);
            user.append(document.createElement("br"));
            const span=document.createElement("span");
            span.textContent=thing.serverurls.wellknown.hostname;
            user.append(span);
            span.classList.add("serverURL")

            pfp.src=thing.pfpsrc;
            pfp.classList.add("pfp");
            td.append(userinfo)

            tr.append(td);
            table.append(tr);
            tr.addEventListener("click",_=>{
                thisuser.unload();
                document.getElementById("loading").classList.remove("doneloading");
                document.getElementById("loading").classList.add("loading");
                thisuser=new localuser(thing);
                window.info =thing.serverurls;
                users.currentuser=thing.uid;
                localStorage.setItem("userinfos",JSON.stringify(users));
                thisuser.initwebsocket().then(_=>{
                    thisuser.loaduser();
                    thisuser.init();
                    document.getElementById("loading").classList.add("doneloading");
                    document.getElementById("loading").classList.remove("loading");
                    console.log("done loading")

                });
            })
        }
        {
            const tr=document.createElement("tr");
            const td=document.createElement("td");
            tr.append(td);
            td.append("Switch accounts ⇌");
            td.addEventListener("click",_=>{
                window.location.href="/login.html";
            })
            table.append(tr);
        }
        table.classList.add("accountSwitcher");
        if(currentmenu!=""){
            currentmenu.remove();
        }
        currentmenu=table;
        console.log(table);
        userdock.append(table);
        event.stopImmediatePropagation();
    })
}
var currentmenu="";
document.addEventListener('click', function(event) {
    if(currentmenu==""){
        return;
    }
    if (!currentmenu.contains(event.target)) {
        currentmenu.remove();
        currentmenu="";
    }
});
let replyingto=null;
{
    const menu=new contextmenu("create rightclick");
    menu.addbutton("Create channel",function(){
        createchannels(thisuser.lookingguild.createChannel.bind(thisuser.lookingguild));
    },null,_=>{return thisuser.isAdmin()})

    menu.addbutton("Create category",function(){
        createcategory(thisuser.lookingguild.createChannel.bind(thisuser.lookingguild));
    },null,_=>{return thisuser.isAdmin()})
    menu.bind(document.getElementById("channels"))
}


function createchannels(fincall){
    let name="";
    let category=0;
    console.log(fincall);
    channelselect=new fullscreen(
    ["vdiv",
        ["radio","select channel type",
            ["voice","text","announcement"],
            function(e){
                console.log(e)
                category={"text":0,"voice":2,"announcement":5,"category":4}[e]
            },
            1
        ],
        ["textbox","Name of channel","",function(){
            console.log(this)
            name=this.value
        }],
        ["button","","submit",function(){
            console.log(name,category)
            fincall(name,category);
            channelselect.hide();
        }]
    ]);
    channelselect.show();
}
function createcategory(fincall){
    let name="";
    let category=4;
    console.log(fincall);
    channelselect=new fullscreen(
    ["vdiv",
        ["textbox","Name of category","",function(){
            console.log(this)
            name=this.value
        }],
        ["button","","submit",function(){
            console.log(name,category)
            fincall(name,category);
            channelselect.hide();
        }]
    ]);
    channelselect.show();
}
function editchannelf(channel){channel.editChannel();}

let messagelist=[];
function buildprofile(x,y,user,type="author"){
    if(currentmenu!=""){
        currentmenu.remove();
    }
    let nickname, username, discriminator, bio, bot, pronouns, id, avatar
    if(type=="author"){
        console.log(user)
        username=nickname=user.username;
        bio=user.bio;
        id=user.id;
        discriminator=user.discriminator;
        pronouns=user.pronouns;
        bot=user.bot;
        avatar=user.avatar;
    }

    const div=document.createElement("table");
    if(x!==-1){
        div.style.left=x+"px";
        div.style.top=y+"px";
        div.classList.add("profile");
    }else{
        div.classList.add("hypoprofile");
    }

    {
        const pfp=user.buildpfp();
        const pfprow=document.createElement("tr");
        div.appendChild(pfprow);
        pfprow.appendChild(pfp);
    }
    {
        const userbody=document.createElement("tr");
        userbody.classList.add("infosection");
        div.appendChild(userbody);
        const usernamehtml=document.createElement("h2");
        usernamehtml.textContent=nickname;
        userbody.appendChild(usernamehtml);

        const discrimatorhtml=document.createElement("h3");
        discrimatorhtml.classList.add("tag");
        discrimatorhtml.textContent=username+"#"+discriminator;
        userbody.appendChild(discrimatorhtml)

        const pronounshtml=document.createElement("p");
        pronounshtml.textContent=pronouns;
        pronounshtml.classList.add("pronouns");
        userbody.appendChild(pronounshtml)

        const rule=document.createElement("hr");
        userbody.appendChild(rule);
        const biohtml=markdown(bio);
        userbody.appendChild(biohtml);
    }
    console.log(div);
    if(x!==-1){
        currentmenu=div;
        document.body.appendChild(div)
    }
    return div
}
function profileclick(obj,author){
    obj.onclick=function(e){
        console.log(e.clientX,e.clientY,author);
        buildprofile(e.clientX,e.clientY,author);
        e.stopPropagation();
    }
}

var editing=false;
const typebox=document.getElementById("typebox")
typebox.addEventListener("keyup",enter);
typebox.addEventListener("keydown",event=>{
    if(event.key === "Enter"&&!event.shiftKey) event.preventDefault();
});
console.log(typebox)
typebox.onclick=console.log;

async function enter(event){
    thisuser.channelfocus.typingstart();
    if(event.key === "Enter"&&!event.shiftKey){
        event.preventDefault();
        if(editing){
            editing.edit(typebox.value);
            editing=false;
        }else{
            let replying=replyingto?.all;
            if(replyingto){
                replyingto.classList.remove("replying");
            }
            replyingto=false;
            thisuser.channelfocus.sendMessage(typebox.value,{
                attachments:images,
                replyingto:replying,
            })
        }
        while(images.length!=0){
            images.pop();
            pasteimage.removeChild(imageshtml.pop());
        }
        typebox.value="";
        return;
    }
}

let packets=1;
let serverz=0;
let serverid=[];




let cchanel=0;


function getguildinfo(){
    const path=window.location.pathname.split("/");
    const channel=path[3];
    ws.send(JSON.stringify({op: 14, d: {guild_id: path[2], channels: {[channel]: [[0, 99]]}}}));
}


const images=[];
const imageshtml=[];
function createunknown(fname,fsize,src){
    const div=document.createElement("table");
    div.classList.add("unknownfile");
    const nametr=document.createElement("tr");
    div.append(nametr);
    const fileicon=document.createElement("td");
    nametr.append(fileicon);
    fileicon.append("🗎");
    fileicon.classList.add("fileicon");
    fileicon.rowSpan="2";
    const nametd=document.createElement("td");
    if(src){
        const a=document.createElement("a");
        a.href=src;
        a.textContent=fname;
        nametd.append(a);
    }else{
        nametd.textContent=fname;
    }

    nametd.classList.add("filename");
    nametr.append(nametd);
    const sizetr=document.createElement("tr");
    const size=document.createElement("td");
    sizetr.append(size);
    size.textContent="Size:"+filesizehuman(fsize);
    size.classList.add("filesize");
    div.appendChild(sizetr)
    return div;
}
function filesizehuman(fsize){
    var i = fsize == 0 ? 0 : Math.floor(Math.log(fsize) / Math.log(1024));
    return +((fsize / Math.pow(1024, i)).toFixed(2)) * 1 + ' ' + ['Bytes', 'Kilobytes', 'Megabytes', 'Gigabytes', 'Terabytes'][i];
}
function createunknownfile(file){
    return createunknown(file.name,file.size)
}
function filetohtml(file){
    if (file.type.startsWith('image/')) {
        const img = document.createElement('img');
        const blob = URL.createObjectURL(file);
        img.src = blob;
        return img;
    }else{
        console.log(file.name);

        return createunknownfile(file);
    }
}
document.addEventListener('paste', async (e) => {
  Array.from(e.clipboardData.files).forEach(async (file) => {
    e.preventDefault();
    const html=filetohtml(file);
    pasteimage.appendChild(html);
    const blob = URL.createObjectURL(file);
    images.push(file)
    imageshtml.push(html);

    console.log(file.type)
  });
});

setTheme();

function userSettings(){
    thisuser.usersettings.show();
}
let triggered=false;
document.getElementById("messagecontainer").addEventListener("scroll",(e)=>{
    const messagecontainer=document.getElementById("messagecontainer")
    if(messagecontainer.scrollTop<2000){
        if(!triggered){
            thisuser.lookingguild.prevchannel.grabmoremessages().then(()=>{
                triggered=false;
                if(messagecontainer.scrollTop===0){
                    messagecontainer.scrollTop=1;
                }
            });
        }
        triggered=true;
    }else{
        if(Math.abs(messagecontainer.scrollHeight-messagecontainer.scrollTop-messagecontainer.clientHeight) < 3){
            thisuser.lookingguild.prevchannel.readbottom();
        }
    }
    //
})
if(mobile){
    document.getElementById("channelw").onclick=function(){
        document.getElementById("channels").parentNode.classList.add("collapse");
        document.getElementById("servertd").classList.add("collapse");
        document.getElementById("servers").classList.add("collapse");
    }
    document.getElementById("mobileback").textContent="#";
    document.getElementById("mobileback").onclick=function(){
        document.getElementById("channels").parentNode.classList.remove("collapse");
        document.getElementById("servertd").classList.remove("collapse");
        document.getElementById("servers").classList.remove("collapse");
    }
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
