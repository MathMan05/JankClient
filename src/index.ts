#!/usr/bin/env node

import fastifyCompress from "@fastify/compress";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import path from "node:path";
import fs, { readFileSync } from "node:fs"
import { observe, uptime } from "./stats.js";
import { getApiUrls, inviteResponse } from "./utils.js";
import { fileURLToPath } from "node:url";
import process from "node:process";

const devmode = (process.env.NODE_ENV || "development") === "development";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


interface Instance {
	name: string;
	[key: string]: unknown;
}

export type InstanceType = {
	name: string;
	description?: string;
	descriptionLong?: string;
	image?: string;
	url?: string;
	language: string;
	country: string;
	display: boolean;
	urls?: {
		wellknown: string;
		api: string;
		cdn: string;
		gateway: string;
		login?: string;
	};
	contactInfo?: {
		discord?: string;
		github?: string;
		email?: string;
		spacebar?: string;
		matrix?: string;
		mastodon?: string;
	};
};

const instances = JSON.parse(
	readFileSync(process.env.JANK_INSTANCES_PATH || path.join(__dirname, "webpage", "instances.json")).toString(),
) as InstanceType[];

const instanceNames = new Map<string, Instance>();

for (const instance of instances) {
	instanceNames.set(instance.name, instance);
}

async function updateInstances(): Promise<void> {
	try {
		const response = await fetch(
			"https://raw.githubusercontent.com/spacebarchat/spacebarchat/master/instances/instances.json",
		);
		if (!response.ok) {
			throw new Error(`Failed to fetch instances: ${response.statusText}`);
		}
		const json = (await response.json()) as Instance[];
		for (const instance of json) {
			if (instanceNames.has(instance.name)) {
				const existingInstance = instanceNames.get(instance.name);
				if (existingInstance) {
					for (const key of Object.keys(instance)) {
						if (!(key in existingInstance)) {
							existingInstance[key] = instance[key];
						}
					}
				}
			} else {
				const newInstance = instance as InstanceType;
				instances.push(newInstance);
				instanceNames.set(newInstance.name, newInstance);
			}
		}
		observe(instances);
	} catch (error) {
		console.error("Error updating instances:", error);
	}
}

updateInstances();

const fastify = Fastify({
	logger: devmode, // Enable logging in development mode
	http2: true,
	https: {
		allowHTTP1: false,
		key: fs.readFileSync(process.env.JANK_SSL_KEY || path.join(__dirname, "..", "certs", "key.pem")),
		cert: fs.readFileSync(process.env.JANK_SSL_CERT || path.join(__dirname, "..", "certs", "cert.pem")),
	},
	trustProxy: (ip: string) => ip.startsWith("127."), // Configure trustProxy directly
});

// Register plugins
fastify.register(fastifyCompress); // Equivalent to compression()
fastify.register(fastifyStatic, {
	root: path.join(__dirname, "webpage"),
	prefix: "/", // Serve files from the root URL path
	index: ["home.html", "index.html"], // Serve home.html or index.html for '/'
	// decorateReply: false // Prevent decoration if not needed, default is true
});

// --- Routes ---

// oEmbed Route
fastify.get("/services/oembed", async (request, reply) => {
	// Fastify automatically parses query parameters into request.query
	await inviteResponse(request, reply, instances); // Added await as inviteResponse is async
});

// Uptime Route
fastify.get("/uptime", async (request, reply) => {
	const instanceName = (request.query as { name?: string }).name;
	const instanceUptime = instanceName ? uptime.get(instanceName) : undefined;
	if (instanceUptime === undefined) {
		reply.status(404).send({ error: "Instance not found or uptime not tracked" });
	} else {
		reply.send(instanceUptime);
	}
});

// Instances JSON Route
fastify.get("/instances.json", async (request, reply) => {
	reply.send(instances);
});

// Add oEmbed Link Header Hook
fastify.addHook('onRequest', async (request, reply) => {
	if (
		request.url.startsWith('/services/oembed') ||
		request.url.startsWith('/uptime') ||
		request.url.startsWith('/instances.json') ||
		request.url.includes('.')
	) {
		return;
	}

	const scheme = request.protocol;
	const hostHeader = request.headers.host;

	if (!hostHeader) {
		request.log.warn('Host header missing, cannot generate oEmbed link.');
		return;
	}

	const fullHost = `${scheme}://${hostHeader}`;
	const originalUrl = request.url;

	const ref = `${fullHost}${originalUrl}`;
	const link = `${fullHost}/services/oembed?url=${encodeURIComponent(ref)}`;
	reply.header(
		"Link",
		`<${link}>; rel="alternate"; type="application/json+oembed"; title="Jank Client oEmbed format"`,
	);
});



const PORT: number = process.env.PORT ? Number.parseInt(process.env.PORT) : (Number.parseInt(process.argv[2]) || 8080);

const start = async () => {
	try {
		await fastify.listen({ port: PORT, host: '0.0.0.0' });
		console.log(`Server running on port ${PORT}`);
	} catch (err) {
		fastify.log.error(err);
		process.exit(1);
	}
};

start();

export { getApiUrls };