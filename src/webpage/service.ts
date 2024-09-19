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
console.log("test");

let lastcache: string;
self.addEventListener("activate", async ()=>{
	console.log("test2");
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
			putInCache("/getupdates", data.clone());
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
function isindexhtml(url: string | URL){
	console.log(url);
	if(new URL(url).pathname.startsWith("/channels")){
		return true;
	}
	return false;
}
async function getfile(event: {
request: { url: URL | RequestInfo; clone: () => string | URL | Request };
}){
	checkCache();
	if(!samedomain(event.request.url.toString())){
		return await fetch(event.request.clone());
	}
	const responseFromCache = await caches.match(event.request.url);
	console.log(responseFromCache, caches);
	if(responseFromCache){
		console.log("cache hit");
		return responseFromCache;
	}
	if(isindexhtml(event.request.url.toString())){
		console.log("is index.html");
		const responseFromCache = await caches.match("/index.html");
		if(responseFromCache){
			console.log("cache hit");
			return responseFromCache;
		}
		const responseFromNetwork = await fetch("/index.html");
		await putInCache("/index.html", responseFromNetwork.clone());
		return responseFromNetwork;
	}
	const responseFromNetwork = await fetch(event.request.clone());
	console.log(event.request.clone());
	await putInCache(event.request.clone(), responseFromNetwork.clone());
	try{
		return responseFromNetwork;
	}catch(e){
		console.error(e);
		return e;
	}
}
self.addEventListener("fetch", (event: any)=>{
	try{
		event.respondWith(getfile(event));
	}catch(e){
		console.error(e);
	}
});
