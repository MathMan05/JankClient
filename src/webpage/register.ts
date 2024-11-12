import { I18n } from "./i18n.js";
import{ checkInstance, adduser }from"./login.js";
import { MarkDown } from "./markdown.js";
await I18n.done
const registerElement = document.getElementById("register");
if(registerElement){
	registerElement.addEventListener("submit", registertry);
}
(async ()=>{
	await I18n.done;
	const userField=document.getElementById("userField");
	const pw2Field=document.getElementById("pw2Field");
	const dobField=document.getElementById("dobField");
	const createAccount=document.getElementById("createAccount");
	const alreadyHave=document.getElementById("alreadyHave");
	if(userField&&pw2Field&&alreadyHave&&createAccount&&dobField){
		userField.textContent=I18n.getTranslation("htmlPages.userField")
		pw2Field.textContent=I18n.getTranslation("htmlPages.pw2Field")
		dobField.textContent=I18n.getTranslation("htmlPages.dobField")
		createAccount.textContent=I18n.getTranslation("htmlPages.createAccount")
		alreadyHave.textContent=I18n.getTranslation("htmlPages.alreadyHave")
	}
})()
async function registertry(e: Event){
	e.preventDefault();
	const elements = (e.target as HTMLFormElement)
		.elements as HTMLFormControlsCollection;
	const email = (elements[1] as HTMLInputElement).value;
	const username = (elements[2] as HTMLInputElement).value;
	const password = (elements[3] as HTMLInputElement).value;
	const confirmPassword = (elements[4] as HTMLInputElement).value;
	const dateofbirth = (elements[5] as HTMLInputElement).value;
	const consent = (elements[6] as HTMLInputElement).checked;
	const captchaKey = (elements[7] as HTMLInputElement)?.value;

	if(password !== confirmPassword){
		(document.getElementById("wrong") as HTMLElement).textContent = I18n.getTranslation("localuser.PasswordsNoMatch");
		return;
	}

	const instanceInfo = JSON.parse(localStorage.getItem("instanceinfo") ?? "{}");
	const apiurl = new URL(instanceInfo.api);

	try{
		const response = await fetch(apiurl + "/auth/register", {
			body: JSON.stringify({
				date_of_birth: dateofbirth,
				email,
				username,
				password,
				consent,
				captcha_key: captchaKey,
			}),
			headers: {
				"content-type": "application/json",
			},
			method: "POST",
		});

		const data = await response.json();

		if(data.captcha_sitekey){
			const capt = document.getElementById("h-captcha");
			if(capt && !capt.children.length){
				const capty = document.createElement("div");
				capty.classList.add("h-captcha");
				capty.setAttribute("data-sitekey", data.captcha_sitekey);
				const script = document.createElement("script");
				script.src = "https://js.hcaptcha.com/1/api.js";
				capt.append(script);
				capt.append(capty);
			}else{
				eval("hcaptcha.reset()");
			}
			return;
		}

		if(!data.token){
			handleErrors(data.errors, elements);
		}else{
			adduser({
				serverurls: instanceInfo,
				email,
				token: data.token,
			}).username = username;
			localStorage.setItem("token", data.token);
			const redir = new URLSearchParams(window.location.search).get("goback");
			window.location.href = redir ? redir : "/channels/@me";
		}
	}catch(error){
		console.error("Registration failed:", error);
	}
}

function handleErrors(errors: any, elements: HTMLFormControlsCollection){
	if(errors.consent){
		showError(elements[6] as HTMLElement, errors.consent._errors[0].message);
	}else if(errors.password){
		showError(
elements[3] as HTMLElement,
I18n.getTranslation("register.passwordError",errors.password._errors[0].message)
		);
	}else if(errors.username){
		showError(
elements[2] as HTMLElement,
I18n.getTranslation("register.usernameError",errors.username._errors[0].message)
		);
	}else if(errors.email){
		showError(
elements[1] as HTMLElement,
I18n.getTranslation("register.emailError",errors.email._errors[0].message)
		);
	}else if(errors.date_of_birth){
		showError(
elements[5] as HTMLElement,
I18n.getTranslation("register.DOBError",errors.date_of_birth._errors[0].message)
		);
	}else{
		(document.getElementById("wrong") as HTMLElement).textContent =
errors[Object.keys(errors)[0]]._errors[0].message;
	}
}

function showError(element: HTMLElement, message: string){
	const parent = element.parentElement!;
	let errorElement = parent.getElementsByClassName(
		"suberror"
	)[0] as HTMLElement;
	if(!errorElement){
		const div = document.createElement("div");
		div.classList.add("suberror", "suberrora");
		parent.append(div);
		errorElement = div;
	}else{
		errorElement.classList.remove("suberror");
		setTimeout(()=>{
			errorElement.classList.add("suberror");
		}, 100);
	}
	errorElement.textContent = message;
}

async function tosLogic(){
	const instanceInfo = JSON.parse(localStorage.getItem("instanceinfo") ?? "{}");
	const apiurl = new URL(instanceInfo.api);
	const urlstr=apiurl.toString();
	const response = await fetch(urlstr + (urlstr.endsWith("/") ? "" : "/") + "ping");
	const data = await response.json();
	const tosPage = data.instance.tosPage;

	if(tosPage){
		const box=document.getElementById("TOSbox");
		if(!box) return;
		box.innerHTML ="";
		box.append(new MarkDown(I18n.getTranslation("register.agreeTOS",tosPage)).makeHTML());
	}else{
		document.getElementById("TOSbox")!.textContent =I18n.getTranslation("register.noTOS");
	}
	console.log(tosPage);
}

tosLogic();

(checkInstance as any).alt = tosLogic;
