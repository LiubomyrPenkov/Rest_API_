const mongoose = require('mongoose');

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
        required: [true, 'Email is required']
    },
    role: {
        type: String,
        required: [true, 'Role is required']
    }
});

const User = mongoose.model('user', userSchema, 'users');
module.exports = User;
