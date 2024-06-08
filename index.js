#!/bin/node
const express = require("express")
const app = express()
const path = require("node:path")

app.get("/", (req, res) => {
	res.sendFile(path.join(__dirname, "webpage", "index.html"))
})

app.get("/login.html", (req, res) => {
	res.sendFile(path.join(__dirname, "webpage", "login.html"))
})
app.get("/direct.js", (req, res) => {
	res.sendFile(path.join(__dirname, "webpage", "direct.js"))
})
app.get("/login.js", (req, res) => {
	res.sendFile(path.join(__dirname, "webpage", "login.js"))
})
app.get("/bitmap.svg", (req, res) => {
	res.sendFile(path.join(__dirname, "webpage", "bitmap.svg"))
})
app.get("/role.js", (req, res) => {
	res.sendFile(path.join(__dirname, "webpage", "role.js"))
})
app.get("/index.js", (req, res) => {
	res.sendFile(path.join(__dirname, "webpage", "index.js"))
})
app.get("/guild.js", (req, res) => {
	res.sendFile(path.join(__dirname, "webpage", "guild.js"))
})
app.get("/localuser.js", (req, res) => {
	res.sendFile(path.join(__dirname, "webpage", "localuser.js"))
})
app.get("/channel.js", (req, res) => {
	res.sendFile(path.join(__dirname, "webpage", "channel.js"))
})
app.get("/user.js", (req, res) => {
	res.sendFile(path.join(__dirname, "webpage", "user.js"))
})
app.get("/message.js", (req, res) => {
	res.sendFile(path.join(__dirname, "webpage", "message.js"))
})
app.get("/member.js", (req, res) => {
	res.sendFile(path.join(__dirname, "webpage", "member.js"))
})
app.get("/markdown.js", (req, res) => {
	res.sendFile(path.join(__dirname, "webpage", "markdown.js"))
})
app.get("/fullscreen.js", (req, res) => {
	res.sendFile(path.join(__dirname, "webpage", "fullscreen.js"))
})
app.get("/style.css", (req, res) => {
	res.sendFile(path.join(__dirname, "webpage", "style.css"))
})

app.get("/manifest.json", (req, res) => {
	res.sendFile(path.join(__dirname, "webpage", "manifest.json"))
})

app.get("/favicon.ico", (req, res) => {
	res.send("")
})

app.get("/channels/*", async (req, res) => {
	res.sendFile(path.join(__dirname, "webpage", "index.html"))
})

app.get("/font/:font", (req, res) => {
	res.sendFile(path.join(__dirname, "webpage", "font", req.params.font))
})

const PORT = process.env.PORT || 25513
app.listen(PORT)
