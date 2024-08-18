import { Dialog } from "./dialog.js";

const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
export {mobile, getBulkUsers,getBulkInfo,setTheme,Specialuser,getapiurls,adduser}
function setTheme(){
    let name=localStorage.getItem("theme");
    if(!name){
        localStorage.setItem("theme","Dark");
        name="Dark";
    }
    document.body.className=name+"-theme";
}
setTheme();
function getBulkUsers(){
    const json=getBulkInfo()
    for(const thing in json.users){
        json.users[thing]=new Specialuser(json.users[thing]);
    }
    return json;
}
function trimswitcher(){
    const json=getBulkInfo()
    const map=new Map();
    for(const thing in json.users){
        const user=json.users[thing];
        console.log(user,json.users);
        let wellknown=user.serverurls.wellknown;
        if(wellknown[wellknown.length-1]!=="/"){
            wellknown+="/";
        }
        wellknown+=user.username;
        if(map.has(wellknown)){
            const otheruser=map.get(wellknown);
            if(otheruser[1].serverurls.wellknown[otheruser[1].serverurls.wellknown.length-1]==="/"){
                delete json.users[otheruser[0]];
                map.set(wellknown,[thing,user]);
            }else{
                 delete json.users[thing];
            }
        }else{
            map.set(wellknown,[thing,user]);
        }
    }
    localStorage.setItem("userinfos",JSON.stringify(json));
    console.log(json);
}
trimswitcher();
function getBulkInfo(){
    return JSON.parse(localStorage.getItem("userinfos"));
}
function setDefaults(){
    let userinfos=getBulkInfo();
    if(!userinfos){
        localStorage.setItem("userinfos",JSON.stringify({
            currentuser:null,
            users:{},
            preferences:
            {
                theme:"Dark",
                notifications:false,
                notisound:"three",
            },
        }));
        userinfos=getBulkInfo();
    }
    if(userinfos.users===undefined){
        userinfos.users={};
    }
    if(userinfos.accent_color===undefined){
        userinfos.accent_color="#242443";
    }
    document.documentElement.style.setProperty('--accent-color', userinfos.accent_color);
    if(userinfos.preferences===undefined){
        userinfos.preferences={
                theme:"Dark",
                notifications:false,
                notisound:"three",
            }
    }
    if(userinfos.preferences&&(userinfos.preferences.notisound===undefined)){
        userinfos.preferences.notisound="three";
    }
    localStorage.setItem("userinfos",JSON.stringify(userinfos))
}
setDefaults();
class Specialuser{
    serverurls:{api:string,cdn:string,gateway:string,wellknown:string,login:string};
    email:string;
    token:string;
    loggedin;
    json;
    constructor(json){
        if(json instanceof Specialuser){
            console.error("specialuser can't construct from another specialuser");
        }
        this.serverurls=json.serverurls;
        let apistring=new URL(json.serverurls.api).toString();
        apistring=apistring.replace(/\/(v\d+\/?)?$/, "")+"/v9";
        this.serverurls.api=apistring;
        this.serverurls.cdn=new URL(json.serverurls.cdn).toString().replace(/\/$/,"");
        this.serverurls.gateway=new URL(json.serverurls.gateway).toString().replace(/\/$/,"");;
        this.serverurls.wellknown=new URL(json.serverurls.wellknown).toString().replace(/\/$/,"");;
        this.serverurls.login=new URL(json.serverurls.login).toString().replace(/\/$/,"");;
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
    user=new Specialuser(user);
    const info=getBulkInfo();
    info.users[user.uid]=user;
    info.currentuser=user.uid;
    localStorage.setItem("userinfos",JSON.stringify(info));
    return user;
}
const instancein=document.getElementById("instancein")  as HTMLInputElement;
let timeout;
let instanceinfo;
async function getapiurls(str:string):Promise<{api:string,cdn:string,gateway:string,wellknown:string}|false>{
    if(str[str.length-1]!=="/"){
        str+="/"
    }
    let api:string;
    try{
        const info=await fetch(`${str}/.well-known/spacebar`).then((x) => x.json());
        api=info.api;
    }catch{
        return false
    }
    const url = new URL(api);
    try{

        const info=await fetch(`${api}${url.pathname.includes("api") ? "" : "api"}/policies/instance/domains`).then((x) => x.json());
        return {
            api: info.apiEndpoint,
            gateway: info.gateway,
            cdn: info.cdn,
            wellknown: str,
        };
    }catch{
        return false;
    }

}
async function checkInstance(e:string){
    const verify=document.getElementById("verify");
    try{
        verify.textContent="Checking Instance";
        const instanceinfo=await setInstance((instancein as HTMLInputElement).value);
        localStorage.setItem("instanceinfo",JSON.stringify(instanceinfo));
        verify.textContent="Instance is all good"
        if(checkInstance["alt"]){checkInstance["alt"]();}
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
        (instancein as HTMLInputElement).value=JSON.parse(localStorage.getItem("instanceinfo")).wellknown
    }else{
        checkInstance("https://spacebar.chat/");
    }

}

async function login(username:string, password:string, captcha:string){
    if(captcha===""){
        captcha=undefined;
    }
    const options={
        method: "POST",
        body:JSON.stringify({
            "login": username,
            "password": password,
            "undelete":false,
            "captcha_key":captcha
        }),
        headers: {
            "Content-type": "application/json; charset=UTF-8",
        }}
    try{
        const info=JSON.parse(localStorage.getItem("instanceinfo"));
        const api=info.login+(info.login.startsWith("/")?"/":"");
        return await fetch(api+'auth/login',options).then(response=>response.json())
        .then((response) => {
            console.log(response,response.message)
            if("Invalid Form Body"===response.message){
                return response.errors.login._errors[0].message;
                console.log("test")
            }
            //this.serverurls||!this.email||!this.token
            console.log(response);

            if(response.captcha_sitekey){

                const capt=document.getElementById("h-captcha");
                if(!capt.children.length){
                    const capty=document.createElement("div");
                    capty.classList.add("h-captcha");

                    capty.setAttribute("data-sitekey", response.captcha_sitekey);
                    const script=document.createElement("script");
                    script.src="https://js.hcaptcha.com/1/api.js";
                    capt.append(script);
                    capt.append(capty);
                }else{
                    eval("hcaptcha.reset()");
                }
                return;
            }else{
                console.log(response);
                if(response.ticket){
                    let onetimecode="";
                    new Dialog(["vdiv",["title","2FA code:"],["textbox","","",function(){onetimecode=this.value}],["button","","Submit",function(){
                        fetch(api+"/auth/mfa/totp",{
                            method:"POST",
                            headers:{
                                "Content-Type": "application/json"
                            },
                            body:JSON.stringify({
                                code:onetimecode,
                                ticket:response.ticket,
                            })
                        }).then(r=>r.json()).then(response=>{
                            if(response.message){
                                alert(response.message)
                            }else{
                                console.warn(response);
                                adduser({serverurls:JSON.parse(localStorage.getItem("instanceinfo")),email:username,token:response.token}).username=username;
                                const redir=new URLSearchParams(window.location.search).get("goback");
                                if(redir){
                                    window.location.href = redir;
                                }else{
                                    window.location.href = '/channels/@me';
                                }
                            }
                        })
                    }]]).show();
                }else{
                    console.warn(response);
                    adduser({serverurls:JSON.parse(localStorage.getItem("instanceinfo")),email:username,token:response.token}).username=username;
                    const redir=new URLSearchParams(window.location.search).get("goback");
                    if(redir){
                        window.location.href = redir;
                    }else{
                        window.location.href = '/channels/@me';
                    }
                    return "";
                }
            }
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
    let h=await login(e.srcElement[1].value,e.srcElement[2].value,e.srcElement[3].value);
    document.getElementById("wrong").textContent=h;
    console.log(h);
}
if(document.getElementById("form")){
document.getElementById("form").addEventListener("submit", check);
}
//this currently does not work, and need to be implemented better at some time.
/*
if ("serviceWorker" in navigator){
    navigator.serviceWorker.register("/service.js", {
    scope: "/",
    }).then((registration) => {
        let serviceWorker:ServiceWorker;
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
                console.log(serviceWorker.state);
            });
        }
    })
}
*/
const switchurl=document.getElementById("switch") as HTMLAreaElement;
if(switchurl){
    switchurl.href+=window.location.search;
    const instance=new URLSearchParams(window.location.search).get("instance");
    console.log(instance);
    if(instance){
        instancein.value=instance;
        checkInstance("");
    }
}
export {checkInstance};
