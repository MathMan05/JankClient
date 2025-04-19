//@ts-ignore
import {langs} from "./translations/langs.js";
const langmap = new Map<string, string>();
for (const lang of Object.keys(langs) as string[]) {
	langmap.set(lang, langs[lang]);
}
console.log(langs);
type translation = {
	[key: string]: string | translation;
};
let res: () => unknown = () => {};
class I18n {
	static lang: string;
	static translations: translation[] = [];
	static done = new Promise<void>((res2, _reject) => {
		res = res2;
	});
	static async create(lang: string) {
		const json = (await (await fetch(`/translations/${lang}.json`)).json()) as translation;
		const translations: translation[] = [];
		translations.push(json);
		if (lang !== "en") {
			translations.push((await (await fetch("/translations/en.json")).json()) as translation);
		}
		I18n.lang = lang;
		I18n.translations = translations;

		res();
	}
	static getTranslation(msg: string, ...params: string[]): string {
		let str: string | undefined;
		const path = msg.split(".");
		for (const json of I18n.translations) {
			let jsont: string | translation = json;
			for (const thing of path) {
				if (typeof jsont !== "string" && jsont !== undefined) {
					jsont = jsont[thing];
				} else {
					jsont = json;
					break;
				}
			}

			if (typeof jsont === "string") {
				str = jsont;
				break;
			}
		}
		if (str) {
			return I18n.fillInBlanks(str, params);
		}
			throw new Error(`${msg} not found`);
	}
	static fillInBlanks(msg: string, params: string[]): string {
		//thanks to geotale for the regex
		msg = msg.replace(/\$\d+/g, (match) => {
			const number = Number(match.slice(1));
			if (params[number - 1]) {
				return params[number - 1];
			}
				return match;
		});
		msg = msg.replace(/{{(.+?)}}/g, (str, match: string) => {
			const [op, strsSplit] = I18n.fillInBlanks(match, params).split(":");
			const [first, ...strs] = strsSplit.split("|");
			switch (op.toUpperCase()) {
				case "PLURAL": {
					const numb = Number(first);
					if (numb === 0) {
						return strs[strs.length - 1];
					}
					return strs[Math.min(strs.length - 1, numb - 1)];
				}
				case "GENDER": {
					if (first === "male") {
						return strs[0];
					}if (first === "female") {
						return strs[1];
					}if (first === "neutral") {
						if (strs[2]) {
							return strs[2];
						}
							return strs[0];
					}
				}
			}
			return str;
		});

		return msg;
	}
	static options() {
		return [...langmap.keys()].map((e) => e.replace(".json", ""));
	}
	static setLanguage(lang: string) {
		if (I18n.options().indexOf(userLocale) !== -1) {
			localStorage.setItem("lang", lang);
			I18n.create(lang);
		}
	}
}
console.log(langmap);
let userLocale = navigator.language.slice(0, 2) || "en";
if (I18n.options().indexOf(userLocale) === -1) {
	userLocale = "en";
}
const storage = localStorage.getItem("lang");
if (storage) {
	userLocale = storage;
} else {
	localStorage.setItem("lang", userLocale);
}
I18n.create(userLocale);
function makeWeirdProxy(obj: [string, translation | undefined] = ["", undefined]) {
	return new Proxy(obj, {
		get: (target, input) => {
			if (target[0] === "" && input in I18n) {
				//@ts-ignore
				return I18n[input];
			}if (typeof input === "string") {
				let translations = obj[1];

				if (!translations) {
					//Really weird way to make sure I get english lol
					translations = I18n.translations[I18n.translations.length - 1];
					obj[1] = translations;
				}
				if (!translations) {
					return;
				}

				const value = translations[input];
				if (value) {
					let path = obj[0];
					if (path !== "") {
						path += ".";
					}
					path += input;
					if (typeof value === "string") {
						return (...args: string[]) => {
							return I18n.getTranslation(path, ...args);
						};
					}
						return makeWeirdProxy([path, value]);
				}
			}
		},
	});
}
import type jsonType from "./../../translations/en.json";
type beforeType = typeof jsonType;

type DoTheThing<T> = {
	[K in keyof T]: T[K] extends string ? (...args: string[]) => string : DoTheThing<T[K]>;
};

const proxyClass = makeWeirdProxy() as unknown as typeof I18n & DoTheThing<beforeType>;
export {proxyClass as I18n, langmap};
