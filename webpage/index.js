const info=JSON.parse(localStorage.getItem("instanceinfo"));
info.api=new URL(info.api);
info.cdn=new URL(info.cdn);
info.gateway=new URL(info.gateway);
info.wellknown=new URL(info.wellknown);
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


let token=gettoken();
let ws
initwebsocket();
let READY;

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
    const menu=new contextmenu("create backclick");
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
    console.log(fincall)
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
    console.log(fincall)
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
        usernamehtml.innerText=nickname;
        userbody.appendChild(usernamehtml);

        const discrimatorhtml=document.createElement("h3");
        discrimatorhtml.classList.add("tag");
        discrimatorhtml.innerText=username+"#"+discriminator;
        userbody.appendChild(discrimatorhtml)

        const pronounshtml=document.createElement("p");
        pronounshtml.innerText=pronouns;
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
        buildprofile(e.clientX,e.clientY,author)
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
    thisuser.lookingguild.prevchannel.typingstart();
    if(event.key === "Enter"&&!event.shiftKey){
        event.preventDefault();
    if(editing){
        fetch(info.api.toString()+"/channels/"+window.location.pathname.split("/")[3]+"/messages/"+editing,{
            method: "PATCH",
            headers: {
                "Content-type": "application/json; charset=UTF-8",
                Authorization:token
            },
            body:JSON.stringify({content:typebox.value})

        })
        typebox.value="";
        editing=false;
    }else{
        let replyjson=false;
        if(replyingto){
            replyjson=
            {
                "guild_id":replyingto.all.guild_id,
                "channel_id": replyingto.all.channel_id,
                "message_id": replyingto.all.id,
            };
            replyingto.classList.remove("replying");
        }

        replyingto=false;
        if(images.length==0){

            const body={
                content:typebox.value,
                nonce:Math.floor(Math.random()*1000000000)
            };
            if(replyjson){
                body.message_reference=replyjson;
            }
            console.log(body)
            fetch(info.api.toString()+"/channels/"+window.location.pathname.split("/")[3]+"/messages",{
                method:"POST",
                headers:{
                    "Content-type": "application/json; charset=UTF-8",
                    Authorization:token,
                },
                body:JSON.stringify(body)
            }).then(
                function(out){
                console.log(out,"here it is")
                }
            )
            typebox.value="";
        }else{
            let formData = new FormData();
            const body={
                content:typebox.value,
                nonce:Math.floor(Math.random()*1000000000),
            }
            if(replyjson){
                body.message_reference=replyjson;
            }
            formData.append('payload_json', JSON.stringify(body));
            for(i in images){
                console.log(images[i])
                formData.append("files["+i+"]",images[i]);
            }
            const data=formData.entries()
            console.log(data.next(),data.next(),data.next())
            console.log((await fetch(info.api.toString()+"/channels/"+window.location.pathname.split("/")[3]+"/messages", {
                method: 'POST',
                body: formData,
                headers:{
                    "Authorization":token,
                }
            })));
            //fetch("/sendimagemessage",{body:formData,method:"POST"})

            while(images.length!=0){
                images.pop()
                pasteimage.removeChild(imageshtml.pop())
            }
            typebox.value="";
        }
    }
    }
}

let packets=1;
let serverz=0;
let serverid=[];
let thisuser=null;


function initwebsocket(){
    ws = new WebSocket(info.gateway.toString());

    ws.addEventListener('open', (event) => {
    console.log('WebSocket connected');
    ws.send(JSON.stringify({
        "op": 2,
        "d": {
            "token":token,
            "capabilities": 16381,
            "properties": {
                "browser": "Jank Client",
                "client_build_number": 0,
                "release_channel": "Custom",
                "browser_user_agent": navigator.userAgent
            },
            "compress": false,
            "presence": {
                "status": "online",
                "since": new Date().getTime(),
                "activities": [],
                "afk": false
            }
        }
    }))
    });

    ws.addEventListener('message', (event) => {


    try{
        const temp=JSON.parse(event.data);
        console.log(temp)
        if(temp.op==0){
            switch(temp.t){
                case "MESSAGE_CREATE":
                    if(thisuser){
                        thisuser.messageCreate(temp);
                    }
                    break;
                case "READY":
                    thisuser=new localuser(temp);
                    thisuser.loaduser();
                    READY=temp;
                    thisuser.init();
                    genusersettings();
                    document.getElementById("loading").classList.add("doneloading");
                    document.getElementById("loading").classList.remove("loading")
                    break;
                case "MESSAGE_UPDATE":
                    if(thisuser){
                        if(window.location.pathname.split("/")[3]==temp.d.channel_id){
                            const find=temp.d.id;
                            for(const message of messagelist){
                                if(message.all.id===find){
                                    message.all.content=temp.d.content;
                                    message.txt.innerHTML=markdown(temp.d.content).innerHTML;
                                    break;
                                }
                            }
                    }
                    }
                    break;
                case "TYPING_START":
                    if(thisuser){
                        thisuser.typeingStart(temp);
                    }
                    break;
                case "USER_UPDATE":
                    if(thisuser){
                        const users=user.userids[temp.d.id];
                        console.log(users,temp.d.id)

                        if(users){
                            users.userupdate(temp.d);
                            console.log("in here");
                        }
                    }
                    break
                case "CHANNEL_UPDATE":
                    if(thisuser){
                        thisuser.updateChannel(temp.d);
                    }
                    break;
                case "CHANNEL_CREATE":
                    if(thisuser){
                        thisuser.createChannel(temp.d);
                    }
                    break;
                case "CHANNEL_DELETE":
                    if(thisuser){
                        thisuser.delChannel(temp.d);
                    }
                    break;
            }

        }else if(temp.op===10){
            console.log("heartbeat down")
            setInterval(function(){
                ws.send(JSON.stringify({op:1,d:packets}))
            },temp.d.heartbeat_interval)
            packets=1;
        }else if(temp.op!=11){
            packets++
        }
    }catch(error){
        console.error(error)
    }

    });

    ws.addEventListener('close', (event) => {
    console.log('WebSocket closed');
    });
}

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
        a.innerText=fname;
        nametd.append(a);
    }else{
        nametd.innerText=fname;
    }

    nametd.classList.add("filename");
    nametr.append(nametd);
    const sizetr=document.createElement("tr");
    const size=document.createElement("td");
    sizetr.append(size);
    size.innerText="Size:"+filesizehuman(fsize);
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
let usersettings
function genusersettings(){
    const hypothetcialprofie=document.createElement("div");
    let file=null;
    let newprouns=null;
    let newbio=null;
    let hypouser=new user(thisuser.user,true);
    function regen(){
        hypothetcialprofie.textContent="";
        const hypoprofile=buildprofile(-1,-1,hypouser);

        hypothetcialprofie.appendChild(hypoprofile)
        console.log(hypothetcialprofie,hypoprofile)
    }
    regen();
    usersettings=new fullscreen(
    ["hdiv",
        ["vdiv",
            ["fileupload","upload pfp:",function(e){
                console.log(this.files[0])
                file=this.files[0];
                const blob = URL.createObjectURL(this.files[0]);
                hypouser.avatar = blob;
                hypouser.hypotheticalpfp=true;
                regen();
            }],
            ["textbox","Pronouns:",thisuser.user.pronouns,function(e){
                console.log(this.value);
                hypouser.pronouns=this.value;
                newprouns=this.value;
                regen();
            }],
            ["mdbox","Bio:",thisuser.user.bio,function(e){
                console.log(this.value);
                hypouser.bio=this.value;
                newbio=this.value;
                regen();
            }],
            ["button","update user content:","submit",function(){
                if(file!==null){
                    thisuser.updatepfp(file);
                }
                if(newprouns!==null){
                    thisuser.updatepronouns(newprouns);
                }
                if(newbio!==null){
                    thisuser.updatebio(newbio);
                }
            }],
            ["select","Theme:",["Dark","Light","WHITE"],e=>{
                localStorage.setItem("theme",["Dark","Light","WHITE"][e.target.selectedIndex]);
                setTheme();
            },["Dark","Light","WHITE"].indexOf(localStorage.getItem("theme"))]
        ],
        ["vdiv",
            ["html",hypothetcialprofie]
        ]
    ],_=>{},function(){
        hypouser=new user(thisuser.user);
        regen();
        file=null;
        newprouns=null;
        newbio=null;
    })
}
setTheme();

function userSettings(){
    usersettings.show();
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
