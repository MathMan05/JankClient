function deleteoldcache(){
  caches.delete("cache");
  console.log("this ran :P")
}

async function putInCache(request, response){
    console.log(request,response);
    const cache = await caches.open('cache');
    console.log("Grabbed")
    try{
    console.log(await cache.put(request, response));
    }catch(error){
        console.error(error);
    }
};
console.log("test");

let lastcache
self.addEventListener("activate", async (event) => {
    console.log("test2");
    checkCache();
})
async function checkCache(){
    if(checkedrecently){
        return;
    }
    promise=await caches.match("/getupdates");
    if(promise){
        lastcache= await promise.text();
    }
    console.log(lastcache);
    fetch("/getupdates").then(async data=>{
        text=await data.clone().text();
        console.log(text,lastcache)
        if(lastcache!==text){
            deleteoldcache();
            putInCache("/getupdates",data.clone());
        }
        checkedrecently=true;
        setTimeout(_=>{checkedrecently=false},1000*60*30);
    })
}
var checkedrecently=false;
function samedomain(url){
    return new URL(url).origin===self.origin;
}
function isindexhtml(url){
    console.log(url);
    if(new URL(url).pathname.startsWith("/channels")){
        return true;
    }
    return false;
}
async function getfile(event){
    checkCache();
    if(!samedomain(event.request.url)){
        return await fetch(event.request.clone());
    }
    const responseFromCache = await caches.match(event.request.url);
    console.log(responseFromCache,caches);
    if (responseFromCache) {
        console.log("cache hit")
        return responseFromCache;
    }
    if(isindexhtml(event.request.url)){
        console.log("is index.html")
        const responseFromCache = await caches.match("/index.html");
        if (responseFromCache) {
            console.log("cache hit")
            return responseFromCache;
        }
        const responseFromNetwork = await fetch("/index.html");
        await putInCache("/index.html",responseFromNetwork.clone());
        return responseFromNetwork;
    }
    const responseFromNetwork = await fetch(event.request.clone());
    console.log(event.request.clone());
    await putInCache(event.request.clone(),responseFromNetwork.clone());
    try{
    return responseFromNetwork;
    }catch(e){console.error(e)}
}
self.addEventListener('fetch', (event) => {
    try{
    event.respondWith(getfile(event));
    }catch(e){console.error(e)}
})
