const express = require('express');
const router = express.Router();

//bring in routes
const User = require('../../models/user');
const Group = require('../../models/group');

const Joi = require('joi');

router.route('/users')
    //get user
    .get((req, res, next) => {
        //check if request query was sent
        if (Object.keys(req.query).length) {
            //validation request query data + return promise
            function validate(req) {
                return new Promise((resolve, reject) => {
                    const schema = Joi.object().keys({
                        role: Joi.string().valid("admin", "user", "superadmin").min(3).max(30).required()
                    });
                    const result = Joi.validate(req.query, schema);
                    if (result.error) {
                        reject(result.error);
                    } else {
                        resolve(result);
                    }
                })
            }
            validate(req)
                //find all users where "role":req.query.role
                .then(() => User.find({ "role": req.query.role }))
                .then((users) => {
                    res.status(200).json(users);
                })
                .catch((err) => { next(err) });
        } else {
            User.find({}).exec()
                .then((users) => {
                    res.status(200).json(users);
                })
                .catch((err) => { next(err) });
        }
    })
    .post((req, res, next) => {
        //post user
        function validate(req) {
            //validation req.body + return promise
            return new Promise((resolve, reject) => {
                const schema = Joi.object().keys({
                    username: Joi.string().alphanum().min(4).max(20).required(),
                    password: Joi.string().alphanum().min(8).max(20).required(),
                    email: Joi.string().email().required(),
                    role: Joi.string().valid("admin", "user", "superadmin").min(3).max(15).required()
                });
                const result = Joi.validate(req.body, schema);
                if (result.error) {
                    next(new Error(result.error.message));
                } else {
                    resolve(result);
                }
            })
        }
        validate(req)
            //check if username already exists
            .then(() => User.find({ "username": req.body.username }))
            .then((users) => {
                if (users.length) {
                    next(new Error("User already exists, please choose another user's name"));
                }
            })
            //if username doesn't exist - create
            .then(() => User.create(req.body))
            .then((user) => res.status(201).json(user))
            .catch((err) => { next(err) });
    });
router.route('/users/:_id')
    //get user by id
    .get((req, res, next) => {
        User.find({ "_id": req.params._id }).exec()
            .then((user) => { res.status(200).json(user) })
            .catch((err) => { next(err) })
    })
    //delete user by id
    .delete((req, res, next) => {
        //check if this user is superadmin
        User.find({ "_id": req.params._id, "role": "superadmin" })
            .then((users) => {
                //check if it's the last superadmin
                return new Promise((resolve, reject) => {
                    if (users.length === 1) {
                        //if it's the last superadmin - error - cancel deletion
                        next(new Error("It must be at least one superadmin"));
                    } else {
                        resolve();
                    }
                })
            })
            //delete user
            .then(() => User.remove({ "_id": req.params._id }))
            //delete user's id from groups
            .then(() => Group.update({}, { $pull: { "participants": { $in: [req.params._id] } } }, { multi: true }))
            .then((groups) => { res.status(200).json({ "message": "the user is deleted" }) })
            .catch((err) => { next(err) })
    })
        //update user
    .patch((req, res, next) => {
        //req.body validation
        function validate(req) {
            return new Promise((resolve, reject) => {
                const schema = Joi.object().keys({
                    username: Joi.string().alphanum().min(4).max(20),
                    password: Joi.string().alphanum().min(8).max(20),
                    email: Joi.string().email(),
                    role: Joi.string().valid("admin", "user", "superadmin").min(3).max(15)
                });
                const result = Joi.validate(req.body, schema);
                if (result.error) {
                    next(new Error(result.error.message));
                } else {
                    resolve(result);
                }
            })
        }
        validate(req)
            .then(() => {
                //check how many superadmins there are
                if (req.body.role === "superadmin") {
                    User.find({ "role": "superadmin" }).exec()
                        .then((user) => {
                            return new Promise((resolve, reject) => {
                                if (user.length === 2) {
                                    next(new Error("cann't be more than two superadmin"));
                                } else {
                                    resolve();
                                }
                            })
                        })
                        .then(() => User.update({ "_id": req.params._id }, { $set: req.body }, { new: true }))
                        .then((user) => { res.status(200).json({ "message": "user is updated" }) })
                        .catch((err) => { next(err) })
                } else {
                    User.update({ "_id": req.params._id }, { $set: req.body }, { new: true })
                        .then((user) => { res.status(200).json({ "message": "user is updated" }) })
                        .catch((err) => { next(err) })
                }
            })
            .catch((err) => { next(err) })
    });
module.exports = router;
