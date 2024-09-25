import{ Request, Response }from"express";

interface ApiUrls {
  api: string;
  gateway: string;
  cdn: string;
  wellknown: string;
}

interface Invite {
  guild: {
    name: string;
    description?: string;
    icon?: string;
    id: string;
  };
  inviter?: {
    username: string;
  };
}

export async function getApiUrls(url: string): Promise<ApiUrls | null>{
	if(!url.endsWith("/")){
		url += "/";
	}
	try{
		const info: ApiUrls = await fetch(`${url}.well-known/spacebar`).then(res=>res.json());
		const api = info.api;
		const apiUrl = new URL(api);
		const policies: any = await fetch(
			`${api}${apiUrl.pathname.includes("api") ? "" : "api"}/policies/instance/domains`
		).then(res=>res.json());
		return{
			api: policies.apiEndpoint,
			gateway: policies.gateway,
			cdn: policies.cdn,
			wellknown: url,
		};
	}catch(error){
		console.error("Error fetching API URLs:", error);
		return null;
	}
}

export async function inviteResponse(req: Request, res: Response): Promise<void>{
	let url: URL;
	try{
		url = new URL(req.query.url as string);
	}catch{
		const scheme = req.secure ? "https" : "http";
		const host = `${scheme}://${req.get("Host")}`;
		url = new URL(host);
	}

	try{
		if(url.pathname.startsWith("invite")){
			throw new Error("Invalid invite URL");
		}

		const code = url.pathname.split("/")[2];
		const instance = url.searchParams.get("instance");
		if(!instance){
			throw new Error("Instance not specified");
		}

		const urls = await getApiUrls(instance);
		if(!urls){
			throw new Error("Failed to get API URLs");
		}

		const invite = await fetch(`${urls.api}/invites/${code}`).then(json=>json.json() as Promise<Invite>);
		const title = invite.guild.name;
		const description = invite.inviter
			? `${invite.inviter.username} has invited you to ${invite.guild.name}${invite.guild.description ? `\n${invite.guild.description}` : ""}`
			: `You've been invited to ${invite.guild.name}${invite.guild.description ? `\n${invite.guild.description}` : ""}`;
		const thumbnail = invite.guild.icon
			? `${urls.cdn}/icons/${invite.guild.id}/${invite.guild.icon}.png`
			: "";

		res.json({
			type: "link",
			version: "1.0",
			title,
			thumbnail,
			description,
		});
	}catch(error){
		console.error("Error processing invite response:", error);
		res.json({
			type: "link",
			version: "1.0",
			title: "Jank Client",
			thumbnail: "/logo.webp",
			description: "A spacebar client that has DMs, replying and more",
			url: url.toString(),
		});
	}
}