import {I18n} from "./i18n.js";
import {Dialog, FormError} from "./settings.js";
await I18n.done;
const info = JSON.parse(localStorage.getItem("instanceinfo") as string);

function makeMenu2(email: string | undefined) {
	const d2 = new Dialog(I18n.login.recovery());
	const headers = {
		"Content-Type": "application/json",
	};
	const opt = d2.float.options.addForm(
		"",
		async (obj) => {
			if ("token" in obj && typeof obj.token === "string") {
				window.location.href = `/login${window.location.search}`;
			}
		},
		{
			fetchURL: `${info.api}/auth/reset`,
			method: "POST",
			headers,
		},
	);
	if (email !== undefined) {
		opt.addTextInput(I18n.login.pasteInfo(), "token");
	}
	opt.addTextInput(I18n.login.newPassword(), "password", {password: true});
	const p2 = opt.addTextInput(I18n.login.enterPAgain(), "password2", {password: true});
	opt.addPreprocessor((e) => {
		const obj = e as unknown as {password: string; password2?: string; token?: string};
		const token = obj.token || window.location.href;
		if (URL.canParse(token)) {
			obj.token = new URLSearchParams(token.split("#")[1]).get("token") as string;
		}

		if (obj.password !== obj.password2) {
			throw new FormError(p2, I18n.localuser.PasswordsNoMatch());
		}
		obj.password2 = undefined;
	});
	d2.show(false);
}
function makeMenu1() {
	const d = new Dialog(I18n.login.recovery());
	let area: HTMLElement | undefined = undefined;
	const opt = d.float.options.addForm(
		"",
		(e) => {
			if (Object.keys(e).length === 0) {
				d.hide();
				makeMenu2(email.value);
			} else if ("captcha_sitekey" in e && typeof e.captcha_sitekey === "string") {
				if (area) {
					eval("hcaptcha.reset()");
				} else {
					area = document.createElement("div");
					opt.addHTMLArea(area);
					const capty = document.createElement("div");
					capty.classList.add("h-captcha");

					capty.setAttribute("data-sitekey", e.captcha_sitekey);
					const script = document.createElement("script");
					script.src = "https://js.hcaptcha.com/1/api.js";
					area.append(script);
					area.append(capty);
				}
			}
		},
		{
			fetchURL: `${info.api}/auth/forgot`,
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
		},
	);
	const email = opt.addTextInput(I18n.htmlPages.emailField(), "login");
	opt.addPreprocessor((e) => {
		if (area) {
			try {
				//@ts-expect-error
				e.captcha_key = area.children[1].children[1].value;
			} catch (e) {
				console.error(e);
			}
		}
	});
	d.show(false);
}
if (
	window.location.href.split("#").length === 2 &&
	new URLSearchParams(window.location.href.split("#")[1]).has("token")
) {
	makeMenu2();
} else {
	makeMenu1();
}
