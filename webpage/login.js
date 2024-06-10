function getCookie(name) {
    return localStorage.getItem(name);
}
function setTheme(){
    const name=localStorage.getItem("theme");
    if(!name){
        document.body.className="Dark-theme";
        localStorage.setItem("theme","Dark");
    }
    document.body.className=name+"-theme";
}
setTheme();

const instancein=document.getElementById("instancein");
let timeout=0;
async function checkInstance(e){
    try{
        verify.innerText="Checking Instance"
        instanceinfo=await setInstance(instancein.value)
        localStorage.setItem("instanceinfo",JSON.stringify(instanceinfo));
        verify.innerText="Instance is all good"
        if(checkInstance.alt){checkInstance.alt();}
        setTimeout(_=>{
            console.log(verify.innerText)
            verify.innerText="";
        },3000);

    }catch(e){
        console.log("catch")
        verify.innerText="Invalid Instance, try again"
    }
}
if(instancein){
    console.log(instancein)
    instancein.addEventListener("keydown",e=>{
        const verify=document.getElementById("verify");
        verify.innerText="Waiting to check Instance"
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
            localStorage.setItem("token",response.token);
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

function gettoken(){
    let temp=getCookie("token");
    temp??=undefined;
    if(temp===undefined){
        window.location.href = '/login.html';
    }
    return temp;
}

async function check(e){

    e.preventDefault();
    let h=await login(e.srcElement[1].value,e.srcElement[2].value);
    document.getElementById("wrong").innerText=h;
    console.log(h);
}
if(document.getElementById("form")){
document.getElementById("form").addEventListener("submit", check);
}
