const mongoose = require('mongoose');

function validateGroup(arr){
    return arr.length !==0;
}
//group Schema
const groupSchema = mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        lowercase: true
    },
    participants: {
        type: [String],
        validate: [validateGroup, 'Group must have at least one participant'],
        require: true
    }
});

const Group = mongoose.model('group', groupSchema, 'groups');
module.exports = Group;
