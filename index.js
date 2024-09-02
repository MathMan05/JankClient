#! /usr/bin/env node
const compression = require("compression");

const express = require("express");
const fs = require("node:fs");
const app = express();
const instances=require("./webpage/instances.json");
const stats=require("./stats.js");
const instancenames=new Map();
for(const instance of instances){
	instancenames.set(instance.name,instance);
}
app.use(compression());
fetch("https://raw.githubusercontent.com/spacebarchat/spacebarchat/master/instances/instances.json").then(_=>_.json()).then(json=>{
	for(const instance of json){
		if(!instancenames.has(instance.name)){
			instances.push(instance);
		}else{
			const ofinst=instancenames.get(instance.name);
			for(const key of Object.keys(instance)){
				if(!ofinst[key]){
					ofinst[key]=instance[key];
				}
			}
		}
	}
	stats.observe(instances);
});

app.use("/getupdates",(req, res)=>{
	const out=fs.statSync(`${__dirname}/webpage`);
	res.send(out.mtimeMs+"");
});
const debugging=true;//Do not turn this off, the service worker is all kinds of jank as is, it'll really mess your day up if you disable this
function isembed(str){
	return str.includes("discord")||str.includes("Spacebar");
}
async function getapiurls(str){
	if(str.at(-1)!=="/"){
		str+="/";
	}
	let api;
	try{
		const info=await fetch(`${str}/.well-known/spacebar`).then(x=>x.json());
		api=info.api;
	}catch{
		return false;
	}
	const url = new URL(api);
	try{
		const info=await fetch(`${api}${url.pathname.includes("api") ? "" : "api"}/policies/instance/domains`).then(x=>x.json());
		return{
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
	let url;
	if(URL.canParse(req.query.url)){
		url=new URL(req.query.url);
	}else{
		const scheme = req.secure ? "https" : "http";
		const host=`${scheme}://${req.get("Host")}`;
		url=new URL(host);
	}
	try{
		if(url.pathname.startsWith("invite")){
			throw-1;
		}
		const code=url.pathname.split("/")[2];
		let title="";
		let description="";
		let thumbnail="";
		const urls=await getapiurls(url.searchParams.get("instance"));
		await fetch(`${urls.api}/invites/${code}`,{
			method: "GET"
		}).then(_=>_.json()).then(json=>{
			title=json.guild.name;
			if(json.inviter){
				description=json.inviter.username+" Has invited you to "+json.guild.name+(json.guild.description?json.guild.description+"\n":"");
			}else{
				description="you've been invited to "+json.guild.name+(json.guild.description?json.guild.description+"\n":"");
			}
			if(json.guild.icon){
				thumbnail=`${urls.cdn}/icons/${json.guild.id}/${json.guild.icon}.png`;
			}
		});
		const json={
			type: "link",
			version: "1.0",
			title,
			thumbnail,
			description,
		};
		res.send(JSON.stringify(json));
	}catch(e){
		console.error(e);
		const json={
			type: "link",
			version: "1.0",
			title: "Jank Client",
			thumbnail: "/logo.webp",
			description: "A spacebar client that has DMs, replying and more",
			url: url.toString()
		};
		res.send(JSON.stringify(json));
	}
}
/*
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
    */

app.use("/services/oembed", (req, res)=>{
	inviteres(req, res);
});
app.use("/uptime",(req,res)=>{
	console.log(req.query.name);
	const uptime=stats.uptime[req.query.name];
	console.log(req.query.name,uptime,stats.uptime);
	res.send(uptime);
});
app.use("/", async (req, res)=>{
	const scheme = req.secure ? "https" : "http";
	const host=`${scheme}://${req.get("Host")}`;
	const ref=host+req.originalUrl;
	if(host&&ref){
		const link=`${host}/services/oembed?url=${encodeURIComponent(ref)}`;
		res.set("Link",`<${link}>; rel="alternate"; type="application/json+oembed"; title="Jank Client oEmbed format"`);
	}else{
		console.log(req);
	}
	if(req.path==="/"){
		res.sendFile("./webpage/home.html", {root: __dirname});
		return;
	}
	if(debugging&&req.path.startsWith("/service.js")){
		res.send("dud");
		return;
	}
	if(req.path.startsWith("/instances.json")){
		res.send(JSON.stringify(instances));
		return;
	}
	if(req.path.startsWith("/invite/")){
		res.sendFile("./webpage/invite.html", {root: __dirname});
		return;
	}
	if(fs.existsSync(`${__dirname}/webpage${req.path}`)){
		res.sendFile(`./webpage${req.path}`, {root: __dirname});
	}else if(req.path.endsWith(".js") && fs.existsSync(`${__dirname}/.dist${req.path}`)){
		const dir=`./.dist${req.path}`;
		res.sendFile(dir, {root: __dirname});
	}else if(fs.existsSync(`${__dirname}/webpage${req.path}.html`)){
		res.sendFile(`./webpage${req.path}.html`, {root: __dirname});
	}else{
		res.sendFile("./webpage/index.html", {root: __dirname});
	}
});


const PORT = process.env.PORT || Number(process.argv[1]) || 8080;
app.listen(PORT, ()=>{});
console.log("this ran :P");

exports.getapiurls=getapiurls;
