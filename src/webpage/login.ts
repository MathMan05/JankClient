import {getBulkInfo, Specialuser} from "./utils/utils.js";
import {I18n} from "./i18n.js";
import {Dialog, FormError} from "./settings.js";
import {checkInstance} from "./utils/utils.js";
function generateRecArea() {
	const recover = document.getElementById("recover");
	if (!recover) return;
	const can = localStorage.getItem("canRecover");
	if (can) {
		const a = document.createElement("a");
		a.textContent = I18n.login.recover();
		a.href = `/reset${window.location.search}`;
		recover.append(a);
	}
}
checkInstance.alt = async (e) => {
	const recover = document.getElementById("recover");
	if (!recover) return;
	recover.innerHTML = "";
	try {
		const json = (await (await fetch(`${e.api}/policies/instance/config`)).json()) as {
			can_recover_account: boolean;
		};
		if (!json || !json.can_recover_account) throw Error("can't recover account");
		localStorage.setItem("canRecover", "true");
		generateRecArea();
	} catch {
		localStorage.removeItem("canRecover");
		generateRecArea();
	}
};
await I18n.done;
generateRecArea();
(async () => {
	await I18n.done;
	const instanceField = document.getElementById("instanceField");
	const emailField = document.getElementById("emailField");
	const pwField = document.getElementById("pwField");
	const loginButton = document.getElementById("loginButton");
	const noAccount = document.getElementById("switch");
	if (instanceField && emailField && pwField && loginButton && noAccount) {
		instanceField.textContent = I18n.getTranslation("htmlPages.instanceField");
		emailField.textContent = I18n.getTranslation("htmlPages.emailField");
		pwField.textContent = I18n.getTranslation("htmlPages.pwField");
		loginButton.textContent = I18n.getTranslation("htmlPages.loginButton");
		noAccount.textContent = I18n.getTranslation("htmlPages.noAccount");
	}
})();

function trimswitcher() {
	const json = getBulkInfo();
	const map = new Map();
	for (const thing in json.users) {
		const user = json.users[thing];
		let wellknown = user.serverurls.wellknown;
		if (wellknown.at(-1) !== "/") {
			wellknown += "/";
		}
		wellknown = `${user.id || user.email}@${wellknown}`;
		if (map.has(wellknown)) {
			const otheruser = map.get(wellknown);
			if (otheruser[1].serverurls.wellknown.at(-1) === "/") {
				delete json.users[otheruser[0]];
				map.set(wellknown, [thing, user]);
			} else {
				delete json.users[thing];
			}
		} else {
			map.set(wellknown, [thing, user]);
		}
	}
	for (const thing in json.users) {
		if (thing.at(-1) === "/") {
			const user = json.users[thing];
			delete json.users[thing];
			json.users[thing.slice(0, -1)] = user;
		}
	}
	localStorage.setItem("userinfos", JSON.stringify(json));
	console.log(json);
}

function adduser(user: typeof Specialuser.prototype.json) {
	user = new Specialuser(user);
	const info = getBulkInfo();
	info.users[user.uid] = user;
	info.currentuser = user.uid;
	sessionStorage.setItem("currentuser", user.uid);
	localStorage.setItem("userinfos", JSON.stringify(info));
	return user;
}
const instancein = document.getElementById("instancein") as HTMLInputElement;
let timeout: ReturnType<typeof setTimeout> | string | number | undefined | null = null;
// let instanceinfo;

const switchurl = document.getElementById("switch") as HTMLAreaElement;
if (switchurl) {
	switchurl.href += window.location.search;
	const instance = new URLSearchParams(window.location.search).get("instance");
	console.log(instance);
	if (instance) {
		instancein.value = instance;
		checkInstance(instance);
	}
}

if (instancein) {
	console.log(instancein);
	instancein.addEventListener("keydown", () => {
		const verify = document.getElementById("verify");
		verify!.textContent = I18n.getTranslation("login.waiting");
		if (timeout !== null && typeof timeout !== "string") {
			clearTimeout(timeout);
		}
		timeout = setTimeout(() => checkInstance((instancein as HTMLInputElement).value), 1000);
	});
	if (
		localStorage.getItem("instanceinfo") &&
		!new URLSearchParams(window.location.search).get("instance")
	) {
		const json = JSON.parse(localStorage.getItem("instanceinfo")!);
		if (json.value) {
			(instancein as HTMLInputElement).value = json.value;
		} else {
			(instancein as HTMLInputElement).value = json.wellknown;
		}
	}
}

async function login(username: string, password: string, captcha: string) {
	if (captcha === "") {
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
	try {
		const info = JSON.parse(localStorage.getItem("instanceinfo")!);
		const api = info.login + (info.login.startsWith("/") ? "/" : "");
		return await fetch(`${api}/auth/login`, options)
			.then((response) => response.json())
			.then((response) => {
				console.log(response, response.message);
				if (response.message === "Invalid Form Body") {
					return response.errors.login._errors[0].message;
					console.log("test");
				}
				//this.serverurls||!this.email||!this.token
				console.log(response);

				if (response.captcha_sitekey) {
					const capt = document.getElementById("h-captcha");
					if (capt?.children.length) {
						eval("hcaptcha.reset()");
					} else {
						const capty = document.createElement("div");
						capty.classList.add("h-captcha");

						capty.setAttribute("data-sitekey", response.captcha_sitekey);
						const script = document.createElement("script");
						script.src = "https://js.hcaptcha.com/1/api.js";
						capt?.append(script);
						capt?.append(capty);
					}
				} else {
					console.log(response);
					if (response.ticket) {
						const better = new Dialog("");
						const form = better.options.addForm(
							"",
							(res: any) => {
								if (res.message) {
									throw new FormError(ti, res.message);
								}
									console.warn(res);
									if (!res.token) return;
									adduser({
										serverurls: JSON.parse(localStorage.getItem("instanceinfo") as string),
										email: username,
										token: res.token,
									}).username = username;
									const redir = new URLSearchParams(window.location.search).get("goback");
									if (redir) {
										window.location.href = redir;
									} else {
										window.location.href = "/channels/@me";
									}
							},
							{
								fetchURL: `${api}/auth/mfa/totp`,
								method: "POST",
								headers: {
									"Content-Type": "application/json",
								},
							},
						);
						form.addTitle(I18n.getTranslation("2faCode"));
						const ti = form.addTextInput("", "code");
						better.show();
					} else {
						console.warn(response);
						if (!response.token) return;
						adduser({
							serverurls: JSON.parse(localStorage.getItem("instanceinfo")!),
							email: username,
							token: response.token,
						}).username = username;
						const redir = new URLSearchParams(window.location.search).get("goback");
						if (redir) {
							window.location.href = redir;
						} else {
							window.location.href = "/channels/@me";
						}
						return "";
					}
				}
			});
	} catch (error) {
		console.error("Error:", error);
	}
}

async function check(e: SubmitEvent) {
	e.preventDefault();
	const target = e.target as HTMLFormElement;
	const h = await login(
		(target[1] as HTMLInputElement).value,
		(target[2] as HTMLInputElement).value,
		(target[3] as HTMLInputElement).value,
	);
	const wrongElement = document.getElementById("wrong");
	if (wrongElement) {
		wrongElement.textContent = h;
	}
	console.log(h);
}
if (document.getElementById("form")) {
	const form = document.getElementById("form");
	if (form) {
		form.addEventListener("submit", (e: SubmitEvent) => check(e));
	}
}
//this currently does not work, and need to be implemented better at some time.
if (!localStorage.getItem("SWMode")) {
	localStorage.setItem("SWMode", "SWOn");
}

trimswitcher();

export {adduser};
