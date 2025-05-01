import {promises as fs} from "fs";
import * as swc from "@swc/core";
import {fileURLToPath} from "node:url";
import path from "node:path";
import child_process from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
async function moveFiles(path: string, newPath: string) {
	async function processFile(file: string) {
		const Prom: Promise<unknown>[] = [];
		if ((await fs.stat(path + "/" + file)).isDirectory()) {
			await fs.mkdir(newPath + "/" + file);
			Prom.push(moveFiles(path + "/" + file, newPath + "/" + file));
		} else {
			if (!file.endsWith(".ts")) {
				await fs.copyFile(path + "/" + file, newPath + "/" + file);
			} else {
				const plainname = file.split(".ts")[0];
				const newfileDir = newPath + "/" + plainname;
				const mod = await swc.transformFile(path + "/" + file, {
					minify: true,
					sourceMaps: true,
					isModule: true,
				});
				await Promise.all([
					fs.writeFile(
						newfileDir + ".js",
						mod.code + "\n" + `//# sourceMappingURL= ${plainname}.js.map`,
					),
					fs.writeFile(newfileDir + ".js.map", mod.map as string),
				]);
			}
		}
		await Promise.all(Prom);
	}
	await Promise.all((await fs.readdir(path)).map(processFile));
}
async function build() {
	console.time("build");

	console.time("Cleaning dir");
	try {
		await fs.rm(__dirname + "/dist", {recursive: true});
	} catch {}
	await fs.mkdir(__dirname + "/dist");
	console.timeEnd("Cleaning dir");

	console.time("Moving and compiling files");
	await moveFiles(__dirname + "/src", __dirname + "/dist");
	console.timeEnd("Moving and compiling files");

	console.time("Moving translations");
	let langs = await fs.readdir(__dirname + "/translations");
	langs = langs.filter((e) => e !== "qqq.json");
	const langobj = {};
	for (const lang of langs) {
		const str = await fs.readFile("translations/" + lang);
		const json = JSON.parse(str.toString());
		langobj[lang] = json.readableName;
		fs.writeFile(__dirname + "/dist/webpage/translations/" + lang, str);
	}
	await fs.writeFile(
		"dist/webpage/translations/langs.js",
		`const langs=${JSON.stringify(langobj)};export{langs}`,
	);
	console.timeEnd("Moving translations");

	console.time("Adding git commit hash");
	const revision = child_process.execSync("git rev-parse HEAD").toString().trim();
	await fs.writeFile("dist/webpage/getupdates", revision);
	console.timeEnd("Adding git commit hash");

	console.timeEnd("build");
	console.log("");
}

await build();
if (process.argv.includes("watch")) {
	let last = Date.now();
	(async () => {
		for await (const thing of fs.watch(__dirname + "/src")) {
			if (Date.now() - last < 100) {
				continue;
			}
			last = Date.now();
			await build();
		}
	})();
	(async () => {
		for await (const thing of fs.watch(__dirname + "/translations")) {
			if (Date.now() - last < 100) {
				continue;
			}
			last = Date.now();
			await build();
		}
	})();
}
