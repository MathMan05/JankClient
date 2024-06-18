#! /usr/bin/env node

const express = require('express');
const fs = require('fs');
const app = express();

app.use("/getupdates",(req, res) => {
    const out=fs.statSync(`${__dirname}/webpage`);
    res.send(out.mtimeMs+"");
});
let debugging=true;
app.use('/', (req, res) => {
    if(debugging&&req.path.startsWith("/service.js")){
        res.send("console.log(\"Hi :3\");");
    }
    if(fs.existsSync(`${__dirname}/webpage${req.path}`)) {
        res.sendFile(`./webpage${req.path}`, {root: __dirname});
    }
    else if(fs.existsSync(`${__dirname}/webpage${req.path}.html`)) {
        res.sendFile(`./webpage${req.path}.html`, {root: __dirname});
    }
    else {
        res.sendFile("./webpage/index.html", {root: __dirname});
    }
});


const PORT = process.env.PORT || +process.argv[1] || 8080;
app.listen(PORT, () => {});
console.log("this ran :P");
