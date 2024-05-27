const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.sendfile("./webpage/index.html")
})
app.get('/login.json', (req, res) => {
    res.sendfile("./personaldata.json")
})

app.get('/login.html', (req, res) => {
    res.sendfile("./webpage/login.html")
})
app.get('/dirrect.js', (req, res) => {
    res.sendfile("./webpage/dirrect.js")
})
app.get('/login.js', (req, res) => {
    res.sendfile("./webpage/login.js")
})
app.get('/bitmap.svg', (req, res) => {
    res.sendfile("./webpage/bitmap.svg")
})
app.get('/role.js', (req, res) => {
    res.sendfile("./webpage/role.js")
})
app.get('/index.js', (req, res) => {
    res.sendfile("./webpage/index.js")
})
app.get('/guild.js', (req, res) => {
    res.sendfile("./webpage/guild.js")
})
app.get('/localuser.js', (req, res) => {
    res.sendfile("./webpage/localuser.js")
})
app.get('/channel.js', (req, res) => {
    res.sendfile("./webpage/channel.js")
})
app.get('/user.js', (req, res) => {
    res.sendfile("./webpage/user.js")
})
app.get('/message.js', (req, res) => {
    res.sendfile("./webpage/message.js")
})
app.get('/member.js', (req, res) => {
    res.sendfile("./webpage/member.js")
})
app.get('/markdown.js', (req, res) => {
    res.sendfile("./webpage/markdown.js")
})
app.get('/fullscreen.js', (req, res) => {
    res.sendfile("./webpage/fullscreen.js")
})
app.get('/style.css', (req, res) => {
    res.sendfile("./webpage/style.css")
})

app.get('/manifest.json', (req, res) => {
    res.sendfile("./webpage/manifest.json")
})

app.get('/favicon.ico', (req, res) => {
    res.send("")
})

app.get('/channels/*', async (req, res) => {
    res.sendfile("./webpage/index.html")
});


const PORT = 8080;
app.listen(PORT, () => {});
console.log("this ran :P")

