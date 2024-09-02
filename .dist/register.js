import { checkInstance, adduser } from "./login.js";
if (document.getElementById("register")) {
    document.getElementById("register").addEventListener("submit", registertry);
}
async function registertry(e) {
    e.preventDefault();
    const elements = e.srcElement;
    const email = elements[1].value;
    const username = elements[2].value;
    if (elements[3].value !== elements[4].value) {
        document.getElementById("wrong").textContent = "Passwords don't match";
        return;
    }
    const password = elements[3].value;
    const dateofbirth = elements[5].value;
    const apiurl = new URL(JSON.parse(localStorage.getItem("instanceinfo")).api);
    await fetch(apiurl + "/auth/register", {
        body: JSON.stringify({
            date_of_birth: dateofbirth,
            email,
            username,
            password,
            consent: elements[6].checked,
            captcha_key: elements[7]?.value
        }),
        headers: {
            "content-type": "application/json"
        },
        method: "POST"
    }).then(e => {
        e.json().then(e => {
            if (e.captcha_sitekey) {
                const capt = document.getElementById("h-captcha");
                if (!capt.children.length) {
                    const capty = document.createElement("div");
                    capty.classList.add("h-captcha");
                    capty.setAttribute("data-sitekey", e.captcha_sitekey);
                    const script = document.createElement("script");
                    script.src = "https://js.hcaptcha.com/1/api.js";
                    capt.append(script);
                    capt.append(capty);
                }
                else {
                    eval("hcaptcha.reset()");
                }
                return;
            }
            if (!e.token) {
                console.log(e);
                if (e.errors.consent) {
                    error(elements[6], e.errors.consent._errors[0].message);
                }
                else if (e.errors.password) {
                    error(elements[3], "Password: " + e.errors.password._errors[0].message);
                }
                else if (e.errors.username) {
                    error(elements[2], "Username: " + e.errors.username._errors[0].message);
                }
                else if (e.errors.email) {
                    error(elements[1], "Email: " + e.errors.email._errors[0].message);
                }
                else if (e.errors.date_of_birth) {
                    error(elements[5], "Date of Birth: " + e.errors.date_of_birth._errors[0].message);
                }
                else {
                    document.getElementById("wrong").textContent = e.errors[Object.keys(e.errors)[0]]._errors[0].message;
                }
            }
            else {
                adduser({ serverurls: JSON.parse(localStorage.getItem("instanceinfo")), email, token: e.token }).username = username;
                localStorage.setItem("token", e.token);
                const redir = new URLSearchParams(window.location.search).get("goback");
                if (redir) {
                    window.location.href = redir;
                }
                else {
                    window.location.href = "/channels/@me";
                }
            }
        });
    });
    //document.getElementById("wrong").textContent=h;
    // console.log(h);
}
function error(e, message) {
    const p = e.parentElement;
    let element = p.getElementsByClassName("suberror")[0];
    if (!element) {
        const div = document.createElement("div");
        div.classList.add("suberror", "suberrora");
        p.append(div);
        element = div;
    }
    else {
        element.classList.remove("suberror");
        setTimeout(_ => {
            element.classList.add("suberror");
        }, 100);
    }
    element.textContent = message;
}
let TOSa = document.getElementById("TOSa");
async function tosLogic() {
    const apiurl = new URL(JSON.parse(localStorage.getItem("instanceinfo")).api);
    const tosPage = (await (await fetch(apiurl.toString() + "/ping")).json()).instance.tosPage;
    if (tosPage) {
        document.getElementById("TOSbox").innerHTML = "I agree to the <a href=\"\" id=\"TOSa\">Terms of Service</a>:";
        TOSa = document.getElementById("TOSa");
        TOSa.href = tosPage;
    }
    else {
        document.getElementById("TOSbox").textContent = "This instance has no Terms of Service, accept ToS anyways:";
        TOSa = null;
    }
    console.log(tosPage);
}
tosLogic();
checkInstance["alt"] = tosLogic;
