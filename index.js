if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

const express = require('express');
const path = require('path')
const app = express();
const bcrypt = require('bcrypt')
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const methodOverride = require('method-override')
const bodyParser = require('body-parser')
const db = require('./db/users')

const initializePassport = require('./passport-config')
initializePassport(
    passport,
    email => users.find(user => user.email === email),
    id => users.find(user => user.id === id)
)

//this will hold stuff pulled from the db
let users = []

//this will hold current user id
//let userid

app.use("/public", express.static(path.join(__dirname,'public')))
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())
app.use(express.urlencoded({extended:false}))
app.use(flash())
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))

app.get("/", checkNotAuthenticated , async (req,res) => {
    users = await db.getAllUsers()
    res.sendFile(path.join(__dirname,'public/auth.html'))
})

app.post("/", checkNotAuthenticated, passport.authenticate('local', {
    successRedirect: '/home',
    failureRedirect: '/',
    failureFlash: true
}))

app.get("/home", checkAuthenticated, (req, res) => {
    //console.log(req.user.id) //current signed in user ID
    res.sendFile(path.join(__dirname, 'public/index.html'))
})

app.get("/create", (req, res) => {
    res.sendFile(path.join(__dirname, 'public/user.html'))
})

app.post("/create", checkNotAuthenticated, async (req,res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10)
        await db.createUser({
            id: Date.now().toString(),
            name: req.body.name,
            email: req.body.email,
            location: req.body.location,
            password: hashedPassword
        })
        console.log("Added to DB")
        res.redirect("/")
    } catch {
        console.log("Not Added to DB")
        res.redirect("/create")
    }
})

app.get("/settings", (req, res) => {
    res.sendFile(path.join(__dirname, 'public/settings.html'))
})

app.get("/about", (req, res) => {
    res.sendFile(path.join(__dirname, 'public/about.html'))
})

app.delete('/logout', (req, res) => {
    req.logOut()
    res.redirect('/')
})

app.patch('/users/:id', async (req, res) => {
    const id = await db.updateUser(req.params.id, req.body)
    res.status(200).json({id})  //need to specify which parameters to change via json
    //maybe make multiple patches, one for each button?
    //form submission might be useful
})

//this is where the mcu should hit
app.get('/api', checkAuthenticated ,async (req, res) => {
    const id = req.user.id
    console.log(id)
    res.redirect('/api/' + id)
})

//specifically made for giving data to the board
app.get('/api/:id', async (req, res) => {
    const id = await db.getUser(req.params.id, req.body)
    const minTemp = id[0].minTemp
    const reqTemp = id[0].reqTemp
    const goingHome = id[0].goingHome
    const dataString = minTemp + ' ' + reqTemp + ' ' + goingHome
    console.log(dataString)
    res.send(dataString)
})

function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next()
    }

    res.redirect('/login')
}

function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect('/')
    }
    next()
}

app.listen(3000);
