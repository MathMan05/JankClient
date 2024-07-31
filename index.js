#! /usr/bin/env node

"use strict"

const fs = require("node:fs")
const fsPromises = require("node:fs/promises")
const path = require("node:path")

const express = require("express")
const app = express()
app.disable("x-powered-by")

const compression = require("compression")
app.use(compression())

app.use((req, res, next) => {
	res.header("X-Frame-Options", "DENY")
	res.header("X-Content-Type-Options", "nosniff")
	res.header("Report-To", JSON.stringify({
		group: "default",
		max_age: 2592000,
		endpoints: [{
			url: "https://api.tomatenkuchen.com/csp-violation"
		}],
		include_subdomains: true
	}))
	res.header("Referrer-Policy", "no-referrer")
	res.header("Cross-Origin-Opener-Policy", "same-origin")

	res.header("Content-Security-Policy",
		"default-src 'none' 'report-sample'; " +
		"img-src 'self' https: http: blob:; " +
		"script-src-elem 'self' https://www.google.com/recaptcha/api.js https://www.gstatic.com/recaptcha/ https://js.hcaptcha.com/1/api.js; " +
		"style-src-elem 'self'; " +
		"font-src 'self'; " +
		"media-src https: http:; " +
		"connect-src https: wss: http: ws:; " +
		"form-action 'none'; " +
		"frame-ancestors 'none'; " +
		"frame-src https://newassets.hcaptcha.com https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/; " +
		"manifest-src " + req.get("host") + "/manifest.json; " +
		"worker-src " + req.get("host") + "/service.js; " +
		"report-uri https://api.tomatenkuchen.com/csp-violation"
	)

	next()
})

app.get("/getupdates", async (req, res) => {
	const out = await fsPromises.stat(path.join(__dirname, "webpage"))
	res.header("Content-Type", "text/plain")
	res.send("" + Math.round(out.mtimeMs))
})

app.use("/", (req, res) => {
	const reqPath = req.path.replace(/[^\w.-]/g, "")
	if (reqPath.length == 0) return res.sendFile(path.join(__dirname, "webpage", "index.html"))

	if (fs.existsSync(path.join(__dirname, "webpage", reqPath))) res.sendFile(path.join(__dirname, "webpage", reqPath))
	else if (fs.existsSync(path.join(__dirname, "webpage", "font", reqPath.replace("font", "")))) {
		res.sendFile(path.join(__dirname, "webpage", "font", reqPath.replace("font", "")), {
			maxAge: 1000 * 60 * 60 * 24 * 90
		})
	} else if (fs.existsSync(path.join(__dirname, "webpage", "img", reqPath.replace("img", "")))) {
		res.sendFile(path.join(__dirname, "webpage", "img", reqPath.replace("img", "")), {
			maxAge: 1000 * 60 * 60 * 24
		})
	} else if (fs.existsSync(path.join(__dirname, "webpage", reqPath + ".html"))) res.sendFile(path.join(__dirname, "webpage", reqPath + ".html"))
	else if (/^connections[a-z]{1,30}callback$/.test(reqPath)) res.sendFile(path.join(__dirname, "webpage", "connections.html"))
	else res.sendFile(path.join(__dirname, "webpage", "index.html"))
})

const PORT = process.env.PORT || 25512
app.listen(PORT)
console.log("Started Jank Client on port " + PORT + "!")
