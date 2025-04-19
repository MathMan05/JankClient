import type { FastifyRequest, FastifyReply, FastifySchema, RouteGenericInterface } from "fastify"; // Changed import
import type { instace } from "./index.js";
import type { Http2SecureServer, Http2ServerRequest, Http2ServerResponse } from "node:http2";
import type { IncomingMessage, ServerResponse } from "node:http";
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

export async function getApiUrls(
	url: string,
	instances: instace[],
	check = true,
): Promise<ApiUrls | null> {
	let modifiedUrl = url;
	if (!modifiedUrl.endsWith("/")) {
		modifiedUrl += "/";
	}
	if (check) {
		let valid = false;
		for (const instace of instances) {
			const urlstr = instace.url || instace.urls?.api;
			if (!urlstr) {
				continue;
			}
			try {
				if (new URL(urlstr).host === new URL(url).host) {
					valid = true;
					break;
				}
			} catch (e) {
				//console.log(e);
			}
		}
		if (!valid) {
			throw new Error("Invalid instance");
		}
	}
	try {
		const info: ApiUrls = await fetch(`${url}.well-known/spacebar`).then((res) => res.json());
		const api = info.api;
		const apiUrl = new URL(api);
		const policies: { cdn: string; gateway: string; defaultApiVersion: string; apiEndpoint: string; } = await fetch(
			`${api}${apiUrl.pathname.includes("api") ? "" : "api"}/policies/instance/domains`,
		).then((res) => res.json());
		return {
			api: policies.apiEndpoint,
			gateway: policies.gateway,
			cdn: policies.cdn,
			wellknown: url,
		};
	} catch (error) {
		console.error("Error fetching API URLs:", error);
		return null;
	}
}

export async function inviteResponse(
	req: FastifyRequest<RouteGenericInterface, Http2SecureServer, Http2ServerRequest, FastifySchema>,
	reply: FastifyReply<RouteGenericInterface, Http2SecureServer<typeof IncomingMessage, typeof ServerResponse, typeof Http2ServerRequest, typeof Http2ServerResponse>>,
	instances: instace[],
): Promise<void> {
	let url: URL;
	// Define the expected query structure
	interface InviteQuery {
		url?: string;
	}
	const query = req.query as InviteQuery; // Type assertion for query

	try {
		// Use the typed query object
		if (!query.url) {
			throw new Error("URL query parameter is missing");
		}
		url = new URL(query.url);
	} catch {
		// Use Fastify's request properties
		const scheme = req.protocol; // Changed from req.secure
		const hostHeader = req.headers.host; // Changed from req.get("Host")
		if (!hostHeader) {
			// Handle missing host header appropriately, maybe send an error response
			console.error("Host header is missing");
			reply.code(400).send({ error: "Host header is missing" });
			return;
		}
		const host = `${scheme}://${hostHeader}`;
		url = new URL(host); // Default URL if query.url is invalid or missing
	}

	try {
		if (!url.pathname.startsWith("/invite")) { // Simplified check
			throw new Error("Invalid invite URL path");
		}

		const pathParts = url.pathname.split("/");
		// Ensure there's a part after /invite/
		if (pathParts.length < 3 || !pathParts[2]) {
			throw new Error("Invite code missing in URL path");
		}
		const code = pathParts[2];

		const instance = url.searchParams.get("instance");
		if (!instance) {
			throw new Error("Instance query parameter not specified");
		}

		const urls = await getApiUrls(instance, instances);
		if (!urls) {
			// It might be better to send a specific error response here
			reply.code(500).send({ error: "Failed to resolve instance API URLs" });
			return;
			// throw new Error("Failed to get API URLs"); // Original behavior
		}

		const inviteResponse = await fetch(`${urls.api}/invites/${code}`);
		if (!inviteResponse.ok) {
			throw new Error(`Failed to fetch invite details: ${inviteResponse.statusText}`);
		}
		const invite = (await inviteResponse.json()) as Invite;

		const title = invite.guild.name;
		const description = invite.inviter
			? `${invite.inviter.username} has invited you to ${invite.guild.name}${invite.guild.description ? `\n${invite.guild.description}` : ""}`
			: `You've been invited to ${invite.guild.name}${invite.guild.description ? `\n${invite.guild.description}` : ""}`;
		const thumbnail = invite.guild.icon
			? `${urls.cdn}/icons/${invite.guild.id}/${invite.guild.icon}.png`
			: ""; // Consider a default thumbnail?

		// Use reply.send instead of res.json
		reply.send({
			type: "link",
			version: "1.0",
			title,
			thumbnail_url: thumbnail, // Correct oEmbed property name
			// description, // Description is not a standard oEmbed property for type 'link'
			provider_name: "Jank Client", // Added provider name
			provider_url: url.origin, // Added provider URL
		});
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	} catch (error: any) {
		console.error("Error processing invite response:", error.message);
		// Send a generic oEmbed response on error
		reply.send({
			type: "link",
			version: "1.0",
			title: "Jank Client Invite",
			provider_name: "Jank Client",
			provider_url: url.origin, // Use the determined origin
			// thumbnail_url: "/logo.webp", // Provide full URL if possible or handle differently
			// description: "Error processing invite link.", // Optional: indicate error
		});
	}
}
