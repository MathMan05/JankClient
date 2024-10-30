function deleteoldcache(){
	caches.delete("cache");
	console.log("this ran :P");
}

async function putInCache(request: URL | RequestInfo, response: Response){
	console.log(request, response);
	const cache = await caches.open("cache");
	console.log("Grabbed");
	try{
		console.log(await cache.put(request, response));
	}catch(error){
		console.error(error);
	}
}

let lastcache: string;
self.addEventListener("activate", async ()=>{
	console.log("Service Worker activated");
	checkCache();
});

async function checkCache(){
	if(checkedrecently){
		return;
	}
	const promise = await caches.match("/getupdates");
	if(promise){
		lastcache = await promise.text();
	}
	console.log(lastcache);
	fetch("/getupdates").then(async data=>{
		const text = await data.clone().text();
		console.log(text, lastcache);
		if(lastcache !== text){
			deleteoldcache();
			putInCache("/getupdates", data);
		}
		checkedrecently = true;
		setTimeout((_: any)=>{
			checkedrecently = false;
		}, 1000 * 60 * 30);
	});
}
var checkedrecently = false;

function samedomain(url: string | URL){
	return new URL(url).origin === self.origin;
}

const htmlFiles=new Set(["/index","/login","/home","/register","/oauth2/auth"]);


function isHtml(url:string):string|void{
	const path=new URL(url).pathname;
	if(htmlFiles.has(path)||htmlFiles.has(path+".html")){
		return path+path.endsWith(".html")?"":".html";
	}
}
let enabled="false";
let offline=false;

function toPath(url:string):string{
	const Url= new URL(url);
	let html=isHtml(url);
	if(!html){
		const path=Url.pathname;
		if(path.startsWith("/channels")){
			html="./index.html"
		}else if(path.startsWith("/invite")){
			html="./invite.html"
		}
	}
	return html||Url.pathname;
}
let fails=0;
async function getfile(event: FetchEvent):Promise<Response>{
	checkCache();
	if(!samedomain(event.request.url)||enabled==="false"||(enabled==="offlineOnly"&&!offline)){
		const responce=await fetch(event.request.clone());
		if(samedomain(event.request.url)){
			if(enabled==="offlineOnly"&&responce.ok){
				putInCache(toPath(event.request.url),responce.clone());
			}
			if(!responce.ok){
				fails++;
				if(fails>5){
					offline=true;
				}
			}
		}
		return responce;
	}

	let path=toPath(event.request.url);
	if(path === "/instances.json"){
		return await fetch(path);
	}
	console.log("Getting path: "+path);
	const responseFromCache = await caches.match(path);
	if(responseFromCache){
		console.log("cache hit");
		return responseFromCache;
	}
	try{
		const responseFromNetwork = await fetch(path);
		if(responseFromNetwork.ok){
			await putInCache(path, responseFromNetwork.clone());
		}
		return responseFromNetwork;
	}catch(e){
		console.error(e);
		return new Response(null);
	}
}


self.addEventListener("fetch", (e)=>{
	const event=e as FetchEvent;
	try{
		event.respondWith(getfile(event));
	}catch(e){
		console.error(e);
	}
});

self.addEventListener("message", (message)=>{
	const data=message.data;
	switch(data.code){
		case "setMode":
			enabled=data.data;
			break;
		case "CheckUpdate":
			checkedrecently=false;
			checkCache();
			break;
		case "ForceClear":
			deleteoldcache();
			break;
	}
})
