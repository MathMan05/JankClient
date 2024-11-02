#!/usr/bin/env node

import compression from"compression";
import express, { Request, Response }from"express";
import fs from"node:fs/promises";
import path from"node:path";
import{ observe, uptime }from"./stats.js";
import{ getApiUrls, inviteResponse }from"./utils.js";
import{ fileURLToPath }from"node:url";
import {readFileSync} from "fs";
import process from"node:process";

const devmode = (process.env.NODE_ENV || "development") === "development";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Instance {
  name: string;
  [key: string]: any;
}

const app = express();

type instace={
	name:string,
    description?:string,
    descriptionLong?:string,
    image?:string,
    url?:string,
    language:string,
    country:string,
    display:boolean,
    urls?:{
        wellknown:string,
        api:string,
        cdn:string,
        gateway:string,
        login?:string
    },
    contactInfo?:{
        discord?:string,
        github?:string,
        email?:string,
        spacebar?:string,
        matrix?:string,
        mastodon?:string
    }
}
const instances=JSON.parse(readFileSync(process.env.JANK_INSTANCES_PATH||(__dirname+"/webpage/instances.json")).toString()) as instace[];

const instanceNames = new Map<string, Instance>();

for(const instance of instances){
	instanceNames.set(instance.name, instance);
}

app.use(compression());

async function updateInstances(): Promise<void>{
	try{
		const response = await fetch("https://raw.githubusercontent.com/spacebarchat/spacebarchat/master/instances/instances.json");
		const json = (await response.json()) as Instance[];
		for(const instance of json){
			if(instanceNames.has(instance.name)){
				const existingInstance = instanceNames.get(instance.name);
				if(existingInstance){
					for(const key of Object.keys(instance)){
						if(!existingInstance[key]){
							existingInstance[key] = instance[key];
						}
					}
				}
			}else{
				instances.push(instance as any);
			}
		}
		observe(instances);
	}catch(error){
		console.error("Error updating instances:", error);
	}
}

updateInstances();

app.use("/getupdates", async (_req: Request, res: Response)=>{
	try{
		const stats = await fs.stat(path.join(__dirname, "webpage"));
		res.send(stats.mtimeMs.toString());
	}catch(error){
		console.error("Error getting updates:", error);
		res.status(500).send("Error getting updates");
	}
});

app.use("/services/oembed", (req: Request, res: Response)=>{
	inviteResponse(req, res);
});

app.use("/uptime", (req: Request, res: Response)=>{
	const instanceUptime = uptime.get(req.query.name as string);
	res.send(instanceUptime);
});

app.use("/", async (req: Request, res: Response)=>{
	const scheme = req.secure ? "https" : "http";
	const host = `${scheme}://${req.get("Host")}`;
	const ref = host + req.originalUrl;

	if(host && ref){
		const link = `${host}/services/oembed?url=${encodeURIComponent(ref)}`;
		res.set(
			"Link",
			`<${link}>; rel="alternate"; type="application/json+oembed"; title="Jank Client oEmbed format"`
		);
	}

	if(req.path === "/"){
		res.sendFile(path.join(__dirname, "webpage", "home.html"));
		return;
	}

	if(req.path.startsWith("/instances.json")){
		res.json(instances);
		return;
	}

	if(req.path.startsWith("/invite/")){
		res.sendFile(path.join(__dirname, "webpage", "invite.html"));
		return;
	}
	const filePath = path.join(__dirname, "webpage", req.path);
	try{
		await fs.access(filePath);
		if(devmode){
			const filePath2 = path.join(__dirname, "../src/webpage", req.path);
			try{
				await fs.access(filePath2);
				res.sendFile(filePath2);
				return;
			}catch{}
		}
		res.sendFile(filePath);
	}catch{
		try{
			await fs.access(`${filePath}.html`);
			if(devmode){
				const filePath2 = path.join(__dirname, "../src/webpage", req.path);
				try{
					await fs.access(filePath2 + ".html");
					res.sendFile(filePath2 + ".html");
					return;
				}catch{}
			}
			res.sendFile(`${filePath}.html`);
		}catch{
			if(req.path.startsWith("/src/webpage")){
				const filePath2 = path.join(__dirname, "..", req.path);
				try{
					await fs.access(filePath2);
					res.sendFile(filePath2);
					return;
				}catch{}
			}
			res.sendFile(path.join(__dirname, "webpage", "index.html"));
		}
	}
});

app.set('trust proxy', (ip:string) => ip.startsWith("127."));

const PORT = process.env.PORT || Number(process.argv[2]) || 8080;
app.listen(PORT, ()=>{
	console.log(`Server running on port ${PORT}`);
});

export{ getApiUrls };
