const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const joi = require('joi');

const app = express();

// connect to mongodb
mongoose.connect('mongodb://localhost/users');
mongoose.Promise = global.Promise;

// use body-parser middleware
app.use(bodyParser.json());

// initialize routes
app.use('/api', require('./routes/api/users'));
app.use('/api', require('./routes/api/groups'));

// error handling middleware
app.use(function(err, req, res, next){
    res.status(422).json({
        error: err.message,
        stack: err.stack
    });
});

// listen for requests
app.listen(3000, ()=>{
    console.log("Running on port 3000...")
});
