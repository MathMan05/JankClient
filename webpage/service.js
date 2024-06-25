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
		self.clients.matchAll({
			type: "window",
			includeUncontrolled: true
		}).then(clientList => {
			// If there is at least one client (opened page), focus it.
			if (clientList.length > 0) return clientList[0].focus()

			return self.clients.openWindow(data.uri)
		})
	})
})

let lastCache
let lastChecked = 0
async function checkCache() {
	if (lastChecked + 1000 * 60 * 30 > Date.now()) return

	const prevCache = await caches.match("/getupdates")
	if (prevCache) lastCache = await prevCache.text()

	fetch("/getupdates").then(async data => {
		const text = await data.clone().text()
		if (lastCache != text) caches.delete("cache")

		lastChecked = Date.now()
	})
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
			if (new URL(event.request.url).origin != self.origin) return await fetch(event.request)

			const cache = await caches.open("cache")

			const responseFromCache = await cache.match(isindexhtml(event.request.url) ? "/index" : event.request.url)
			if (responseFromCache) console.log("Found a cached response for " + (isindexhtml(event.request.url) ? "/index" : event.request.url))
			//if (responseFromCache) return responseFromCache

			const responseFromNetwork = await fetch(isindexhtml(event.request.url) ? "/index" : event.request)
			cache.put(isindexhtml(event.request.url) ? "/index" : event.request, responseFromNetwork.clone())
			return responseFromNetwork
		})())
	}
})
