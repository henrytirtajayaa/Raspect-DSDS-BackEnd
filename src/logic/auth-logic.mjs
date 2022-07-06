import getConnection from "../model/connection-factory.mjs";
import bcrypt from 'bcrypt';
import config from 'config';
import randtoken from 'rand-token';
import jwt from 'jsonwebtoken';
import moment from "moment";
import _ from 'lodash';
import {ROLES} from "../constant/role.mjs";
import permission from "../constant/permission.mjs";
import { validatePassword, sendEmail } from "../utils/email-utils.mjs";

const SALT_ROUNDS = 10;


async function genAccessTokenAndRefreshToken(user, refreshTokenToBeRemoved, rememberMe = false) {
    const JWT_SECRET = config.get("auth.jwtSecret")[0];
    const JWT_ISSUER = config.get("auth.jwtIssuer");
    const ACCESS_TOKEN_LIFETIME = user.role === ROLES.ROLE_API? config.get("auth.apiAccessTokenLifetime"): config.get("auth.accessTokenLifetime");
    const REFRESH_TOKEN_LIFETIME = config.get("auth.refreshTokenLifetime");
    const REFRESH_TOKEN_LIFETIME_SHORT = config.get("auth.refreshTokenLifetimeShort");
    const accessToken = jwt.sign({
        _id: user.id || user._id,
        staffId: user.staffId,
        role: user.role,
        post: user.post,
        permissions: permission[user.role],
    }, JWT_SECRET, {
        issuer: JWT_ISSUER,
        expiresIn: ACCESS_TOKEN_LIFETIME
    });
    let refreshToken = randtoken.uid(256);
    // Insert new refresh token and pull expired one
    const db = await getConnection();
    const User = db.model('User');
    const maxAge = rememberMe ? REFRESH_TOKEN_LIFETIME * 1000 : REFRESH_TOKEN_LIFETIME_SHORT * 1000
    await User.bulkWrite([
        {
            updateOne: {
                filter: {_id: user._id},
                update: {
                    $push: {
                        refreshTokens: {
                            token: refreshToken,
                            expire: moment().add(maxAge, 's').toDate()
                        }
                    }
                }
            }
        },
        {
            updateOne: {
                filter: {_id: user._id},
                update: {
                    $pull: {
                        refreshTokens: {
                            $or: [
                                { expire: {$lte: moment().toDate()} },
                                { token: refreshTokenToBeRemoved },
                            ]
                        }
                    }
                }
            }
        }
    ]);
    return {
        accessToken,
        refreshToken,
    }
}

export async function login(staffId, password, rememberMe = false) {
    const db = await getConnection();
    const User = db.model('User');
    let user = await User.findOne({
        staffId,
        archived: false
    }, {
        _id: 1, role: 1, staffId: 1, password: 1, post: 1
    });
    if (user === null) {
        throw new Error('Account does not exist');
    }

    let compareRes = await bcrypt.compare(password, user.password);
    if (compareRes) {
        let tokenPair = await genAccessTokenAndRefreshToken(user, rememberMe);
        return {
            ...tokenPair,
            userId: user._id,
        }
    } else {
        throw new Error('Password incorrect');
    }
}

export async function logout(userId, refreshToken) {
    const db = await getConnection();
    const User = db.model('User');
    let tokenRemoved = true;
    try {
        const result = await User.updateOne({
            _id: userId
        }, {
            $pull: {
                refreshTokens: {
                    $or: [
                        {expire: {$lte: moment().toDate()}},
                        {token: refreshToken}
                    ]
                }
            }
        });
        tokenRemoved = (result.nModified  === 1);
    } catch (e) {
        tokenRemoved = false;
    }
    return {
        refreshTokenRemoved: tokenRemoved,
    };
}

export async function refreshAccessToken(userId, refreshToken) {
    if (userId == null || refreshToken == null) {
        throw new Error('Missing userId and refreshToken')
    }

    const db = await getConnection();
    const User = db.model('User');
    let user = await User.findOne({
        _id: userId,
        archived: false
    }, {
        _id: 1, role: 1, staffId: 1, refreshTokens: 1, post: 1
    });
    if (user == null) {
        throw new Error('User not found')
    }

    let validToken = _.find(user.refreshTokens, (token) => {
        return (token.token === refreshToken && token.expire > Date.now());
    });

    if (validToken) {
        const tokenPair = await genAccessTokenAndRefreshToken(user, validToken.token)
        return tokenPair;
    } else {
        throw new Error('Invalid refresh token')
    }
}

export async function requestPasswordReset(staffId) {
    const db = await getConnection();
    const User = db.model('User');
    const user = await User.findOne({
        staffId,
        archived: false,
    }, {
        resetPwdSentAt: 1
    });
    if (!user) throw new Error('User not found');
    if (user.resetPwdSentAt && moment().diff(moment(user.resetPwdSentAt), 'second') < 900) {
        throw new Error('Reset password too frequent');
    }
    const updated = await User.findOneAndUpdate({
        staffId
    }, {
        resetPwdCode: randtoken.generate(6),
        resetPwdSentAt: moment(),
    }, {
        new: true
    });
}

export async function getPasswordResetCode(staffId) {
    const db = await getConnection();
    const User = db.model('User');
    const user = await User.findOne({staffId});
    return user.resetPwdCode;
}

export async function resetPassword(staffId, resetCode, newPassword) {
    const db = await getConnection();
    const User = db.model('User');
    const user = await User.findOne({
        staffId,
        archived: false,
    }, {
        resetPwdSentAt: 1,
        resetPwdCode: 1,
    }).exec();
    if (!user) throw new Error('User not found');
    if(!validatePassword(newPassword)){
        throw new Error('Please input at least 8 characters for password');
    }
    if (user.resetPwdSentAt && moment().diff(moment(user.resetPwdSentAt), 'second') < 900) {
        if (user.resetPwdCode === resetCode) {
            await updatePassword(staffId, newPassword);
        } else {
            throw new Error('Invalid reset code')
        }
    } else {
        throw new Error('Reset code expired');
    }
}

export async function updatePassword(staffId, newPassword){
    const db = await getConnection();
    const User = db.model('User');
    await User.updateOne({
        staffId
    }, {
        password: await bcrypt.hash(newPassword, SALT_ROUNDS),
        resetPwdCode: null,
        resetPwdSentAt: null,
    }, {
        new: true
    });
}

export async function processForgotPwdToken(forgotPwdToken){
    if(!forgotPwdToken){
        throw new Error('Reset Password link is invalid');
    }
    try {
        const forgotPwdInfo = await jwtVerifyToken(forgotPwdToken);
        return {
            staffId: forgotPwdInfo.staffId,
            resetPwdCode: forgotPwdInfo.resetPwdCode,
        }
    } catch (err) {
        throw new Error('Reset Password link is expired. Please reset again.' + err);
    }
}

async function jwtVerifyToken(forgotPwdToken){
    const JWT_SECRET = config.get("auth.jwtSecret")[0];
    return new Promise((resolve, reject) => {
        jwt.verify(forgotPwdToken,
            JWT_SECRET,
            (err, decoded) => {
                if (err) {
                    return reject(err);
                } else {
                    return resolve(decoded);
                }
            });
    });
}

export async function contactUs(data){
    if(data.message){
        data.message = data.message.replace(/\n/g, '<br>');
    }
    let tags = {
        name: 'Name',
        email: 'Email',
        topic: 'Topic',
        message: 'Message'
    };

    let content = Object.keys(data).slice(0, -1).map(key => `${tags[key]}: ${data[key]}`).join('<br><br>');
    content += '<br><br>' + tags.message + ':<br><br>' + data.message;
    const SUPPORT_EMAIL = config.get("web.supportEmail");
    await sendEmail(SUPPORT_EMAIL, SUPPORT_EMAIL, "Contact Us", {html: content});
}