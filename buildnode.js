import * as swc from "@swc/core";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {promises as fs} from "fs";
import child_process from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mod = await swc.transformFile(path.join(__dirname, "build.ts"), {
	minify: true,
	sourceMaps: true,
	isModule: true,
});

await fs.writeFile(path.join(__dirname, "build.js"), mod.code);
