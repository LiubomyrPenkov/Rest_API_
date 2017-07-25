const express = require('express');
const router = express.Router();
const Joi = require('joi');

//bring in routes
const User = require('../../models/user');
const Group = require('../../models/group');

router.route('/users')
    //get users
    .get(async (req, res, next) => {
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
            try {
                res.status(200).json(await User.find({ "role": req.query.role }).exec());
            } catch (err) {
                next(err);
            }
        } else {
            try {
                res.status(200).json(await User.find({}).exec());
            } catch (err) {
                next(err);
            }
        }
    })
    //post user
    .post(async (req, res, next) => {
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
        try {
            //check if username already exists
            const userCount = await User.count({ "username": req.body.username }).exec();
            if (userCount) {
                throw new Error("User already exists, please choose another user's name");
            }
            if (req.body.role === "superadmin") {
                if (req.user[0].role !== 'superadmin') { throw new Error("Only superadmin can create another superadmin") };
                //check how many superadmins there are
                const superCount = await User.count({ "role": "superadmin" }).exec();
                if (superCount == 2) { throw new Error("can't be more than two superadmins") }
            }
            res.status(201).json(await User.create(req.body));
        } catch (err) {
            next(err)
        }
    })

router.route('/users/:_id')
    //get user by id
    .get(async (req, res, next) => {
        try {
            res.status(200).json(await User.find({ "_id": req.params._id }).exec())
        } catch (err) {
            next(err);
        }
    })
    //delete user by id
    .delete(async (req, res, next) => {
        try {
            //check if autorized user want to delete oneself(if yes -> allow deletion)->if not - check if 
            //autorzed user is admin or superadmin -> if not - throw Error
            if (req.user[0].id !== req.params._id && req.user[0].role === 'user') {
                throw new Error("Only admin or superadmin can delete another user")
            }
            //check if this user is superadmin
            const user = await User.find({ "_id": req.params._id, "role": "superadmin" }).exec();
            if (user.length) {
                //check if autorized user is superadmin
                if (req.user[0].role !== 'superadmin') { throw new Error("Only superadmin can delete another superadmin") };
                const superCount = await User.count({ "role": "superadmin" }).exec();
                //check if it's the last superadmin
                if (superCount === 1) { throw new Error("It must be at least one superadmin"); }
            }
            //delete user
            await User.remove({ "_id": req.params._id }).exec();
            //delete user's id from groups
            await Group.update({}, { $pull: { "participants": { $in: req.params._id } } }, { multi: true }).exec();
            res.status(200).json({ "message": "the user is deleted" });
        } catch (err) {
            next(err);
        }
    })
    //update user
    .patch(async (req, res, next) => {
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
        try {
            //check if autorized user want to change oneself(if yes -> allow changes)->if not - check if 
            //              autorized user is admin or superadmin -> if not - throw Error
            if (req.user[0].id !== req.params._id && req.user[0].role === 'user') {
                throw new Error("Only admin or superadmin can change another user")
            }
            //check the "role" in request body + how many superadmins there are
            if (req.body.role === "superadmin") {
                //check authorized user's role
                if (req.user[0].role !== 'superadmin') { throw new Error("Only superadmin can create another superadmin") }
                const usersCount = await User.count({ "role": "superadmin" }).exec();
                const isSuper = await User.count({ _id: req.params._id, "role": "superadmin" }).exec();
                if (usersCount === 2 && !isSuper) {
                    throw new Error("can't be more than two superadmins");
                }
                await User.update({ "_id": req.params._id }, { $set: req.body }, { new: true }).exec();
                res.status(200).json({ "message": "user is updated" })
            } else {
                //check if superadmin is wanted to be changed
                const count = await User.count({ "_id": req.params._id, "role": "superadmin" }).exec();
                if (count) {
                    //if it is superadmin -> check authorized user's role
                    if (req.user[0].role !== 'superadmin') { throw new Error("Only superadmin can change another superadmin") };
                    //check how many superadmins there are
                    const count = await User.count({ "role": "superadmin" }).exec();
                    //if it's the last superadmin - cancel updation
                    if (count === 1) {
                        throw new Error("Can't change this user, because it must be at least one superadmin ")
                    }
                }
                await User.update({ "_id": req.params._id }, { $set: req.body }, { new: true }).exec();
                res.status(200).json({ "message": "user is updated" });
            }
        } catch (err) {
            next(err);
        }
    });
module.exports = router;
