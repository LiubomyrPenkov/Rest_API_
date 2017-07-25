const express = require('express');
const router = express.Router();
const Joi = require('joi');

//bring in routes
const User = require('../../models/user');
const Group = require('../../models/group');

router.route('/groups')
    //get all groups
    .get(async (req, res, next) => {
        try {
            res.status(200).json(await Group.find({}).exec());
        } catch (err) {
            next(err);
        }
    })
    //create group
    .post(async (req, res, next) => {
        //validation req.body
        const schema = Joi.object().keys({
            name: Joi.string().alphanum().min(4).max(20).required(),
            participants: Joi.array().min(1).unique().required()
        });
        const result = Joi.validate(req.body, schema);
        if (result.error) {
            next(result.error);
        }
        try {
            //check if a group with the same name already exists
            const group = await Group.count({ "name": req.body.name.toLowerCase() }).exec()
            //if exists -> error
            if (group) {
                throw new Error("Group already exists");
            }
            // if not exist - filter array(check if there are users with the same IDs as in this array)
            let users = req.body.participants.filter((user) => {
                let a = User.find({ "_id": user }).exec();
                return !a._castError; //if user exists a._castError===null, if not - !!a._castError === true 
            })
            //check the filtered array's length
            if (!users.length) {
                throw new Error("Type existing users");
            }
            //create group
            res.status(201).json(await Group.create({ "name": req.body.name, "participants": users }));
        } catch (err) {
            next(err)
        };
    });
router.route('/groups/:_id')
    //get group by id
    .get(async (req, res, next) => {
        try {
            res.status(200).json(await Group.find({ "_id": req.params._id }).exec());
        } catch (err) {
            next(err)
        };
    })
    //delete group
    .delete(async (req, res, next) => {
        try {
            if (req.user[0].role === 'user') { throw new Error("Only superadmin or admin can delete a group") }
            await Group.remove({ "_id": req.params._id }).exec();
            res.status(200).json({ "message": "the group is deleted" });
        } catch (err) {
            next(err)
        };
    })
    //update group
    .patch(async (req, res, next) => {
        //req.body validation(operation is required)
        const schema = Joi.object().keys({
            name: Joi.string().alphanum().min(4).max(20),
            participants: Joi.array().min(1).unique()
        })
        const result = Joi.validate(req.body, schema);
        if (result.error) {
            next(result.error);
        }
        try {
            //if participants were sent
            if (req.body.participants) {
                //filter array(check if there are users with the same IDs as in this array)
                let users = req.body.participants.filter(async (user) => {
                    let a = await User.find({ "_id": user }).exec();
                    return !a._castError; //if user exists a._castError===null, if not - !!a._castError === true 
                })
                //check the filtered array's length
                if (!users.length) {
                    throw new Error("Type existing users");
                }
                await Group.update({ '_id': req.params._id }, { 'participants': users }).exec();
            }
            //change group's name if it was sent
            if (req.body.name) {
                await Group.update({ "_id": req.params._id }, { "name": req.body.name }).exec();
            }
            res.status(200).json({ "message": "group is updated" });
        } catch (err) {
            next(err)
        };
    });
router.route('/groups/:_id/participants')
    //get list of group's(width this _id) members 
    .get(async (req, res, next) => {
        try {
            res.status(200).json(await Group.find({ "_id": req.params._id }, { "participants": 1, "_id": 0 }).exec());
        } catch (err) {
            next(err)
        };
    })
    .post(async (req, res, next) => {
        //validation req.body
        const schema = Joi.object().keys({
            participant: Joi.string().alphanum().min(10).required()
        })
        const result = Joi.validate(req.body, schema);
        if (result.error) {
            next(result.error);
        }
        try {
            //check if autorized user want to add oneself into the group(if yes -> allow addition)->if not - 
            //check if autorized user is superadmin -> if not - throw Error
            if (req.user[0].id !== req.body.participants && req.user[0].role !== 'superadmin') {
                throw new Error("Only superadmin can add another users into groups")
            }
            //check if user already is a member of this group
            let count = await Group.count({ "_id": req.params._id, "participants": req.body.participant });
            // if yes -> throw error
            if (count) {
                throw new Error("User already is a member of this group");
            }
            //check if user with this id(req.body.participant) exists
            count = await User.count({ '_id': req.body.participant })
            if (!count) {
                throw new Error("You can't insert non-existent user into participants")
            }
            await Group.update({ "_id": req.params._id }, { $push: { "participants": req.body.participant } })
            res.status(200).json({ "message": "user is added" })
        } catch (err) {
            next(err);
        }
    })
    .delete(async (req, res, next) => {
        //validation req.body
        const schema = Joi.object().keys({
            participant: Joi.string().alphanum().min(10).required()
        })
        const result = Joi.validate(req.body, schema);
        if (result.error) {
            next(result.error);
        }
        try {
            //check if autorized user want to delete oneself from the group(if yes -> allow addition)->if not - 
            //check if autorized user is superadmin -> if not - throw Error
            if (req.user[0].id !== req.body.participants && req.user[0].role !== 'superadmin') {
                throw new Error("Only superadmin can add another users into groups")
            }
            //check if user already is a member of this group
            let count = await Group.count({ "_id": req.params._id, "participants": req.body.participant });
            // if not -> throw error
            if (!count) {
                throw new Error("This user isn't a member of this group,so you can't delete this user from the members");
            }
            await Group.update({ "_id": req.params._id }, { $pull: { "participants": req.body.participant } })
            res.status(200).json({ "message": "user is deleted" })
        } catch (err) {
            next(err);
        }
    })

module.exports = router;
