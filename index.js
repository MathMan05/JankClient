#!/bin/node
const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.sendFile("./webpage/index.html", {root: __dirname})
})

app.get('/login.html', (req, res) => {
    res.sendFile("./webpage/login.html", {root: __dirname})
})
app.get('/dirrect.js', (req, res) => {
    res.sendFile("./webpage/dirrect.js", {root: __dirname})
})
app.get('/login.js', (req, res) => {
    res.sendFile("./webpage/login.js", {root: __dirname})
})
app.get('/bitmap.svg', (req, res) => {
    res.sendFile("./webpage/bitmap.svg", {root: __dirname})
})
app.get('/role.js', (req, res) => {
    res.sendFile("./webpage/role.js", {root: __dirname})
})
app.get('/index.js', (req, res) => {
    res.sendFile("./webpage/index.js", {root: __dirname})
})
app.get('/guild.js', (req, res) => {
    res.sendFile("./webpage/guild.js", {root: __dirname})
})
app.get('/localuser.js', (req, res) => {
    res.sendFile("./webpage/localuser.js", {root: __dirname})
})
app.get('/channel.js', (req, res) => {
    res.sendFile("./webpage/channel.js", {root: __dirname})
})
app.get('/user.js', (req, res) => {
    res.sendFile("./webpage/user.js", {root: __dirname})
})
app.get('/message.js', (req, res) => {
    res.sendFile("./webpage/message.js", {root: __dirname})
})
app.get('/member.js', (req, res) => {
    res.sendFile("./webpage/member.js", {root: __dirname})
})
app.get('/markdown.js', (req, res) => {
    res.sendFile("./webpage/markdown.js", {root: __dirname})
})
app.get('/fullscreen.js', (req, res) => {
    res.sendFile("./webpage/fullscreen.js", {root: __dirname})
})
app.get('/style.css', (req, res) => {
    res.sendFile("./webpage/style.css", {root: __dirname})
})

app.get('/manifest.json', (req, res) => {
    res.sendFile("./webpage/manifest.json", {root: __dirname})
})

app.get('/favicon.ico', (req, res) => {
    res.send("")
})

app.get('/channels/*', async (req, res) => {
    res.sendFile("./webpage/index.html", {root: __dirname})
});


const PORT = 8080;
app.listen(PORT, () => {});
console.log("this ran :P")

