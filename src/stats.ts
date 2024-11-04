import fs from"node:fs";
import path from"node:path";
import{ getApiUrls }from"./utils.js";
import{ fileURLToPath }from"node:url";
import{ setTimeout, clearTimeout }from"node:timers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface UptimeEntry {
  time: number;
  online: boolean;
}

interface Instance {
  name: string;
  urls?: { api: string };
  url?: string;
  online?: boolean;
  uptime?: {
    daytime: number;
    weektime: number;
    alltime: number;
  };
}

const uptimeObject: Map<string, UptimeEntry[]> = loadUptimeObject();
export{ uptimeObject as uptime };

function loadUptimeObject(): Map<string, UptimeEntry[]>{
	const filePath = process.env.JANK_UPTIME_JSON_PATH||path.join(__dirname, "..", "uptime.json");
	if(fs.existsSync(filePath)){
		try{
			const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
			return new Map(Object.entries(data));
		}catch(error){
			console.error("Error reading uptime.json:", error);
			return new Map();
		}
	}
	return new Map();
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

function saveUptimeObject(): void{
	if(saveTimeout){
		clearTimeout(saveTimeout);
	}
	saveTimeout = setTimeout(()=>{
		const data = Object.fromEntries(uptimeObject);
		fs.writeFile(
			process.env.JANK_UPTIME_JSON_PATH||path.join(__dirname, "..", "uptime.json"),
			JSON.stringify(data),
			error=>{
				if(error){
					console.error("Error saving uptime.json:", error);
				}
			}
		);
	}, 5000); // Batch updates every 5 seconds
}

function removeUndefinedKey(): void{
	if(uptimeObject.has("undefined")){
		uptimeObject.delete("undefined");
		saveUptimeObject();
	}
}

removeUndefinedKey();

export async function observe(instances: Instance[]): Promise<void>{
	const activeInstances = new Set<string>();
	const instancePromises = instances.map(instance=>resolveInstance(instance, activeInstances)
	);
	await Promise.allSettled(instancePromises);
	updateInactiveInstances(activeInstances);
}

async function resolveInstance(
	instance: Instance,
	activeInstances: Set<string>
): Promise<void>{
	try{
		calcStats(instance);
		const api = await getApiUrl(instance);
		if(!api){
			handleUnresolvedApi(instance);
			return;
		}
		activeInstances.add(instance.name);
		await checkHealth(instance, api);
		scheduleHealthCheck(instance, api);
	}catch(error){
		console.error("Error resolving instance:", error);
	}
}

async function getApiUrl(instance: Instance): Promise<string | null>{
	if(instance.urls){
		return instance.urls.api;
	}
	if(instance.url){
		const urls = await getApiUrls(instance.url);
		return urls ? urls.api : null;
	}
	return null;
}

function handleUnresolvedApi(instance: Instance): void{
	setStatus(instance, false);
	console.warn(`${instance.name} does not resolve api URL`, instance);
	setTimeout(()=>resolveInstance(instance, new Set()), 1000 * 60 * 30);
}

function scheduleHealthCheck(instance: Instance, api: string): void{
	const checkInterval = 1000 * 60 * 30;
	const initialDelay = Math.random() * 1000 * 60 * 10;
	setTimeout(()=>{
		checkHealth(instance, api);
		setInterval(()=>checkHealth(instance, api), checkInterval);
	}, initialDelay);
}

async function checkHealth(
	instance: Instance,
	api: string,
	tries = 0
): Promise<void>{
	try{
		const response = await fetch(`${api}/ping`, { method: "HEAD" });
		console.log(`Checking health for ${instance.name}: ${response.status}`);
		if(response.ok || tries > 3){
			setStatus(instance, response.ok);
		}else{
			retryHealthCheck(instance, api, tries);
		}
	}catch(error){
		console.error(`Error checking health for ${instance.name}:`, error);
		if(tries > 3){
			setStatus(instance, false);
		}else{
			retryHealthCheck(instance, api, tries);
		}
	}
}

function retryHealthCheck(
	instance: Instance,
	api: string,
	tries: number
): void{
	setTimeout(()=>checkHealth(instance, api, tries + 1), 30000);
}

function updateInactiveInstances(activeInstances: Set<string>): void{
	for(const key of uptimeObject.keys()){
		if(!activeInstances.has(key)){
			setStatus(key, false);
		}
	}
}

function calcStats(instance: Instance): void{
	const obj = uptimeObject.get(instance.name);
	if(!obj)return;

	const now = Date.now();
	const day = now - 1000 * 60 * 60 * 24;
	const week = now - 1000 * 60 * 60 * 24 * 7;

	let totalTimePassed = 0;
	let alltime = 0;
	let daytime = 0;
	let weektime = 0;
	let online = false;

	for(let i = 0; i < obj.length; i++){
		const entry = obj[i];
		online = entry.online;
		const stamp = entry.time;
		const nextStamp = obj[i + 1]?.time || now;
		const timePassed = nextStamp - stamp;

		totalTimePassed += timePassed;
		alltime += Number(online) * timePassed;

		if(stamp + timePassed > week){
			const weekTimePassed = Math.min(timePassed, nextStamp - week);
			weektime += Number(online) * weekTimePassed;

			if(stamp + timePassed > day){
				const dayTimePassed = Math.min(weekTimePassed, nextStamp - day);
				daytime += Number(online) * dayTimePassed;
			}
		}
	}

	instance.online = online;
	instance.uptime = calculateUptimeStats(
		totalTimePassed,
		alltime,
		daytime,
		weektime,
		online
	);
}

function calculateUptimeStats(
	totalTimePassed: number,
	alltime: number,
	daytime: number,
	weektime: number,
	online: boolean
): { daytime: number; weektime: number; alltime: number }{
	const dayInMs = 1000 * 60 * 60 * 24;
	const weekInMs = dayInMs * 7;

	alltime /= totalTimePassed;

	if(totalTimePassed > dayInMs){
		daytime = daytime || (online ? dayInMs : 0);
		daytime /= dayInMs;

		if(totalTimePassed > weekInMs){
			weektime = weektime || (online ? weekInMs : 0);
			weektime /= weekInMs;
		}else{
			weektime = alltime;
		}
	}else{
		weektime = alltime;
		daytime = alltime;
	}

	return{ daytime, weektime, alltime };
}

function setStatus(instance: string | Instance, status: boolean): void{
	const name = typeof instance === "string" ? instance : instance.name;
	let obj = uptimeObject.get(name);

	if(!obj){
		obj = [];
		uptimeObject.set(name, obj);
	}

	const lastEntry = obj.at(-1);
	if(!lastEntry || lastEntry.online !== status){
		obj.push({ time: Date.now(), online: status });
		saveUptimeObject();

		if(typeof instance !== "string"){
			calcStats(instance);
		}
	}
}
