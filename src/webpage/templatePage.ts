import {I18n} from "./i18n.js";
import type {templateSkim} from "./jsontypes.js";
import {getapiurls} from "./utils/utils.js";
import {getBulkUsers, type Specialuser} from "./utils/utils.js";

(async () => {
	const users = getBulkUsers();
	const well = new URLSearchParams(window.location.search).get("instance");
	const joinable: Specialuser[] = [];

	for (const key in users.users) {
		if (Object.prototype.hasOwnProperty.call(users.users, key)) {
			const user: Specialuser = users.users[key];
			if (well && user.serverurls.wellknown.includes(well)) {
				joinable.push(user);
			}
			console.log(user);
		}
	}

	let urls: {api: string; cdn: string} | undefined;

	if (!joinable.length && well) {
		const out = await getapiurls(well);
		if (out) {
			urls = out;
			for (const key in users.users) {
				if (Object.prototype.hasOwnProperty.call(users.users, key)) {
					const user: Specialuser = users.users[key];
					if (user.serverurls.api.includes(out.api)) {
						joinable.push(user);
					}
					console.log(user);
				}
			}
		} else {
			throw new Error("Someone needs to handle the case where the servers don't exist");
		}
	} else {
		urls = joinable[0].serverurls;
	}
	await I18n.done;
	if (!joinable.length) {
		document.getElementById("usetemplate")!.textContent = I18n.htmlPages.noAccount();
	}

	const code = window.location.pathname.split("/")[2];

	fetch(`${urls?.api}/guilds/templates/${code}`, {
		method: "GET",
		headers: {
			Authorization: joinable[0].token,
		},
	})
		.then((response) => response.json())
		.then((json) => {
			const template = json as templateSkim;
			document.getElementById("templatename")!.textContent = I18n.useTemplate(template.name);
			document.getElementById("templatedescription")!.textContent = template.description;
		});

	function showAccounts(): void {
		const table = document.createElement("dialog");
		for (const user of joinable) {
			console.log(user.pfpsrc);

			const userinfo = document.createElement("div");
			userinfo.classList.add("flexltr", "switchtable");

			const pfp = document.createElement("img");
			pfp.src = user.pfpsrc;
			pfp.classList.add("pfp");
			userinfo.append(pfp);

			const userDiv = document.createElement("div");
			userDiv.classList.add("userinfo");
			userDiv.textContent = user.username;
			userDiv.append(document.createElement("br"));

			const span = document.createElement("span");
			span.textContent = user.serverurls.wellknown.replace("https://", "").replace("http://", "");
			span.classList.add("serverURL");
			userDiv.append(span);

			userinfo.append(userDiv);
			table.append(userinfo);

			userinfo.addEventListener("click", () => {
				const search = new URLSearchParams();
				search.set("templateID", code);
				sessionStorage.setItem("currentuser", user.uid);
				window.location.assign(`/channels/@me?${search}`);
			});
		}

		if (!joinable.length) {
			const l = new URLSearchParams("?");
			l.set("goback", window.location.href);
			l.set("instance", well!);
			window.location.href = `/login?${l.toString()}`;
		}

		table.classList.add("flexttb", "accountSwitcher");
		console.log(table);
		document.body.append(table);
	}

	document.getElementById("usetemplate")?.addEventListener("click", showAccounts);
	document.getElementById("usetemplate")!.textContent = I18n.useTemplateButton();
})();
