import getConnection from "../model/connection-factory.mjs";
import _ from 'lodash';
import bcrypt from "bcrypt";
import {ROLES} from '../constant/role.mjs';
import {validateEmail, validatePassword} from '../utils/email-utils.mjs';
import mongoose from "mongoose"; 

const SALT_ROUNDS = 10;

export async function createUser(input) {
    const sanitizedUser = _.omit(input, 'resetPwdCode', 'resetPwdSentAt', 'createdAt', 'updatedAt', 'refreshTokens', 'archived');
    if(_.isEmpty(_.get(sanitizedUser, 'staffId')) || _.isEmpty(_.get(sanitizedUser, 'password'))){
        throw new Error('Email or password cannot be empty');
    }
    if(!validateEmail(sanitizedUser['staffId'])){
        throw new Error('Please enter email correctly');
    }
    if(!validatePassword(sanitizedUser['password'])){
        throw new Error('Please input at least 8 characters');
    }
    const db = await getConnection();
    const User = db.model('User');
    const isExist = await User.exists({
        staffId: sanitizedUser['staffId']
    });
    if(isExist){
        throw new Error("User already exists with this email");
    }
    const user = new User({
        ...sanitizedUser,
        password: await bcrypt.hash(sanitizedUser.password, SALT_ROUNDS)
    });
    await user.save();
    return user;
}

export async function findUserByStaffId(staffId) {
    const db = await getConnection();
    const User = db.model('User');
    const user = await User.findOne({
        staffId,
    })
    return user? user.toObject(): user;
}

export async function deleteUser(staffId) {
    const db = await getConnection();
    const User = db.model('User');
    const deletedUser = await User.findOneAndDelete({
        staffId,
    });
    return deletedUser;
}

export async function changeUserRole(staffId, newRole) {
    const db = await getConnection();
    const User = db.model('User');
    if (!_.values(ROLES).includes(newRole)) {
        throw new Error('Invalid Role');
    }
    const updatedUser = await User.findOneAndUpdate({
        staffId
    }, {
        role: newRole
    }, {
        new: true
    });
    return updatedUser;
}

export async function activateUser(staffId, isActive) {
    const db = await getConnection();
    const User = db.model('User');
    const updatedUser = await User.findOneAndUpdate({
        staffId
    }, {
        archived: !isActive
    }, {
        new: true
    });
    return updatedUser;
}

export async function findUser(userId) {
    const db = await getConnection();
    const User = db.model('User');
    return await User.findOne({
        _id: mongoose.Types.ObjectId(userId)
    },{
        userId: "$_id",
        role: 1,
        staffId: 1,
        post: 1,
        chineseName: 1,
        englishName: 1,
        phoneNumber: 1
    });
}

export async function getAllUsers() {
    const db = await getConnection();
    const User = db.model('User');
    return await User.find({
        role: {
            $not: {
                $eq: ROLES.ROLE_API
            }
        }
    },{
        userId: "$_id",
        role: 1,
        staffId: 1,
        post: 1,
        chineseName: 1,
        englishName: 1,
        phoneNumber: 1
    });
}

export async function updateUser(userId, updateParams) {
    const db = await getConnection();
    const User = db.model('User');
    updateParams = _.omit(updateParams, '_id', 'staffId', 'resetPwdCode', 'resetPwdSentAt', 'createdAt', 'updatedAt', 'refreshTokens', 'archived', 'password');
    return await User.findOneAndUpdate({
        _id: userId
    }, updateParams, { 
        projection: {
            userId: "$_id",
            role: 1,
            staffId: 1,
            post: 1,
            chineseName: 1,
            englishName: 1,
            phoneNumber: 1
        },
        new: true 
    });
}

export async function filterUsers(searchString){
    if(searchString){
        const db = await getConnection();
        const User = db.model('User');
        const user = await User.find({
            post: new RegExp(searchString, "gi"),
        },{
            post: 1
        });
        return user.map(user => user.post);
    } else {
        return [];
    }
}

export async function getFilters(userId){
    const db = await getConnection();
    const User = db.model('User');
    const updatedUser = await User.findOne({
        _id: userId
    }, {

    }, {
        projection: {
            savedFilters: 1
        }
    });
    return updatedUser;
}

export async function addFilter(userId, newFilter){
    const db = await getConnection();
    const User = db.model('User');
    const updatedUser = await User.findOneAndUpdate({
        _id: userId
    }, {
        $push: {
            savedFilters: newFilter
        }
    }, {
        projection: {
            savedFilters: 1
        },
        new: true
    });
    return updatedUser;
}

export async function removeFilter(userId, filterId){
    const db = await getConnection();
    const User = db.model('User');
    const updatedUser = await User.findOneAndUpdate({
        _id: userId
    }, {
        $pull: {
            'savedFilters': {
                _id: filterId
            }
        }
    }, {
        projection: {
            savedFilters: 1
        },
        new: true
    });
    return updatedUser;
}

export async function updateFilter(userId, filterId, body){
    const db = await getConnection();
    const User = db.model('User');
    const updatedUser = await User.findOneAndUpdate({
        _id: userId,
        savedFilters: {
            $elemMatch: {
                _id: filterId
            }
        }
    }, {
        $set: {
            'savedFilters.$': Object.assign(body, {
                _id: filterId
            })
        }
    }, {
        projection: {
            savedFilters: 1
        },
        new: true
    });
    return updatedUser;
}

