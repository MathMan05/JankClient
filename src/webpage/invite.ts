import{ getBulkUsers, Specialuser, getapiurls }from"./login.js";

(async ()=>{
	const users = getBulkUsers();
	const well = new URLSearchParams(window.location.search).get("instance");
	const joinable: Specialuser[] = [];

	for(const key in users.users){
		if(Object.prototype.hasOwnProperty.call(users.users, key)){
			const user: Specialuser = users.users[key];
			if(well && user.serverurls.wellknown.includes(well)){
				joinable.push(user);
			}
			console.log(user);
		}
	}

	let urls: { api: string; cdn: string } | undefined;

	if(!joinable.length && well){
		const out = await getapiurls(well);
		if(out){
			urls = out;
			for(const key in users.users){
				if(Object.prototype.hasOwnProperty.call(users.users, key)){
					const user: Specialuser = users.users[key];
					if(user.serverurls.api.includes(out.api)){
						joinable.push(user);
					}
					console.log(user);
				}
			}
		}else{
			throw new Error(
				"Someone needs to handle the case where the servers don't exist"
			);
		}
	}else{
		urls = joinable[0].serverurls;
	}

	if(!joinable.length){
document.getElementById("AcceptInvite")!.textContent =
"Create an account to accept the invite";
	}

	const code = window.location.pathname.split("/")[2];
	let guildinfo: any;

	fetch(`${urls!.api}/invites/${code}`, {
		method: "GET",
	})
		.then(response=>response.json())
		.then(json=>{
			const guildjson = json.guild;
			guildinfo = guildjson;
document.getElementById("invitename")!.textContent = guildjson.name;
document.getElementById(
	"invitedescription"
)!.textContent = `${json.inviter.username} invited you to join ${guildjson.name}`;
if(guildjson.icon){
	const img = document.createElement("img");
	img.src = `${urls!.cdn}/icons/${guildjson.id}/${guildjson.icon}.png`;
	img.classList.add("inviteGuild");
document.getElementById("inviteimg")!.append(img);
}else{
	const txt = guildjson.name
		.replace(/'s /g, " ")
		.replace(/\w+/g, (word: any[])=>word[0])
		.replace(/\s/g, "");
	const div = document.createElement("div");
	div.textContent = txt;
	div.classList.add("inviteGuild");
document.getElementById("inviteimg")!.append(div);
}
		});

	function showAccounts(): void{
		const table = document.createElement("dialog");
		for(const user of joinable){
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
			span.textContent = user.serverurls.wellknown
				.replace("https://", "")
				.replace("http://", "");
			span.classList.add("serverURL");
			userDiv.append(span);

			userinfo.append(userDiv);
			table.append(userinfo);

			userinfo.addEventListener("click", ()=>{
				console.log(user);
				fetch(`${urls!.api}/invites/${code}`, {
					method: "POST",
					headers: {
						Authorization: user.token,
					},
				}).then(()=>{
					users.currentuser = user.uid;
					localStorage.setItem("userinfos", JSON.stringify(users));
					window.location.href = "/channels/" + guildinfo.id;
				});
			});
		}

		const td = document.createElement("div");
		td.classList.add("switchtable");
		td.textContent = "Login or create an account ⇌";
		td.addEventListener("click", ()=>{
			const l = new URLSearchParams("?");
			l.set("goback", window.location.href);
			l.set("instance", well!);
			window.location.href = "/login?" + l.toString();
		});

		if(!joinable.length){
			const l = new URLSearchParams("?");
			l.set("goback", window.location.href);
			l.set("instance", well!);
			window.location.href = "/login?" + l.toString();
		}

		table.append(td);
		table.classList.add("flexttb","accountSwitcher");
		console.log(table);
		document.body.append(table);
	}

document
	.getElementById("AcceptInvite")!
	.addEventListener("click", showAccounts);
})();
