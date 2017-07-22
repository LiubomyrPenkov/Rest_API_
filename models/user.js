const mongoose = require('mongoose');

//use it for check if email is unique
const uniqueValidator = require('mongoose-unique-validator');


//user Schema
const userSchema = mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Name is required'],
        lowercase: true,
        unique: true
    },
    password: {
        type: String,
        required: [true, 'Password is required']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        uniqueCaseInsensitive: true
    },
    role: {
        type: String,
        required: [true, 'Role is required']
    }
});

userSchema.plugin(uniqueValidator);
const User = mongoose.model('user', userSchema, 'users');
module.exports = User;
