const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

var passport = require('passport');
var Strategy = require('passport-http').BasicStrategy;

const User = require('./models/user');


const app = express();

mongoose.Promise = global.Promise; 

// connect to mongodb
mongoose.connect('mongodb://localhost/users');

// use body-parser middleware
app.use(bodyParser.json());


app.use('/api', passport.authenticate('basic', { session: false }));

// initialize routes
app.use('/api', require('./routes/api/users'));
app.use('/api', require('./routes/api/groups'));


passport.use(new Strategy(async (username, password, cb) => {
        const user = await User.find({ "username": username });
        if (!user.length || user[0].password != password) { return cb(null, false) };
        return cb(null, user);
}));

// error handling middleware
app.use(function(err, req, res, next){
    res.json({
        "error": err.message,
        "stack": err.stack
    });
});

// listen for requests
app.listen(3000, ()=>{
    console.log("Running on port 3000...")
});
