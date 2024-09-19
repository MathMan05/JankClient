import fs from "node:fs";
import path from "path";
import fetch from "node-fetch";
import { getApiUrls } from "./utils.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface UptimeEntry {
time: number;
online: boolean;
}

interface UptimeObject {
[key: string]: UptimeEntry[];
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

let uptimeObject: UptimeObject = loadUptimeObject();
export { uptimeObject as uptime };

function loadUptimeObject(): UptimeObject {
const filePath = path.join(__dirname, "..", "uptime.json");
if (fs.existsSync(filePath)) {
try {
return JSON.parse(fs.readFileSync(filePath, "utf8"));
} catch (error) {
console.error("Error reading uptime.json:", error);
return {};
}
}
return {};
}

function saveUptimeObject(): void {
fs.writeFile(
`${__dirname}/uptime.json`,
JSON.stringify(uptimeObject),
(error) => {
if (error) {
console.error("Error saving uptime.json:", error);
}
}
);
}

function removeUndefinedKey(): void {
if (uptimeObject.undefined) {
delete uptimeObject.undefined;
saveUptimeObject();
}
}

removeUndefinedKey();

export async function observe(instances: Instance[]): Promise<void> {
	const activeInstances = new Set<string>();
		const instancePromises = instances.map((instance) =>
		resolveInstance(instance, activeInstances)
		);
		await Promise.allSettled(instancePromises);
		updateInactiveInstances(activeInstances);
		}

		async function resolveInstance(
		instance: Instance,
		activeInstances: Set<string>
			): Promise<void> {
				try {
				calcStats(instance);
				const api = await getApiUrl(instance);
				if (!api) {
				handleUnresolvedApi(instance);
				return;
				}
				activeInstances.add(instance.name);
				scheduleHealthCheck(instance, api);
				} catch (error) {
				console.error("Error resolving instance:", error);
				}
				}

				async function getApiUrl(instance: Instance): Promise<string | null> {
					if (instance.urls) {
					return instance.urls.api;
					}
					if (instance.url) {
					const urls = await getApiUrls(instance.url);
					return urls ? urls.api : null;
					}
					return null;
					}

					function handleUnresolvedApi(instance: Instance): void {
					setStatus(instance, false);
					console.warn(`${instance.name} does not resolve api URL`, instance);
					setTimeout(() => resolveInstance(instance, new Set()), 1000 * 60 * 30);
					}

					function scheduleHealthCheck(instance: Instance, api: string): void {
					const checkInterval = 1000 * 60 * 30;
					const initialDelay = Math.random() * 1000 * 60 * 10;
					setTimeout(() => {
					checkHealth(instance, api);
					setInterval(() => checkHealth(instance, api), checkInterval);
					}, initialDelay);
					}

					async function checkHealth(
					instance: Instance,
					api: string,
					tries = 0
					): Promise<void> {
						try {
						const response = await fetch(`${api}ping`, { method: "HEAD" });
						if (response.ok || tries > 3) {
						setStatus(instance, response.ok);
						} else {
						retryHealthCheck(instance, api, tries);
						}
						} catch (error) {
						console.error("Error checking health:", error);
						if (tries > 3) {
						setStatus(instance, false);
						} else {
						retryHealthCheck(instance, api, tries);
						}
						}
						}

						function retryHealthCheck(
						instance: Instance,
						api: string,
						tries: number
						): void {
						setTimeout(() => checkHealth(instance, api, tries + 1), 30000);
						}

						function updateInactiveInstances(activeInstances: Set<string>): void {
							for (const key of Object.keys(uptimeObject)) {
							if (!activeInstances.has(key)) {
							setStatus(key, false);
							}
							}
							}

							function calcStats(instance: Instance): void {
							const obj = uptimeObject[instance.name];
							if (!obj) return;

							const now = Date.now();
							const day = now - 1000 * 60 * 60 * 24;
							const week = now - 1000 * 60 * 60 * 24 * 7;

							let totalTimePassed = 0;
							let alltime = 0;
							let daytime = 0;
							let weektime = 0;
							let online = false;

							for (let i = 0; i < obj.length; i++) {
							const entry = obj[i];
							online = entry.online;
							const stamp = entry.time;
							const nextStamp = obj[i + 1]?.time || now;
							const timePassed = nextStamp - stamp;

							totalTimePassed += timePassed;
							alltime += Number(online) * timePassed;

							if (stamp + timePassed > week) {
							const weekTimePassed = Math.min(timePassed, nextStamp - week);
							weektime += Number(online) * weekTimePassed;

							if (stamp + timePassed > day) {
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
							): { daytime: number; weektime: number; alltime: number } {
							const dayInMs = 1000 * 60 * 60 * 24;
							const weekInMs = dayInMs * 7;

							alltime /= totalTimePassed;

							if (totalTimePassed > dayInMs) {
							daytime = daytime || (online ? dayInMs : 0);
							daytime /= dayInMs;

							if (totalTimePassed > weekInMs) {
							weektime = weektime || (online ? weekInMs : 0);
							weektime /= weekInMs;
							} else {
							weektime = alltime;
							}
							} else {
							weektime = alltime;
							daytime = alltime;
							}

							return { daytime, weektime, alltime };
							}

							function setStatus(instance: string | Instance, status: boolean): void {
							const name = typeof instance === "string" ? instance : instance.name;
							let obj = uptimeObject[name];

							if (!obj) {
							obj = [];
							uptimeObject[name] = obj;
							}

							if (obj.at(-1)?.online !== status) {
							obj.push({ time: Date.now(), online: status });
							saveUptimeObject();
							}

							if (typeof instance !== "string") {
							calcStats(instance);
							}
							}
