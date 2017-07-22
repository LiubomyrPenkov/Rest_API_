const express = require('express');
const router = express.Router();
const Joi = require('joi');

//bring in routes
const User = require('../../models/user');
const Group = require('../../models/group');

router.route('/groups')
    //get all groups
    .get((req, res, next) => {
        Group.find({})
            .exec()
            .then((users) => res.status(200).json(users))
            .catch((err) => { next(err) })
    })
    //create group
    .post((req, res, next) => {
        //validation req.body
        const schema = Joi.object().keys({
            name: Joi.string().alphanum().min(4).max(20).required(),
            participants: Joi.array().min(1).unique().required()
        });
        const result = Joi.validate(req.body, schema);
        if (result.error) {
            next(result.error);
        }
        //check if a group with the same name already exists
        Group.count({ "name": `${req.body.name.toLowerCase()}` })
            .exec()
            .then((groups) => {
                //if exists - error
                if (groups) {
                    throw new Error("Group already exists");
                }
            })
            // if not exist - filter array(check if there are users with the same IDs as in this array)
            .then(() => {
                let users = req.body.participants.filter((user) => {
                    let a = User.find({ "_id": user });
                    return !a._castError; //if user exists a._castError===null, if not - !!a._castError === true 
                })
                return users;
            })
            .then((users) => {
                //check the filtered array's length
                if (!users.length) {
                    throw new Error("Type existing users");
                } else {
                    return users;
                }
            })
            //create group
            .then((users) => Group.create({ "name": req.body.name, "participants": users }))
            .then((group) => res.status(201).json(group))
            .catch((err) => { next(err) });
    });
router.route('/groups/:_id')
    //get group by id
    .get((req, res, next) => {
        Group.find({ "_id": req.params._id })
            .exec()
            .then((group) => { res.status(200).json(group) })
            .catch((err) => { next(err) })
    })
    //delete group
    .delete((req, res, next) => {
        Group.remove({ "_id": req.params._id })
            .exec()
            .then(() => { res.status(200).json({ "message": "the group is deleted" }) })
            .catch((err) => { next(err) })
    })
    //update group
    .patch((req, res, next) => {
        //req.body validation(operation is required)
        const schema = Joi.object().keys({
            name: Joi.string().alphanum().min(4).max(20),
            participant: Joi.string().alphanum().min(10),
            operation: Joi.string().valid("add", "remove").required()
        })
        const result = Joi.validate(req.body, schema);
        if (result.error) {
            next(result.error);
        }
        //if participant was sent
        if (req.body.participant) {
            //check which operation must be done
            if (req.body.operation === "add") {
                //if operation === "add" -> check if user already is a member of this group
                Group.count({ "_id": req.params._id, "participants": req.body.participant })
                    .exec()
                    .then((count) => {
                        // if yes -> throw error
                        if (count) {
                            throw new Error("User already is a member of this group");
                        }
                    })
                    //if not -> check if user with this id(req.body.participant) exists
                    .then(()=> User.count({"_id" : req.body.participant}))
                    .then((count)=>{
                        if(!count){
                            throw new Error("You can't insert non-existent user into participants")
                        }
                    })
                    //add new member
                    .then(() => Group.update({ "_id": req.params._id }, { $push: { "participants": req.body.participant } }))
                    //change group's name if it was sent
                    .then(() => {
                        if (req.body.name) {
                            Group.update({ "_id": req.params._id }, { "name": req.body.name }).exec();
                        }
                    })
                    .then(() => res.status(200).json({ "message": "group is updated" }))
                    .catch((err) => next(err));
            } else { //if operation === "remove"
                //check if user with sent id is a member of this group
                Group.count({ "_id": req.params._id, "participants": req.body.participant })
                    .exec()
                    .then((count) => {
                        //if not -> throw error
                        if (!count) {
                            throw new Error("This user isn't a member of this group,so you can't delete this user from the members");
                        }
                    })
                    //if yes -> remove user from the participants
                    .then(() => Group.update({ "_id": req.params._id }, { $pull: { "participants": req.body.participant } }))
                    .then(() => {
                        if (req.body.name) {
                            //change group's name if it was sent
                            Group.update({ "_id": req.params._id }, { "name": req.body.name }).exec();
                        }
                    })
                    .then(() => res.status(200).json({ "message": "group is updated" }))
                    .catch((err) => next(err));
            }
        //if group's name was sent(but participant wasn't)
        }else if(req.body.name){
            //change only group's name
            Group.update({ "_id": req.params._id }, { "name": req.body.name })
            .exec()
            .then(() => res.status(200).json({ "message": "group is updated" }))
            .catch((err) => next(err));
        //if neither group's name nor participant wasn't sent -> throw error
        }else{
            next(new Error("Either 'name' or 'participant' is required"));
        }
    });
module.exports = router;
