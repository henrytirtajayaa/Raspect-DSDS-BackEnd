import mongoose from "mongoose";
import {ROLES, TEAM_ROLES} from '../constant/role.mjs';

const filterSchema = new mongoose.Schema({
    _id: false,
    surveyId: [String],
    surveyDateRange: [Date],
    signboardId: [String],
    fileRef: [String],
    headroom: [Number],
    projection: [Number],
    signboardType: String,
    defectTypes: [String],
    areaCode: [String],
    englishAddress: [String],
    revisionStatus: {},
    dsrnHandling: {}
});

const sortSchema = new mongoose.Schema({
    _id: false,
    surveyId: Number,
    surveyDateRange: Number,
    signboardId: Number,
    fileRef: String,
    signboardType: String,
    areaCode: Number,
    englishAddress: Number
});

const userSchema = new mongoose.Schema({
    staffId: {
        type: String,
        unique: true
    },
    password: String,
    role: {
        type: String, 
        default: ROLES.ROLE_STANDARD
    },
    post: {
        type: String,
        unique: true
    },
    chineseName: String,
    englishName: String,
    phoneNumber: String,
    resetPwdCode: String,
    resetPwdSentAt: Date,
    archived: {type: Boolean, default: false},
    refreshTokens: [{
        _id: false,
        token: String,
        expire: {type: Date, default: Date.now}
    }],
    savedFilters: [{
        name: String,
        filter: filterSchema,
        display: {
            type: [String]
        },
        sort: sortSchema,
        createdAt: {type: Date, default: Date.now}
    }]
}, {timestamps: true});

export default userSchema;
