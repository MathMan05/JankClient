import { Dialog } from "./dialog.js";
const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
function setTheme() {
    let name = localStorage.getItem("theme");
    if (!name) {
        localStorage.setItem("theme", "Dark");
        name = "Dark";
    }
    document.body.className = name + "-theme";
}
let instances;
setTheme();
function getBulkUsers() {
    const json = getBulkInfo();
    for (const thing in json.users) {
        json.users[thing] = new Specialuser(json.users[thing]);
    }
    return json;
}
function trimswitcher() {
    const json = getBulkInfo();
    const map = new Map();
    for (const thing in json.users) {
        const user = json.users[thing];
        let wellknown = user.serverurls.wellknown;
        if (wellknown.at(-1) !== "/") {
            wellknown += "/";
        }
        wellknown += user.username;
        if (map.has(wellknown)) {
            const otheruser = map.get(wellknown);
            if (otheruser[1].serverurls.wellknown.at(-1) === "/") {
                delete json.users[otheruser[0]];
                map.set(wellknown, [thing, user]);
            }
            else {
                delete json.users[thing];
            }
        }
        else {
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
function getBulkInfo() {
    return JSON.parse(localStorage.getItem("userinfos"));
}
function setDefaults() {
    let userinfos = getBulkInfo();
    if (!userinfos) {
        localStorage.setItem("userinfos", JSON.stringify({
            currentuser: null,
            users: {},
            preferences: {
                theme: "Dark",
                notifications: false,
                notisound: "three",
            },
        }));
        userinfos = getBulkInfo();
    }
    if (userinfos.users === undefined) {
        userinfos.users = {};
    }
    if (userinfos.accent_color === undefined) {
        userinfos.accent_color = "#242443";
    }
    document.documentElement.style.setProperty("--accent-color", userinfos.accent_color);
    if (userinfos.preferences === undefined) {
        userinfos.preferences = {
            theme: "Dark",
            notifications: false,
            notisound: "three",
        };
    }
    if (userinfos.preferences && (userinfos.preferences.notisound === undefined)) {
        userinfos.preferences.notisound = "three";
    }
    localStorage.setItem("userinfos", JSON.stringify(userinfos));
}
setDefaults();
class Specialuser {
    serverurls;
    email;
    token;
    loggedin;
    json;
    constructor(json) {
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
    get localuserStore() {
        return this.json.localuserStore;
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
function adduser(user) {
    user = new Specialuser(user);
    const info = getBulkInfo();
    info.users[user.uid] = user;
    info.currentuser = user.uid;
    localStorage.setItem("userinfos", JSON.stringify(info));
    return user;
}
const instancein = document.getElementById("instancein");
let timeout;
let instanceinfo;
const stringURLMap = new Map();
const stringURLsMap = new Map();
async function getapiurls(str) {
    if (!URL.canParse(str)) {
        const val = stringURLMap.get(str);
        if (val) {
            str = val;
        }
        else {
            const val = stringURLsMap.get(str);
            if (val) {
                const responce = await fetch(val.api + val.api.endsWith("/") ? "" : "/" + "ping");
                if (responce.ok) {
                    if (val.login) {
                        return val;
                    }
                    else {
                        val.login = val.api;
                        return val;
                    }
                }
            }
        }
    }
    if (str.at(-1) !== "/") {
        str += "/";
    }
    let api;
    try {
        const info = await fetch(`${str}/.well-known/spacebar`).then(x => x.json());
        api = info.api;
    }
    catch {
        return false;
    }
    const url = new URL(api);
    try {
        const info = await fetch(`${api}${url.pathname.includes("api") ? "" : "api"}/policies/instance/domains`).then(x => x.json());
        return {
            api: info.apiEndpoint,
            gateway: info.gateway,
            cdn: info.cdn,
            wellknown: str,
            login: url.toString()
        };
    }
    catch {
        const val = stringURLsMap.get(str);
        if (val) {
            const responce = await fetch(val.api + val.api.endsWith("/") ? "" : "/" + "ping");
            if (responce.ok) {
                if (val.login) {
                    return val;
                }
                else {
                    val.login = val.api;
                    return val;
                }
            }
        }
        return false;
    }
}
async function checkInstance(e) {
    const verify = document.getElementById("verify");
    try {
        verify.textContent = "Checking Instance";
        const instanceinfo = await getapiurls(instancein.value);
        if (instanceinfo) {
            instanceinfo.value = instancein.value;
            localStorage.setItem("instanceinfo", JSON.stringify(instanceinfo));
            verify.textContent = "Instance is all good";
            if (checkInstance.alt) {
                checkInstance.alt();
            }
            setTimeout(_ => {
                console.log(verify.textContent);
                verify.textContent = "";
            }, 3000);
        }
        else {
            verify.textContent = "Invalid Instance, try again";
        }
    }
    catch {
        console.log("catch");
        verify.textContent = "Invalid Instance, try again";
    }
}
if (instancein) {
    console.log(instancein);
    instancein.addEventListener("keydown", e => {
        const verify = document.getElementById("verify");
        verify.textContent = "Waiting to check Instance";
        clearTimeout(timeout);
        timeout = setTimeout(checkInstance, 1000);
    });
    if (localStorage.getItem("instanceinfo")) {
        const json = JSON.parse(localStorage.getItem("instanceinfo"));
        if (json.value) {
            instancein.value = json.value;
        }
        else {
            instancein.value = json.wellknown;
        }
    }
    else {
        checkInstance("https://spacebar.chat/");
    }
}
async function login(username, password, captcha) {
    if (captcha === "") {
        captcha = undefined;
    }
    const options = {
        method: "POST",
        body: JSON.stringify({
            login: username,
            password,
            undelete: false,
            captcha_key: captcha
        }),
        headers: {
            "Content-type": "application/json; charset=UTF-8",
        }
    };
    try {
        const info = JSON.parse(localStorage.getItem("instanceinfo"));
        const api = info.login + (info.login.startsWith("/") ? "/" : "");
        return await fetch(api + "/auth/login", options).then(response => response.json())
            .then(response => {
            console.log(response, response.message);
            if (response.message === "Invalid Form Body") {
                return response.errors.login._errors[0].message;
                console.log("test");
            }
            //this.serverurls||!this.email||!this.token
            console.log(response);
            if (response.captcha_sitekey) {
                const capt = document.getElementById("h-captcha");
                if (!capt.children.length) {
                    const capty = document.createElement("div");
                    capty.classList.add("h-captcha");
                    capty.setAttribute("data-sitekey", response.captcha_sitekey);
                    const script = document.createElement("script");
                    script.src = "https://js.hcaptcha.com/1/api.js";
                    capt.append(script);
                    capt.append(capty);
                }
                else {
                    eval("hcaptcha.reset()");
                }
            }
            else {
                console.log(response);
                if (response.ticket) {
                    let onetimecode = "";
                    new Dialog(["vdiv", ["title", "2FA code:"], ["textbox", "", "", function () {
                                onetimecode = this.value;
                            }], ["button", "", "Submit", function () {
                                fetch(api + "/auth/mfa/totp", {
                                    method: "POST",
                                    headers: {
                                        "Content-Type": "application/json"
                                    },
                                    body: JSON.stringify({
                                        code: onetimecode,
                                        ticket: response.ticket,
                                    })
                                }).then(r => r.json()).then(response => {
                                    if (response.message) {
                                        alert(response.message);
                                    }
                                    else {
                                        console.warn(response);
                                        if (!response.token)
                                            return;
                                        adduser({ serverurls: JSON.parse(localStorage.getItem("instanceinfo")), email: username, token: response.token }).username = username;
                                        const redir = new URLSearchParams(window.location.search).get("goback");
                                        if (redir) {
                                            window.location.href = redir;
                                        }
                                        else {
                                            window.location.href = "/channels/@me";
                                        }
                                    }
                                });
                            }]]).show();
                }
                else {
                    console.warn(response);
                    if (!response.token)
                        return;
                    adduser({ serverurls: JSON.parse(localStorage.getItem("instanceinfo")), email: username, token: response.token }).username = username;
                    const redir = new URLSearchParams(window.location.search).get("goback");
                    if (redir) {
                        window.location.href = redir;
                    }
                    else {
                        window.location.href = "/channels/@me";
                    }
                    return "";
                }
            }
        });
    }
    catch (error) {
        console.error("Error:", error);
    }
}
async function check(e) {
    e.preventDefault();
    const h = await login(e.srcElement[1].value, e.srcElement[2].value, e.srcElement[3].value);
    document.getElementById("wrong").textContent = h;
    console.log(h);
}
if (document.getElementById("form")) {
    document.getElementById("form").addEventListener("submit", check);
}
//this currently does not work, and need to be implemented better at some time.
/*
if ("serviceWorker" in navigator){
    navigator.serviceWorker.register("/service.js", {
    scope: "/",
    }).then((registration) => {
        let serviceWorker:ServiceWorker;
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
        if (serviceWorker) {
            console.log(serviceWorker.state);
            serviceWorker.addEventListener("statechange", (e) => {
                console.log(serviceWorker.state);
            });
        }
    })
}
*/
const switchurl = document.getElementById("switch");
if (switchurl) {
    switchurl.href += window.location.search;
    const instance = new URLSearchParams(window.location.search).get("instance");
    console.log(instance);
    if (instance) {
        instancein.value = instance;
        checkInstance("");
    }
}
export { checkInstance };
trimswitcher();
export { mobile, getBulkUsers, getBulkInfo, setTheme, Specialuser, getapiurls, adduser };
const datalist = document.getElementById("instances");
console.warn(datalist);
export function getInstances() {
    return instances;
}
fetch("/instances.json").then(_ => _.json()).then((json) => {
    instances = json;
    if (datalist) {
        console.warn(json);
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
            }
            else if (instance.urls) {
                stringURLsMap.set(option.value, instance.urls);
            }
            else {
                option.disabled = true;
            }
            if (instance.description) {
                option.label = instance.description;
            }
            else {
                option.label = instance.name;
            }
            datalist.append(option);
        }
        checkInstance("");
    }
});
