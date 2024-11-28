import { I18n } from "./i18n.js";
import { Dialog, FormError } from "./settings.js";

const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const iOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

let instances:
| {
name: string;
description?: string;
descriptionLong?: string;
image?: string;
url?: string;
display?: boolean;
online?: boolean;
uptime: { alltime: number; daytime: number; weektime: number };
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
const instancefetch=fetch("/instances.json")
	.then(res=>res.json())
	.then(
		(json: {
			name: string;
			description?: string;
			descriptionLong?: string;
			image?: string;
			url?: string;
			display?: boolean;
			online?: boolean;
			uptime: { alltime: number; daytime: number; weektime: number };
			urls: {
				wellknown: string;
				api: string;
				cdn: string;
				gateway: string;
				login?: string;
			}
		}[]
		)=>{
			instances = json;
			if(datalist){
				console.warn(json);
				if(instancein && instancein.value === ""){
					instancein.value = json[0].name;
				}
				for(const instance of json){
					if(instance.display === false){
						continue;
					}
					const option = document.createElement("option");
					option.disabled = !instance.online;
					option.value = instance.name;
					if(instance.url){
						stringURLMap.set(option.value, instance.url);
						if(instance.urls){
							stringURLsMap.set(instance.url, instance.urls);
						}
					}else if(instance.urls){
						stringURLsMap.set(option.value, instance.urls);
					}else{
						option.disabled = true;
					}
					if(instance.description){
						option.label = instance.description;
					}else{
						option.label = instance.name;
					}
					datalist.append(option);
				}
				checkInstance("");
			}
		}
	);
setTheme();
await I18n.done
function setTheme(){
	let name = localStorage.getItem("theme");
	if(!name){
		localStorage.setItem("theme", "Dark");
		name = "Dark";
	}
	document.body.className = name + "-theme";
}


(async ()=>{
	await I18n.done
	const instanceField=document.getElementById("instanceField");
	const emailField= document.getElementById("emailField");
	const pwField= document.getElementById("pwField");
	const loginButton=document.getElementById("loginButton");
	const noAccount=document.getElementById("switch")
	if(instanceField&&emailField&&pwField&&loginButton&&noAccount){
		instanceField.textContent=I18n.getTranslation("htmlPages.instanceField");
		emailField.textContent=I18n.getTranslation("htmlPages.emailField");
		pwField.textContent=I18n.getTranslation("htmlPages.pwField");
		loginButton.textContent=I18n.getTranslation("htmlPages.loginButton");
		noAccount.textContent=I18n.getTranslation("htmlPages.noAccount");
	}
})()

function getBulkUsers(){
	const json = getBulkInfo();
	for(const thing in json.users){
		json.users[thing] = new Specialuser(json.users[thing]);
	}
	return json;
}
function trimswitcher(){
	const json = getBulkInfo();
	const map = new Map();
	for(const thing in json.users){
		const user = json.users[thing];
		let wellknown = user.serverurls.wellknown;
		if(wellknown.at(-1) !== "/"){
			wellknown += "/";
		}
		wellknown =(user.id||user.email)+"@"+wellknown;
		if(map.has(wellknown)){
			const otheruser = map.get(wellknown);
			if(otheruser[1].serverurls.wellknown.at(-1) === "/"){
				delete json.users[otheruser[0]];
				map.set(wellknown, [thing, user]);
			}else{
				delete json.users[thing];
			}
		}else{
			map.set(wellknown, [thing, user]);
		}
	}
	for(const thing in json.users){
		if(thing.at(-1) === "/"){
			const user = json.users[thing];
			delete json.users[thing];
			json.users[thing.slice(0, -1)] = user;
		}
	}
	localStorage.setItem("userinfos", JSON.stringify(json));
	console.log(json);
}

function getBulkInfo(){
	return JSON.parse(localStorage.getItem("userinfos") as string);
}
function setDefaults(){
	let userinfos = getBulkInfo();
	if(!userinfos){
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
			})
		);
		userinfos = getBulkInfo();
	}
	if(userinfos.users === undefined){
		userinfos.users = {};
	}
	if(userinfos.accent_color === undefined){
		userinfos.accent_color = "#3096f7";
	}
	document.documentElement.style.setProperty(
		"--accent-color",
		userinfos.accent_color
	);
	if(userinfos.preferences === undefined){
		userinfos.preferences = {
			theme: "Dark",
			notifications: false,
			notisound: "three",
		};
	}
	if(userinfos.preferences && userinfos.preferences.notisound === undefined){
		console.warn("uhoh")
		userinfos.preferences.notisound = "three";
	}
	localStorage.setItem("userinfos", JSON.stringify(userinfos));
}
setDefaults();
class Specialuser{
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
	constructor(json: any){
		if(json instanceof Specialuser){
			console.error("specialuser can't construct from another specialuser");
		}
		this.serverurls = json.serverurls;
		let apistring = new URL(json.serverurls.api).toString();
		apistring = apistring.replace(/\/(v\d+\/?)?$/, "") + "/v9";
		this.serverurls.api = apistring;
		this.serverurls.cdn = new URL(json.serverurls.cdn)
			.toString()
			.replace(/\/$/, "");
		this.serverurls.gateway = new URL(json.serverurls.gateway)
			.toString()
			.replace(/\/$/, "");
		this.serverurls.wellknown = new URL(json.serverurls.wellknown)
			.toString()
			.replace(/\/$/, "");
		this.serverurls.login = new URL(json.serverurls.login)
			.toString()
			.replace(/\/$/, "");
		this.email = json.email;
		this.token = json.token;
		this.loggedin = json.loggedin;
		this.json = json;
		this.json.localuserStore ??= {};
		if(!this.serverurls || !this.email || !this.token){
			console.error(
				"There are fundamentally missing pieces of info missing from this user"
			);
		}
	}
	set pfpsrc(e){
		this.json.pfpsrc = e;
		this.updateLocal();
	}
	get pfpsrc(){
		return this.json.pfpsrc;
	}
	set username(e){
		this.json.username = e;
		this.updateLocal();
	}
	get username(){
		return this.json.username;
	}
	set localuserStore(e){
		this.json.localuserStore = e;
		this.updateLocal();
	}
	get localuserStore(){
		return this.json.localuserStore;
	}
	set id(e){
		this.json.id = e;
		this.updateLocal();
	}
	get id(){
		return this.json.id;
	}
	get uid(){
		return this.email + this.serverurls.wellknown;
	}
	toJSON(){
		return this.json;
	}
	updateLocal(){
		const info = getBulkInfo();
		info.users[this.uid] = this.toJSON();
		localStorage.setItem("userinfos", JSON.stringify(info));
	}
}
function adduser(user: typeof Specialuser.prototype.json){
	user = new Specialuser(user);
	const info = getBulkInfo();
	info.users[user.uid] = user;
	info.currentuser = user.uid;
	localStorage.setItem("userinfos", JSON.stringify(info));
	return user;
}
const instancein = document.getElementById("instancein") as HTMLInputElement;
let timeout: ReturnType<typeof setTimeout> | string | number | undefined | null = null;
// let instanceinfo;
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
async function getapiurls(str: string): Promise<
	{
	api: string;
	cdn: string;
	gateway: string;
	wellknown: string;
	login: string;
	}
	| false
	>{
	function appendApi(str:string){
		return str.includes("api")?"" : (str.endsWith("/")? "api" : "/api");
	}
	if(!URL.canParse(str)){
		const val = stringURLMap.get(str);
		if(stringURLMap.size===0){
			await new Promise<void>(res=>{
				setInterval(()=>{
					if(stringURLMap.size!==0){
						res();
					}
				},100);
			});
		}
		if(val){
			str = val;
		}else{
			const val = stringURLsMap.get(str);
			if(val){
				const responce = await fetch(
					val.api + (val.api.endsWith("/") ? "" : "/") + "ping"
				);
				if(responce.ok){
					if(val.login){
						return val as {
							wellknown: string;
							api: string;
							cdn: string;
							gateway: string;
							login: string;
						};
					}else{
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
	if(str.at(-1) !== "/"){
		str += "/";
	}
	let api: string;
	try{
		const info = await fetch(`${str}.well-known/spacebar`).then(x=>x.json()
		);
		api = info.api;
	}catch{
		api=str;
	}
	if(!URL.canParse(api)){
		return false;
	}
	const url = new URL(api);
	try{
		const info = await fetch(
			`${api}${
				url.pathname.includes("api") ? "" : "api"
			}/policies/instance/domains`
		).then(x=>x.json());
		const apiurl = new URL(info.apiEndpoint);
		return{
			api: info.apiEndpoint+appendApi(apiurl.pathname),
			gateway: info.gateway,
			cdn: info.cdn,
			wellknown: str,
			login: info.apiEndpoint+appendApi(apiurl.pathname),
		};
	}catch{
		const val = stringURLsMap.get(str);
		if(val){
			const responce = await fetch(
				val.api + (val.api.endsWith("/") ? "" : "/") + "ping"
			);
			if(responce.ok){
				if(val.login){
					return val as {
						wellknown: string;
						api: string;
						cdn: string;
						gateway: string;
						login: string;
					};
				}else{
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
async function checkInstance(instance?: string){
	await instancefetch;
	const verify = document.getElementById("verify");
	try{
		verify!.textContent = I18n.getTranslation("login.checking");
		const instanceValue = instance || (instancein as HTMLInputElement).value;
		const instanceinfo = (await getapiurls(instanceValue)) as {
			wellknown: string;
			api: string;
			cdn: string;
			gateway: string;
			login: string;
			value: string;
		};
		if(instanceinfo){
			instanceinfo.value = instanceValue;
			localStorage.setItem("instanceinfo", JSON.stringify(instanceinfo));
			verify!.textContent = I18n.getTranslation("login.allGood");
			// @ts-ignore
			if(checkInstance.alt){
			// @ts-ignore
				checkInstance.alt();
			}
			setTimeout((_: any)=>{
				console.log(verify!.textContent);
			verify!.textContent = "";
			}, 3000);
		}else{
			verify!.textContent = I18n.getTranslation("login.invalid");
		}
	}catch{
		console.log("catch");
		verify!.textContent = I18n.getTranslation("login.invalid");
	}
}

if(instancein){
	console.log(instancein);
	instancein.addEventListener("keydown", ()=>{
		const verify = document.getElementById("verify");
	verify!.textContent = I18n.getTranslation("login.waiting");
	if(timeout !== null && typeof timeout !== "string"){
		clearTimeout(timeout);
	}
	timeout = setTimeout(()=>checkInstance(), 1000);
	});
	if(localStorage.getItem("instanceinfo")){
		const json = JSON.parse(localStorage.getItem("instanceinfo")!);
		if(json.value){
			(instancein as HTMLInputElement).value = json.value;
		}else{
			(instancein as HTMLInputElement).value = json.wellknown;
		}
	}else{
		checkInstance("https://spacebar.chat/");
	}
}

async function login(username: string, password: string, captcha: string){
	if(captcha === ""){
		captcha = "";
	}
	const options = {
		method: "POST",
		body: JSON.stringify({
			login: username,
			password,
			undelete: false,
			captcha_key: captcha,
		}),
		headers: {
			"Content-type": "application/json; charset=UTF-8",
		},
	};
	try{
		const info = JSON.parse(localStorage.getItem("instanceinfo")!);
		const api = info.login + (info.login.startsWith("/") ? "/" : "");
		return await fetch(api + "/auth/login", options)
			.then(response=>response.json())
			.then(response=>{
				console.log(response, response.message);
				if(response.message === "Invalid Form Body"){
					return response.errors.login._errors[0].message;
					console.log("test");
				}
				//this.serverurls||!this.email||!this.token
				console.log(response);

				if(response.captcha_sitekey){
					const capt = document.getElementById("h-captcha");
					if(capt!.children.length){
						eval("hcaptcha.reset()");
					}else{
						const capty = document.createElement("div");
						capty.classList.add("h-captcha");

						capty.setAttribute("data-sitekey", response.captcha_sitekey);
						const script = document.createElement("script");
						script.src = "https://js.hcaptcha.com/1/api.js";
						capt!.append(script);
						capt!.append(capty);
					}
				}else{
					console.log(response);
					if(response.ticket){
						const better=new Dialog("");
						const form=better.options.addForm("",(res:any)=>{
							if(res.message){
								throw new FormError(ti,res.message);
							}else{
								console.warn(res);
								if(!res.token)return;
								adduser({
									serverurls: JSON.parse(localStorage.getItem("instanceinfo") as string),
									email: username,
									token: res.token,
								}).username = username;
								const redir = new URLSearchParams(
									window.location.search
								).get("goback");
								if(redir){
									window.location.href = redir;
								}else{
									window.location.href = "/channels/@me";
								}
							}
						},{
							fetchURL:api + "/auth/mfa/totp",
							method:"POST",
							headers:{
								"Content-Type": "application/json",
							}
						});
						form.addTitle(I18n.getTranslation("2faCode"));
						const ti=form.addTextInput("","code");
						better.show()
					}else{
						console.warn(response);
						if(!response.token)return;
						adduser({
							serverurls: JSON.parse(localStorage.getItem("instanceinfo")!),
							email: username,
							token: response.token,
						}).username = username;
						const redir = new URLSearchParams(window.location.search).get(
							"goback"
						);
						if(redir){
							window.location.href = redir;
						}else{
							window.location.href = "/channels/@me";
						}
						return"";
					}
				}
			});
	}catch(error){
		console.error("Error:", error);
	}
}

async function check(e: SubmitEvent){
	e.preventDefault();
	const target = e.target as HTMLFormElement;
	const h = await login(
		(target[1] as HTMLInputElement).value,
		(target[2] as HTMLInputElement).value,
		(target[3] as HTMLInputElement).value
	);
	const wrongElement = document.getElementById("wrong");
	if(wrongElement){
		wrongElement.textContent = h;
	}
	console.log(h);
}
if(document.getElementById("form")){
	const form = document.getElementById("form");
	if(form){
		form.addEventListener("submit", (e: SubmitEvent)=>check(e));
	}
}
//this currently does not work, and need to be implemented better at some time.
if(!localStorage.getItem("SWMode")){
	localStorage.setItem("SWMode","true");
}
class SW{
	static worker:undefined|ServiceWorker;
	static setMode(mode:"false"|"offlineOnly"|"true"){
		localStorage.setItem("SWMode",mode);
		if(this.worker){
			this.worker.postMessage({data:mode,code:"setMode"});
		}
	}
	static checkUpdate(){
		if(this.worker){
			this.worker.postMessage({code:"CheckUpdate"});
		}
	}
	static forceClear(){
		if(this.worker){
			this.worker.postMessage({code:"ForceClear"});
		}
	}
}
export {SW};
if ("serviceWorker" in navigator){
	navigator.serviceWorker.register("/service.js", {
	scope: "/",
	}).then((registration) => {
		let serviceWorker:ServiceWorker|undefined;
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
		SW.worker=serviceWorker;
		SW.setMode(localStorage.getItem("SWMode") as "false"|"offlineOnly"|"true");
		if (serviceWorker) {
			console.log(serviceWorker.state);
			serviceWorker.addEventListener("statechange", (_) => {
				console.log(serviceWorker.state);
			});
		}
	})
}

const switchurl = document.getElementById("switch") as HTMLAreaElement;
if(switchurl){
	switchurl.href += window.location.search;
	const instance = new URLSearchParams(window.location.search).get("instance");
	console.log(instance);
	if(instance){
		instancein.value = instance;
		checkInstance("");
	}
}
export{ checkInstance };
trimswitcher();
export{
	mobile,
	iOS,
	getBulkUsers,
	getBulkInfo,
	setTheme,
	Specialuser,
	getapiurls,
	adduser,
};


export function getInstances(){
	return instances;
}


