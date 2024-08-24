#! /usr/bin/env node
const compression = require('compression')

const express = require('express');
const fs = require('fs');
const app = express();
app.use(compression())


app.use("/getupdates",(req, res) => {
    const out=fs.statSync(`${__dirname}/webpage`);
    res.send(out.mtimeMs+"");
});
let debugging=true;//Do not turn this off, the service worker is all kinds of jank as is, it'll really mess your day up if you disable this
function isembed(str){
    return str.includes("discord")||str.includes("Spacebar");
}
async function getapiurls(str){
    if(str[str.length-1]!=="/"){
        str+="/"
    }
    let api;
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

async function inviteres(req,res){
    //console.log(req.rawHeaders);
    try{
        let embed=isembed(req.get("User-Agent"));
        if(!embed){return false};
        const code=req.path.split("/")[2];
        let title="";
        let description="";
        let icon="";
        const urls=await getapiurls(req.query.instance);
        await fetch(`${urls.api}/invites/${code}`,{
            method:"GET"
        }).then(_=>_.json()).then(json=>{
            title=json.guild.name;
            description=json.inviter.username+" Has invited you to "+json.guild.name+(json.guild.description?json.guild.description+"\n":"");
            if(json.guild.icon){
                icon=`${urls.cdn}/icons/${json.guild.id}/${json.guild.icon}.png`;
            }
        });

        function htmlEnc(s) {//https://stackoverflow.com/a/11561642
            return s.replaceAll(/&/g, '&amp;')
            .replaceAll(/</g, '&lt;')
            .replaceAll(/>/g, '&gt;')
            .replaceAll(/'/g, '&#39;')
            .replaceAll(/"/g, '&#34;');
        }
        function strEscape(s){
            return JSON.stringify(s);
        }
        html=
        `<!DOCTYPE html>`+
        `<html lang="en">`+
        `<head>`+
            `<title>${htmlEnc(title)}</title>`+
            `<meta content=${strEscape(title)} property="og:title"/>`+
            `<meta content=${strEscape(description)} property="og:description"/>`+
            `<meta content=${strEscape(icon)} property="og:image"/>`+
        `</head>`+
        `</html>`
    res.type('html');
    res.send(html);
    return true;
    }catch(e){
        console.error(e);
    }
    return false;
}
app.use('/', async (req, res) => {
    if(debugging&&req.path.startsWith("/service.js")){
        res.send("console.log(\"Hi :3\");");
        return;
    }
    if(req.path.startsWith("/invite/")){
        const condition=await inviteres(req,res);
        if(!condition){
            res.sendFile(`./webpage/invite.html`, {root: __dirname});
        }
        return;
    }
    if(fs.existsSync(`${__dirname}/webpage${req.path}`)) {
        res.sendFile(`./webpage${req.path}`, {root: __dirname});
    }else if(req.path.endsWith(".js") && fs.existsSync(`${__dirname}/.dist${req.path}`)){
        const dir=`./.dist${req.path}`;
        res.sendFile(dir, {root: __dirname});
        return;
    }
    else if(fs.existsSync(`${__dirname}/webpage${req.path}.html`)) {
        res.sendFile(`./webpage${req.path}.html`, {root: __dirname});
    }
    else {
        res.sendFile("./webpage/index.html", {root: __dirname});
    }
});


const PORT = process.env.PORT || +process.argv[1] || 8080;
app.listen(PORT, () => {});
console.log("this ran :P");
