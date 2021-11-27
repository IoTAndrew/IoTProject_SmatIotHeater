const express = require('express');
const path = require('path')
const app = express();


app.use("/public", express.static(path.join(__dirname,'public')))

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname,'public/auth.html'))
})

app.get("/home", (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'))
})

app.get("/create", (req, res) => {
    res.sendFile(path.join(__dirname, 'public/user.html'))
})

app.get("/logs", (req, res) => {
    res.sendFile(path.join(__dirname, 'public/logs.html'))
})

app.get("/settings", (req, res) => {
    res.sendFile(path.join(__dirname, 'public/settings.html'))
})

app.get("/about", (req, res) => {
    res.sendFile(path.join(__dirname, 'public/about.html'))
})

app.listen(3000);
