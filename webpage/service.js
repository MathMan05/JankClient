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

self.addEventListener("push", event => {
	const data = event.data.json()
	const notification = new self.Notification(data.title, {
		body: data.body,
		icon: data.icon,
		image: data.image
	})
	notification.addEventListener("click", () => {
		self.clients.openWindow(data.uri)
	})
})

self.registration.pushManager.subscribe({
	userVisibleOnly: true,
	applicationServerKey: ""
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

self.addEventListener("fetch", event => {
	const url = new URL(event.request.url)
	if (event.request.method == "GET" && url.protocol == "https:" && (event.request.mode == "navigate" || event.request.mode == "no-cors" || event.request.mode == "cors")) {
		event.respondWith((async () => {
			const preloadResponse = await event.preloadResponse
			if (preloadResponse) return preloadResponse

			checkCache()
			if (!samedomain(event.request.url)) return await fetch(event.request.clone())

			const responseFromCache = await caches.match(isindexhtml(event.request.url) ? "/index" : event.request.url)
			if (responseFromCache) return responseFromCache

			const responseFromNetwork = await fetch(isindexhtml(event.request.url) ? "/index" : event.request.clone())
			await putInCache(isindexhtml(event.request.url) ? "/index" : event.request.clone(), responseFromNetwork.clone())
			return responseFromNetwork
		})())
	}
})
