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

app.patch('/home', async (req, res) => {
    try {
        console.log(req.user.id)
        const id = await db.updateUser(req.user.id, req.body)
        console.log('user info updated')
    } catch {
        console.log('user info not updated')
        res.redirect('back')
    }
    //if u want to display the same user picks every time a user logs in then
    //gonna have to use jquery ajax again
    //rough but doable. do we need it tho? :\
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
        await db.addData({// doesnt work rn
            id: id.at(-1) + 1,
            user_id: Date.now().toString(),
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

/*
app.get("/about", (req, res) => {
    res.sendFile(path.join(__dirname, 'public/about.html'))
})*/

app.delete('/logout', (req, res) => {
    req.logOut()
    res.redirect('/')
})

//this is where the mcu should hit, YES IT WORKS IN MY BROWSER
app.get('/api', async (req, res) => {
    const user = await db.getMCU(req.query.dev_id) //get mcu id
    const id = await db.getUser(user[0].user_id) //get user id

    //const location = id[0].location
    //tempGetter(location)

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

function tempGetter (string){
// call the data from the Database
    let cityName = string; // need the call here
    const api="https://api.openweathermap.org/data/2.5/weather?q="+cityName+"&appid=ecd9898e21ff116af537053f34e4b6b7&units=metric";
    fetch(api)
        .then(response => {return response.json();
        })
        .then(data => {console.log(data);
            //to call weather go data(where the api link is stored) main(where the temp is saved into(submenu)) and temp for temp.
            // look at console.log(data) to see where to find the info you need from.
            return data.main.temp});
    //this returns only temp.

}

app.listen(3000);
