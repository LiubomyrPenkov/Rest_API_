const express = require('express');
const router = express.Router();
const User = require('../../models/user');
const Group = require('../../models/group');
const Joi = require('joi');

router.route('/groups')
    .get((req, res, next) => {
        Group.find({}).exec()
            .then((users) => res.json(users))
            .catch((err) => { next(err) })
    })
    .post((req, res, next) => {
        function validate(req) {
            return new Promise((resolve, reject) => {
                const schema = Joi.object().keys({
                    name: Joi.string().alphanum().min(4).max(20).required(),
                    participants: Joi.array().min(1).unique().required()
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
            .then(() => Group.find({ "name": `${req.body.name.toLowerCase()}` }))
            .then((groups) => {
                if (groups.length) {
                    next(new Error("Group already exists"));
                }
            })
            .then(() => {
                let users = req.body.participants.filter((user) => {
                    let a = User.find({ "_id": user });
                    return !a._castError;
                })
                return users;
            })
            .then((users) => {
                return new Promise((resolve, reject) => {
                    if (!users.length) {
                        next(new Error("Type existing users"));
                    } else {
                        resolve(users);
                    }
                })
            })
            .then((users) => Group.create({ "name": req.body.name, "participants": users }))
            .then((group) => res.status(201).json(group))
            .catch((err) => { next(err) });
    });
router.route('/groups/:_id')
    .get((req, res, next) => {
        Group.find({"_id" :req.params._id}).exec()
            .then((group) => { res.status(200).json(group) })
            .catch((err) => { next(err) })
    })
    .delete((req, res, next) => {
        Group.remove({ "_id": req.params._id }).exec()
            .then(() => { res.status(200).json({"message" : "the group is deleted"}) })
            .catch((err) => { next(err) })
    })
    .patch((req, res, next) => {
        function validate(req) {
            return new Promise((resolve, reject) => {
                const schema = Joi.object().keys({
                    name: Joi.string().alphanum().min(4).max(20),
                    newParticipant: Joi.string().alphanum().min(10),
                    add: Joi.boolean().default(true)
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
                return new Promise((resolve, reject) => {
                    if (req.body.newParticipant) {
                        if (req.body.add) {
                            Group.update({ "_id": req.params._id }, { $push: { "participants": [req.body.newParticipant] } });
                            resolve();
                        } else {
                            Group.update({ "_id": req.params._id }, { $pull: { "participants": [req.body.newParticipant] } });
                            resolve();
                        }
                    } else {
                        resolve();
                    }
                })
            })
            .then(() => {
                return new Promise((resolve, reject) => {
                    if (req.body.name) {
                        Group.update({ "_id": req.params._id }, { "name": req.body.name });
                    } else {
                        resolve()
                    }
                })
            })
            .then(()=>res.status(200).json({"message": "group is updated"}))
            .catch((err)=>{next(err)})
    });
module.exports = router;
