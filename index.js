#!/bin/node
const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.sendFile("./webpage/index.html", {root: "."})
})

app.get('/login.html', (req, res) => {
    res.sendFile("./webpage/login.html", {root: "."})
})
app.get('/dirrect.js', (req, res) => {
    res.sendFile("./webpage/dirrect.js", {root: "."})
})
app.get('/login.js', (req, res) => {
    res.sendFile("./webpage/login.js", {root: "."})
})
app.get('/bitmap.svg', (req, res) => {
    res.sendFile("./webpage/bitmap.svg", {root: "."})
})
app.get('/role.js', (req, res) => {
    res.sendFile("./webpage/role.js", {root: "."})
})
app.get('/index.js', (req, res) => {
    res.sendFile("./webpage/index.js", {root: "."})
})
app.get('/guild.js', (req, res) => {
    res.sendFile("./webpage/guild.js", {root: "."})
})
app.get('/localuser.js', (req, res) => {
    res.sendFile("./webpage/localuser.js", {root: "."})
})
app.get('/channel.js', (req, res) => {
    res.sendFile("./webpage/channel.js", {root: "."})
})
app.get('/user.js', (req, res) => {
    res.sendFile("./webpage/user.js", {root: "."})
})
app.get('/message.js', (req, res) => {
    res.sendFile("./webpage/message.js", {root: "."})
})
app.get('/member.js', (req, res) => {
    res.sendFile("./webpage/member.js", {root: "."})
})
app.get('/markdown.js', (req, res) => {
    res.sendFile("./webpage/markdown.js", {root: "."})
})
app.get('/fullscreen.js', (req, res) => {
    res.sendFile("./webpage/fullscreen.js", {root: "."})
})
app.get('/style.css', (req, res) => {
    res.sendFile("./webpage/style.css", {root: "."})
})

app.get('/manifest.json', (req, res) => {
    res.sendFile("./webpage/manifest.json", {root: "."})
})

app.get('/favicon.ico', (req, res) => {
    res.send("")
})

app.get('/channels/*', async (req, res) => {
    res.sendFile("./webpage/index.html", {root: "."})
});


const PORT = 8080;
app.listen(PORT, () => {});
console.log("this ran :P")

