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
const knex = require('./db/knex')

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
    users = await getAllUsers()
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
        const id = await updateUser(req.user.id, req.body)
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
        await createUser({
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

/*
app.get("/about", (req, res) => {
    res.sendFile(path.join(__dirname, 'public/about.html'))
})*/

app.delete('/logout', (req, res) => {
    req.logOut()
    res.redirect('/')
})

//this is where the mcu should hit, YES IT WORKS IN MY BROWSER
//ADD SQL SCRIPT TO THE JS FILE
app.get('/api', async (req, res) => {
    const devID = req.query.dev_id
    const temp = req.query.inside_temp
    const hum = req.query.hum

    const userr = await getMCU(devID) //get mcu id

    const dbTempOBJ = await knex.raw("SELECT inside_temp from Temps where dev_id = " + req.query.dev_id + " ORDER BY end_time DESC LIMIT 1")
    const dbTemp = dbTempOBJ[0].inside_temp

    if(temp >= dbTemp + 1 || temp <= dbTemp - 1){
        await knex.raw("INSERT INTO Temps values (" + devID + ", " + temp + ", " + hum + ", DATETIME('NOW'), DATETIME('NOW'));")
    } else {
        await knex.raw("UPDATE Temps set end_time = DATETIME('NOW') where end_time = " +
        "(SELECT end_time from Temps ORDER BY end_time DESC LIMIT 1)"
        + "" +
            ";")
    }

    const goingHomeObj = await knex.raw("SELECT goingHome from userCredentials where id = (SELECT user_id from Devs where id = " + req.query.dev_id + ");")
    const going_home = goingHomeObj[0].goingHome
    if(going_home){
        await knex.raw("UPDATE Devs set heat_time = DATETIME('NOW') where id = " + req.query.dev_id + ";")
    }else{
        const reqTempOBJ = await knex.raw("SELECT reqTemp from userCredentials where id = (SELECT user_id from Devs where id = " + req.query.dev_id + ");")
        const reqTemp = reqTempOBJ[0].reqTemp
        const arrivalTimeOBJ = await knex.raw("SELECT arrivalTime from userCredentials where id = (SELECT user_id from Devs where id = " + req.query.dev_id + ");")
        const arrivalTime = arrivalTimeOBJ[0].arrivalTime
        await knex.raw("UPDATE Devs set heat_time = datetime(\n" +
            "            julianday(\"" + arrivalTime + "\")\n" +
            "            -\n" +
            "            (\n" +
            "                    julianday((SELECT start_time FROM Temps where dev_id = " + devID + " AND inside_temp = " + reqTemp + " limit 1))\n" +
            "                    -\n" +
            "                    julianday((SELECT end_time FROM Temps where dev_id = " + devID + " AND inside_temp = " + temp + " AND end_time < (\n" +
            "                        SELECT start_time FROM Temps where dev_id = " + devID + " AND inside_temp = " + reqTemp + " limit 1\n" +
            "                        ) limit 1))\n" +
            "                )\n" +
            "    ) where id = " + devID + ";")
    }

    const id = await getUser(userr[0].user_id) //get user id

    //const location = id[0].location
    //tempGetter(location)

    const minTemp = id[0].minTemp
    const reqTemp = id[0].reqTemp
    const goingHome = id[0].goingHome
    const dataString = minTemp + '/' + reqTemp + '/' + goingHome + '/'
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

function createUser(user){
    return knex('userCredentials').insert(user)
}

function getUser(id){
    return knex('userCredentials').where('id', id).select()
}

function getMCU(id){
    return knex('Devs').where('id', id).select()
}

function getAllUsers(){
    return knex('userCredentials').select('*')
}

function deleteUser(id){
    return knex('userCredentials').where('id', id).del()
}

function updateUser(id, userData){
    return knex('userCredentials').where('id', id).update(userData)
}

function addData(data){
    return knex('Devs').insert(data)
}

function addDataTemps(data){
    return knex('Temps').insert(data)
}

function getTemp(id) {
    return knex('Temps').where('id', id).select()
}


app.listen(3000);
