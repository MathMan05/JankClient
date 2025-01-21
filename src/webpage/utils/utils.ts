import {I18n} from "../i18n.js";
setTheme();
export function setTheme() {
	let name = localStorage.getItem("theme");
	if (!name) {
		localStorage.setItem("theme", "Dark");
		name = "Dark";
	}
	document.body.className = name + "-theme";
}
export function getBulkUsers() {
	const json = getBulkInfo();
	for (const thing in json.users) {
		json.users[thing] = new Specialuser(json.users[thing]);
	}
	return json;
}
export function getBulkInfo() {
	return JSON.parse(localStorage.getItem("userinfos") as string);
}
export function setDefaults() {
	let userinfos = getBulkInfo();
	if (!userinfos) {
		localStorage.setItem(
			"userinfos",
			JSON.stringify({
				currentuser: null,
				users: {},
				preferences: {
					theme: "Dark",
					notifications: false,
					notisound: "three",
				},
			}),
		);
		userinfos = getBulkInfo();
	}
	if (userinfos.users === undefined) {
		userinfos.users = {};
	}
	if (userinfos.accent_color === undefined) {
		userinfos.accent_color = "#3096f7";
	}
	document.documentElement.style.setProperty("--accent-color", userinfos.accent_color);
	if (userinfos.preferences === undefined) {
		userinfos.preferences = {
			theme: "Dark",
			notifications: false,
			notisound: "three",
		};
	}
	if (userinfos.preferences && userinfos.preferences.notisound === undefined) {
		console.warn("uhoh");
		userinfos.preferences.notisound = "three";
	}
	localStorage.setItem("userinfos", JSON.stringify(userinfos));
}
setDefaults();
export class Specialuser {
	serverurls: {
		api: string;
		cdn: string;
		gateway: string;
		wellknown: string;
		login: string;
	};
	email: string;
	token: string;
	loggedin;
	json;
	constructor(json: any) {
		if (json instanceof Specialuser) {
			console.error("specialuser can't construct from another specialuser");
		}
		this.serverurls = json.serverurls;
		let apistring = new URL(json.serverurls.api).toString();
		apistring = apistring.replace(/\/(v\d+\/?)?$/, "") + "/v9";
		this.serverurls.api = apistring;
		this.serverurls.cdn = new URL(json.serverurls.cdn).toString().replace(/\/$/, "");
		this.serverurls.gateway = new URL(json.serverurls.gateway).toString().replace(/\/$/, "");
		this.serverurls.wellknown = new URL(json.serverurls.wellknown).toString().replace(/\/$/, "");
		this.serverurls.login = new URL(json.serverurls.login).toString().replace(/\/$/, "");
		this.email = json.email;
		this.token = json.token;
		this.loggedin = json.loggedin;
		this.json = json;
		this.json.localuserStore ??= {};
		if (!this.serverurls || !this.email || !this.token) {
			console.error("There are fundamentally missing pieces of info missing from this user");
		}
	}
	set pfpsrc(e) {
		this.json.pfpsrc = e;
		this.updateLocal();
	}
	get pfpsrc() {
		return this.json.pfpsrc;
	}
	set username(e) {
		this.json.username = e;
		this.updateLocal();
	}
	get username() {
		return this.json.username;
	}
	set localuserStore(e) {
		this.json.localuserStore = e;
		this.updateLocal();
	}
	proxySave(e: Object) {
		return new Proxy(e, {
			set: (target, p, newValue, receiver) => {
				const bool = Reflect.set(target, p, newValue, receiver);
				this.updateLocal();
				return bool;
			},
			get: (target, p, receiver) => {
				const value = Reflect.get(target, p, receiver) as unknown;
				if (value instanceof Object) {
					return this.proxySave(value);
				}
				return value;
			},
		});
	}
	get localuserStore() {
		type jsonParse = {
			[key: string | number]: any;
		};
		return this.proxySave(this.json.localuserStore) as {
			[key: string | number]: jsonParse;
		};
	}
	set id(e) {
		this.json.id = e;
		this.updateLocal();
	}
	get id() {
		return this.json.id;
	}
	get uid() {
		return this.email + this.serverurls.wellknown;
	}
	toJSON() {
		return this.json;
	}
	updateLocal() {
		const info = getBulkInfo();
		info.users[this.uid] = this.toJSON();
		localStorage.setItem("userinfos", JSON.stringify(info));
	}
}
const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const iOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
export {mobile, iOS};
let instances:
	| {
			name: string;
			description?: string;
			descriptionLong?: string;
			image?: string;
			url?: string;
			display?: boolean;
			online?: boolean;
			uptime: {alltime: number; daytime: number; weektime: number};
			urls: {
				wellknown: string;
				api: string;
				cdn: string;
				gateway: string;
				login?: string;
			};
	  }[]
	| null;
const datalist = document.getElementById("instances");
console.warn(datalist);
const instancefetch = fetch("/instances.json")
	.then((res) => res.json())
	.then(
		async (
			json: {
				name: string;
				description?: string;
				descriptionLong?: string;
				image?: string;
				url?: string;
				display?: boolean;
				online?: boolean;
				uptime: {alltime: number; daytime: number; weektime: number};
				urls: {
					wellknown: string;
					api: string;
					cdn: string;
					gateway: string;
					login?: string;
				};
			}[],
		) => {
			await I18n.done;
			instances = json;
			if (datalist) {
				console.warn(json);
				const instancein = document.getElementById("instancein") as HTMLInputElement;
				if (instancein && instancein.value === "") {
					instancein.value = json[0].name;
				}
				for (const instance of json) {
					if (instance.display === false) {
						continue;
					}
					const option = document.createElement("option");
					option.disabled = !instance.online;
					option.value = instance.name;
					if (instance.url) {
						stringURLMap.set(option.value, instance.url);
						if (instance.urls) {
							stringURLsMap.set(instance.url, instance.urls);
						}
					} else if (instance.urls) {
						stringURLsMap.set(option.value, instance.urls);
					} else {
						option.disabled = true;
					}
					if (instance.description) {
						option.label = instance.description;
					} else {
						option.label = instance.name;
					}
					datalist.append(option);
				}
				if (
					json.length !== 0 &&
					!localStorage.getItem("instanceinfo") &&
					!new URLSearchParams(window.location.search).get("instance")
				) {
					checkInstance(json[0].name);
				}
			}
		},
	);
const stringURLMap = new Map<string, string>();

const stringURLsMap = new Map<
	string,
	{
		wellknown: string;
		api: string;
		cdn: string;
		gateway: string;
		login?: string;
	}
>();
/**
 * this fucntion checks if a string is an instance, it'll either return the API urls or false
 */
export async function getapiurls(str: string): Promise<
	| {
			api: string;
			cdn: string;
			gateway: string;
			wellknown: string;
			login: string;
	  }
	| false
> {
	function appendApi(str: string) {
		return str.includes("api") ? "" : str.endsWith("/") ? "api" : "/api";
	}
	if (!URL.canParse(str)) {
		const val = stringURLMap.get(str);
		if (stringURLMap.size === 0) {
			await new Promise<void>((res) => {
				setInterval(() => {
					if (stringURLMap.size !== 0) {
						res();
					}
				}, 100);
			});
		}
		if (val) {
			str = val;
		} else {
			const val = stringURLsMap.get(str);
			if (val) {
				const responce = await fetch(val.api + (val.api.endsWith("/") ? "" : "/") + "ping");
				if (responce.ok) {
					if (val.login) {
						return val as {
							wellknown: string;
							api: string;
							cdn: string;
							gateway: string;
							login: string;
						};
					} else {
						val.login = val.api;
						return val as {
							wellknown: string;
							api: string;
							cdn: string;
							gateway: string;
							login: string;
						};
					}
				}
			}
		}
	}
	if (str.at(-1) !== "/") {
		str += "/";
	}
	let api: string;
	try {
		const info = await fetch(`${str}.well-known/spacebar`).then((x) => x.json());
		api = info.api;
	} catch {
		api = str;
	}
	if (!URL.canParse(api)) {
		return false;
	}
	const url = new URL(api);
	try {
		const info = await fetch(
			`${api}${url.pathname.includes("api") ? "" : "api"}/policies/instance/domains`,
		).then((x) => x.json());
		const apiurl = new URL(info.apiEndpoint);
		return {
			api: info.apiEndpoint + appendApi(apiurl.pathname),
			gateway: info.gateway,
			cdn: info.cdn,
			wellknown: str,
			login: info.apiEndpoint + appendApi(apiurl.pathname),
		};
	} catch {
		const val = stringURLsMap.get(str);
		if (val) {
			const responce = await fetch(val.api + (val.api.endsWith("/") ? "" : "/") + "ping");
			if (responce.ok) {
				if (val.login) {
					return val as {
						wellknown: string;
						api: string;
						cdn: string;
						gateway: string;
						login: string;
					};
				} else {
					val.login = val.api;
					return val as {
						wellknown: string;
						api: string;
						cdn: string;
						gateway: string;
						login: string;
					};
				}
			}
		}
		return false;
	}
}
/**
 *
 * This function takes in a string and checks if the string is a valid instance
 * the string may be a URL or the name of the instance
 * the alt property is something you may fire on success.
 */
const checkInstance = Object.assign(
	async function (instance: string) {
		await instancefetch;
		const verify = document.getElementById("verify");
		const loginButton = (document.getElementById("loginButton") ||
			document.getElementById("createAccount") ||
			document.createElement("button")) as HTMLButtonElement;
		try {
			loginButton.disabled = true;
			verify!.textContent = I18n.getTranslation("login.checking");
			const instanceValue = instance;
			const instanceinfo = (await getapiurls(instanceValue)) as {
				wellknown: string;
				api: string;
				cdn: string;
				gateway: string;
				login: string;
				value: string;
			};
			if (instanceinfo) {
				instanceinfo.value = instanceValue;
				localStorage.setItem("instanceinfo", JSON.stringify(instanceinfo));
				verify!.textContent = I18n.getTranslation("login.allGood");
				loginButton.disabled = false;
				if (checkInstance.alt) {
					checkInstance.alt();
				}
				setTimeout((_: any) => {
					console.log(verify!.textContent);
					verify!.textContent = "";
				}, 3000);
			} else {
				verify!.textContent = I18n.getTranslation("login.invalid");
				loginButton.disabled = true;
			}
		} catch {
			console.log("catch");
			verify!.textContent = I18n.getTranslation("login.invalid");
			loginButton.disabled = true;
		}
	},
	{} as {alt?: Function},
);
export {checkInstance};
export function getInstances() {
	return instances;
}
export class SW {
	static worker: undefined | ServiceWorker;
	static setMode(mode: "false" | "offlineOnly" | "true") {
		localStorage.setItem("SWMode", mode);
		if (this.worker) {
			this.worker.postMessage({data: mode, code: "setMode"});
		}
	}
	static checkUpdate() {
		if (this.worker) {
			this.worker.postMessage({code: "CheckUpdate"});
		}
	}
	static forceClear() {
		if (this.worker) {
			this.worker.postMessage({code: "ForceClear"});
		}
	}
}

if ("serviceWorker" in navigator) {
	navigator.serviceWorker
		.register("/service.js", {
			scope: "/",
		})
		.then((registration) => {
			let serviceWorker: ServiceWorker | undefined;
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
			SW.worker = serviceWorker;
			SW.setMode(localStorage.getItem("SWMode") as "false" | "offlineOnly" | "true");
			if (serviceWorker) {
				console.log(serviceWorker.state);
				serviceWorker.addEventListener("statechange", (_) => {
					console.log(serviceWorker.state);
				});
			}
		});
}
