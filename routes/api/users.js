const express = require('express');
const router = express.Router();
const Joi = require('joi');

//bring in routes
const User = require('../../models/user');
const Group = require('../../models/group');


router.route('/users')
    //get users
    .get((req, res, next) => {
        //check if request query was sent
        if (Object.keys(req.query).length) {
            //validation request query data
            const schema = Joi.object().keys({
                role: Joi.string().valid("admin", "user", "superadmin").min(3).max(30).required()
            });
            const result = Joi.validate(req.query, schema);
            if (result.error) {
                next(result.error);
            }
            //find all users where "role":req.query.role
            User.find({ "role": req.query.role })
                .exec()
                .then((users) => {
                    res.status(200).json(users);
                })
                .catch((err) => next(err));
        } else {
            User.find({}).exec()
                .then((users) => {
                    res.status(200).json(users);
                })
                .catch((err) => next(err));
        }
    })
    //post user
    .post((req, res, next) => {
        //validation req.body
        const schema = Joi.object().keys({
            username: Joi.string().alphanum().min(4).max(20).required(),
            password: Joi.string().alphanum().min(8).max(20).required(),
            email: Joi.string().email().required(),
            role: Joi.string().valid("admin", "user", "superadmin").min(3).max(15).required()
        });
        const result = Joi.validate(req.body, schema);
        if (result.error) {
            next(result.error);
        }
        //check if username already exists
        User.count({ "username": req.body.username })
            .exec()
            .then((users) => {
                if (users) {
                    throw new Error("User already exists, please choose another user's name");
                }
            })
            .then(() => {
                if (req.body.role === "superadmin") {
                    return User.count({ "role": "superadmin" })
                }
            })
            .then((count) => {
                if (count == 2) {
                    throw new Error("can't be more than two superadmins")
                }
            })
            //if username doesn't exist - create
            .then(() => User.create(req.body))
            .then((user) => res.status(201).json(user))
            .catch((err) => next(err));
    })

router.route('/users/:_id')
    //get user by id
    .get((req, res, next) => {
        User.find({ "_id": req.params._id })
            .exec()
            .then((user) => { res.status(200).json(user) })
            .catch((err) => { next(err) })
    })
    //delete user by id
    .delete((req, res, next) => {
        //check if this user is superadmin
        User.find({ "_id": req.params._id, "role": "superadmin" })
            .exec()
            //check if it's the last superadmin
            .then((user) => {
                if (user.length) {
                    return User.count({ "role": "superadmin" });
                }
            })
            //if it's the last superadmin - error - cancel deletion
            .then((count) => {
                if (count === 1) {
                    throw new Error("It must be at least one superadmin");
                }
            })
            //delete user
            .then(() => User.remove({ "_id": req.params._id }))
            //delete user's id from groups
            .then(() => Group.update({}, { $pull: { "participants": { $in: req.params._id } } }, { multi: true }))
            .then(() => { res.status(200).json({ "message": "the user is deleted" }) })
            .catch((err) => { next(err) })
    })
    //update user
    .patch((req, res, next) => {
        //req.body validation
        const schema = Joi.object().keys({
            username: Joi.string().alphanum().min(4).max(20),
            password: Joi.string().alphanum().min(8).max(20),
            email: Joi.string().email(),
            role: Joi.string().valid("admin", "user", "superadmin").min(3).max(15)
        });
        const result = Joi.validate(req.body, schema);
        if (result.error) {
            next(result.error);
        }
        //check the "role" in request body + how many superadmins there are
        if (req.body.role === "superadmin") {
            User.count({ "role": "superadmin" })
                .exec()
                .then((users) => {
                    if (users === 2) {
                        throw new Error("can't be more than two superadmins");
                    }
                })
                .then(() => User.update({ "_id": req.params._id }, { $set: req.body }, { new: true }))
                .then((user) => { res.status(200).json({ "message": "user is updated" }) })
                .catch((err) => next(err));
        } else {
            //check if superadmin is wanted to be changed
            User.count({ "_id": req.params._id, "role": "superadmin" })
                .exec()
                .then((count) => {
                    if (count) {
                        //if it is superadmin - check how many superadmins there are
                        return User.count({ "role": "superadmin" })
                    }
                })
                .then((count) => {
                    //if it's the last superadmin - cancel updation
                    if (count === 1) {
                        throw new Error("Can't change this user, because it must be at least one superadmin ")
                    }
                })
                .then(() => User.update({ "_id": req.params._id }, { $set: req.body }, { new: true }))
                .then((user) => { res.status(200).json({ "message": "user is updated" }) })
                .catch((err) => { next(err) })
        }
    });
module.exports = router;
