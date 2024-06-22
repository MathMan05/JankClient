async function putInCache(request, response) {
	const cache = await caches.open("cache")
	await cache.put(request, response)
}

self.addEventListener("activate", event => {
	event.waitUntil((async () => {
		if ("navigationPreload" in self.registration) await self.registration.navigationPreload.enable()
	})())

	self.clients.claim()

	checkCache()
})

let lastcache
let checkedrecently = false
async function checkCache() {
	if (checkedrecently) return

	const prevCache = await caches.match("/getupdates")
	if (prevCache) lastcache = await prevCache.text()

	fetch("/getupdates").then(async data => {
		const text = await data.clone().text()
		if (lastcache != text) {
			caches.delete("cache")
			putInCache("/getupdates", data.clone())
		}
		checkedrecently = true
		setTimeout(() => {
			checkedrecently = false
		}, 1000 * 60 * 30)
	})
}

function samedomain(url) {
	return new URL(url).origin == self.origin
}

function isindexhtml(url) {
	const parsed = new URL(url)
	if (parsed.pathname.startsWith("/channels")) return true
	return false
}

async function getfile(event) {
	const preloadResponse = await event.preloadResponse
	if (preloadResponse) return preloadResponse

	checkCache()
	if (!samedomain(event.request.url)) return await fetch(event.request.clone())

	const responseFromCache = await caches.match(isindexhtml(event.request.url) ? "/index" : event.request.url)
	if (responseFromCache) return responseFromCache

	const responseFromNetwork = await fetch(isindexhtml(event.request.url) ? "/index" : event.request.clone())
	await putInCache(isindexhtml(event.request.url) ? "/index" : event.request.clone(), responseFromNetwork.clone())
	return responseFromNetwork
}

self.addEventListener("fetch", event => {
	event.respondWith(getfile(event))
})
