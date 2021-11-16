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

app.listen(3000);
