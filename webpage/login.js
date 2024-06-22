const mobile=isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
function setTheme(){
    const name=localStorage.getItem("theme");
    if(!name){
        document.body.className="Dark-theme";
        localStorage.setItem("theme","Dark");
    }
    document.body.className=name+"-theme";
}
setTheme();
function getBulkUsers(){
    const json=getBulkInfo()
    for(const thing in json.users){
        json.users[thing]=new specialuser(json.users[thing]);
    }
    return json;
}
function getBulkInfo(){
    return JSON.parse(localStorage.getItem("userinfos"));
}
function setDefaults(){
    let userinfos=getBulkInfo()
    if(!userinfos){
        localStorage.setItem("userinfos",JSON.stringify({
            currentuser:null,
            users:{},
            preferances:
            {
                theme:"Dark",
                notifcations:false,
                notisound:"three",
            },
        }));
    }
    if(userinfos.users===undefined){
        userinfos.users={};
    }
    if(userinfos.preferances===undefined){
        userinfos.preferances={
                theme:"Dark",
                notifcations:false,
                notisound:"three",
            }
    }
    if(userinfos.preferances&&(userinfos.preferances.notisound===undefined)){
        userinfos.preferances.notisound="three";
    }
    localStorage.setItem("userinfos",JSON.stringify(userinfos));
}
setDefaults();
class specialuser{
    constructor(json){
        if(json instanceof specialuser){
            console.error("specialuser can't construct from another specialuser");
        }
        this.serverurls=json.serverurls;
        this.serverurls.api=new URL(this.serverurls.api);
        this.serverurls.cdn=new URL(this.serverurls.cdn);
        this.serverurls.gateway=new URL(this.serverurls.gateway);
        this.serverurls.wellknown=new URL(this.serverurls.wellknown);
        this.email=json.email;
        this.token=json.token;
        this.loggedin=json.loggedin;
        this.json=json;
        if(!this.serverurls||!this.email||!this.token){
            console.error("There are fundamentally missing pieces of info missing from this user");
        }
    }
    set pfpsrc(e){
        console.log("this ran fr")
        this.json.pfpsrc=e;
        this.updateLocal();
    }
    get pfpsrc(){
        return this.json.pfpsrc;
    }
    set username(e){
        this.json.username=e;
        this.updateLocal();
        }
    get username(){
        return this.json.username;
    }
    get uid(){
        return this.email+this.serverurls.wellknown;
    }
    toJSON(){
        return this.json;
    }
    updateLocal(){
        const info=getBulkInfo();
        info.users[this.uid]=this.toJSON();
        localStorage.setItem("userinfos",JSON.stringify(info));
    }
}
function adduser(user){
    user=new specialuser(user);
    const info=getBulkInfo();
    info.users[user.uid]=user;
    info.currentuser=user.uid;
    localStorage.setItem("userinfos",JSON.stringify(info));
}
const instancein=document.getElementById("instancein");
let timeout=0;
async function checkInstance(e){
    try{
        verify.textContent="Checking Instance";
        instanceinfo=await setInstance(instancein.value);
        localStorage.setItem("instanceinfo",JSON.stringify(instanceinfo));
        verify.textContent="Instance is all good"
        if(checkInstance.alt){checkInstance.alt();}
        setTimeout(_=>{
            console.log(verify.textContent)
            verify.textContent="";
        },3000);

    }catch(e){
        console.log("catch")
        verify.textContent="Invalid Instance, try again"
    }
}
if(instancein){
    console.log(instancein)
    instancein.addEventListener("keydown",e=>{
        const verify=document.getElementById("verify");
        verify.textContent="Waiting to check Instance"
        clearTimeout(timeout);
        timeout=setTimeout(checkInstance,1000);
    });
    if(localStorage.getItem("instanceinfo")){
        instancein.value=JSON.parse(localStorage.getItem("instanceinfo")).wellknown
    }else{
        checkInstance("https://spacebar.chat/");
    }
}


async function login(username, password){
    const options={
        method: "POST",
        body:JSON.stringify({
            "login": username,
            "password": password,
            "undelete":false
        }),
        headers: {
            "Content-type": "application/json; charset=UTF-8",
        }}
    try{
        const info=JSON.parse(localStorage.getItem("instanceinfo"));
        url=new URL(info.login);
        return await fetch(url.origin+'/api/auth/login',options).then(responce=>responce.json())
        .then((response) => {
            console.log(response,response.message)
            if("Invalid Form Body"===response.message){
                return response.errors.login._errors[0].message;
                console.log("test")
            }
            //this.serverurls||!this.email||!this.token
            adduser({serverurls:JSON.parse(localStorage.getItem("instanceinfo")),email:username,token:response.token});
            window.location.href = '/channels/@me';
            return response.token;
        })
    }catch(error){
        console.error('Error:', error);
    };
}
async function setInstance(url){
    url=new URL(url);
    async function attempt(aurl){
        const info=await fetch(`${aurl.toString()}${aurl.pathname.includes("api") ? "" : "api"}/policies/instance/domains`)
        .then((x) => x.json());
        return {
            api: info.apiEndpoint,
            gateway: info.gateway,
            cdn: info.cdn,
            wellknown: url,
            login:aurl.toString()
        }
    }
    try{
        return await attempt(url);
    }catch(e){

    }
    const wellKnown = await fetch(`${url.origin}/.well-known/spacebar`)
    .then((x) => x.json())
    .then((x) => new URL(x.api));
    return await attempt(wellKnown);
}


async function check(e){

    e.preventDefault();
    let h=await login(e.srcElement[1].value,e.srcElement[2].value);
    document.getElementById("wrong").textContent=h;
    console.log(h);
}
if(document.getElementById("form")){
document.getElementById("form").addEventListener("submit", check);
}
//Service workers :3
if ("serviceWorker" in navigator){
    navigator.serviceWorker.register("/service.js", {
    scope: "/",
    }).then((registration) => {
        let serviceWorker;
        if (registration.installing) {
            serviceWorker = registration.installing;
            console.log("installing");
        } else if (registration.waiting) {
            serviceWorker = registration.waiting;
            console.log("waiting");
        } else if (registration.active) {
            serviceWorker = registration.active;
            console.log("active");
        }
        if (serviceWorker) {
            console.log(serviceWorker.state);
            serviceWorker.addEventListener("statechange", (e) => {
                console.log(e.target.state);
            });
        }
    })
}
