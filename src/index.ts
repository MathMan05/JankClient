#!/usr/bin/env node

import compression from "compression";
import express, {Request, Response} from "express";
import fs from "node:fs/promises";
import path from "node:path";
import {observe, uptime} from "./stats.js";
import {getApiUrls, inviteResponse} from "./utils.js";
import {fileURLToPath} from "node:url";
import {readFileSync} from "fs";
import process from "node:process";

const devmode = (process.env.NODE_ENV || "development") === "development";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
type dirtype = Map<string, dirtype | string>;
async function getDirectories(path: string): Promise<dirtype> {
	return new Map(
		await Promise.all(
			(await fs.readdir(path)).map(async function (file): Promise<[string, string | dirtype]> {
				if ((await fs.stat(path + "/" + file)).isDirectory()) {
					return [file, await getDirectories(path + "/" + file)];
				} else {
					return [file, file];
				}
			}),
		),
	);
}
let dirs: dirtype | undefined = undefined;
async function combinePath(path: string, tryAgain = true): Promise<string> {
	if (!dirs) {
		dirs = await getDirectories(__dirname);
	}
	const pathDir = path
		.split("/")
		.reverse()
		.filter((_) => _ !== "");
	function find(arr: string[], search: dirtype | string | undefined): boolean {
		if (search == undefined) return false;
		if (arr.length === 0) {
			return typeof search == "string";
		}
		if (typeof search == "string") {
			return false;
		}
		const thing = arr.pop() as string;
		return find(arr, search.get(thing));
	}
	if (find(pathDir, dirs)) {
		return __dirname + path;
	} else {
		if (!path.includes(".")) {
			const str = await combinePath(path + ".html", false);
			if (str !== __dirname + "/webpage/index.html") {
				return str;
			}
		}
		if (devmode && tryAgain) {
			dirs = await getDirectories(__dirname);
			return combinePath(path, false);
		}
		return __dirname + "/webpage/index.html";
	}
}
interface Instance {
	name: string;
	[key: string]: any;
}

const app = express();

export type instace = {
	name: string;
	description?: string;
	descriptionLong?: string;
	image?: string;
	url?: string;
	language: string;
	country: string;
	display: boolean;
	urls?: {
		wellknown: string;
		api: string;
		cdn: string;
		gateway: string;
		login?: string;
	};
	contactInfo?: {
		discord?: string;
		github?: string;
		email?: string;
		spacebar?: string;
		matrix?: string;
		mastodon?: string;
	};
};
const instances = JSON.parse(
	readFileSync(process.env.JANK_INSTANCES_PATH || __dirname + "/webpage/instances.json").toString(),
) as instace[];

const instanceNames = new Map<string, Instance>();

for (const instance of instances) {
	instanceNames.set(instance.name, instance);
}

app.use(compression());

async function updateInstances(): Promise<void> {
	try {
		const response = await fetch(
			"https://raw.githubusercontent.com/spacebarchat/spacebarchat/master/instances/instances.json",
		);
		const json = (await response.json()) as Instance[];
		for (const instance of json) {
			if (instanceNames.has(instance.name)) {
				const existingInstance = instanceNames.get(instance.name);
				if (existingInstance) {
					for (const key of Object.keys(instance)) {
						if (!(key in existingInstance)) {
							existingInstance[key] = instance[key];
						}
					}
				}
			} else {
				instances.push(instance as any);
			}
		}
		observe(instances);
	} catch (error) {
		console.error("Error updating instances:", error);
	}
}

updateInstances();

app.use("/services/oembed", (req: Request, res: Response) => {
	inviteResponse(req, res, instances);
});

app.use("/uptime", (req: Request, res: Response) => {
	const instanceUptime = uptime.get(req.query.name as string);
	res.send(instanceUptime);
});

app.use("/", async (req: Request, res: Response) => {
	const scheme = req.secure ? "https" : "http";
	const host = `${scheme}://${req.get("Host")}`;
	let ref = host + req.originalUrl;
	if (Object.keys(req.query).length !== 0) {
		const parms = new URLSearchParams();
		for (const key of Object.keys(req.query)) {
			parms.set(key, req.query[key] as string);
		}
		ref + `?${parms}`;
	}
	if (host && ref) {
		const link = `${host}/services/oembed?url=${encodeURIComponent(ref)}`;
		res.set(
			"Link",
			`<${link}>; rel="alternate"; type="application/json+oembed"; title="Jank Client oEmbed format"`,
		);
	}

	if (req.path === "/") {
		res.sendFile(path.join(__dirname, "webpage", "home.html"));
		return;
	}

	if (req.path.startsWith("/instances.json")) {
		res.json(instances);
		return;
	}

	if (req.path.startsWith("/invite/")) {
		res.sendFile(path.join(__dirname, "webpage", "invite.html"));
		return;
	}
	if (req.path.startsWith("/template/")) {
		res.sendFile(path.join(__dirname, "webpage", "template.html"));
		return;
	}
	const filePath = await combinePath("/webpage/" + req.path);
	res.sendFile(filePath);
});

app.set("trust proxy", (ip: string) => ip.startsWith("127."));

const PORT = process.env.PORT || Number(process.argv[2]) || 8080;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});

export {getApiUrls};
