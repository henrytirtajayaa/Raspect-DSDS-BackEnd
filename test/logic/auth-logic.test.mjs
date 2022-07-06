import { createUser } from "../../src/logic/user-mgmt-logic.mjs";
import test from "ava";
import {login, logout, refreshAccessToken, requestPasswordReset, resetPassword} from "../../src/logic/auth-logic.mjs";
import {createMockUser, deleteMockUser} from "./mock-data-helper.mjs";
import getConnection from "../../src/model/connection-factory.mjs";

async function getPasswordResetCode(staffId) {
    const db = await getConnection();
    const User = db.model('User');
    const user = await User.findOne({staffId});
    return user.resetPwdCode;
}


test.serial.before(async t => {
    await createMockUser();
})

test.serial.after(async t => {
    await deleteMockUser();
})

test.serial('Login success with correct info', async t => {
    const token = await login('andy.yeung@raspect.ai', 'password');
    t.truthy(token.accessToken);
    t.truthy(token.refreshToken);
});

test.serial('Login failed with incorrect password', async t => {
    await t.throwsAsync(async () => {
        const token = await login('andy.yeung@raspect.ai', 'password1');
    }, {message: 'Password incorrect'});
});

test.serial('Login failed with non exist user', async t => {
    await t.throwsAsync(async () => {
        const token = await login('andy.yeung1@raspect.ai', 'password1');
    }, {message: 'Account does not exist'});
});

test.serial('Logout with correct info', async t => {
    const token = await login('andy.yeung@raspect.ai', 'password');
    const result = await logout(token.userId, token.refreshToken);
    t.truthy(result.refreshTokenRemoved);
});

test.serial('Logout with incorrect info', async t => {
    const token = await login('andy.yeung@raspect.ai', 'password');
    const result = await logout('123454323423432234322343', token.refreshToken);
    t.falsy(result.refreshTokenRemoved);
});

test.serial('Login and refresh token successfully', async t => {
    const token = await login('andy.yeung@raspect.ai', 'password');
    const newToken = await refreshAccessToken(token.userId, token.refreshToken);
    t.truthy(newToken.accessToken);
    t.truthy(newToken.refreshToken);
});

test.serial('Should not able to use refresh token twice', async t => {
    const token = await login('andy.yeung@raspect.ai', 'password');
    const newToken = await refreshAccessToken(token.userId, token.refreshToken);
    await t.throwsAsync(async () => {
        const newToken2 = await refreshAccessToken(token.userId, token.refreshToken);
    }, {message: 'Invalid refresh token'});
});

test.serial('Should not able to steal other users session', async t => {
    const tokenAndy = await login('andy.yeung@raspect.ai', 'password');
    const tokenHacker = await login('hacker.yeung@raspect.ai', 'password');
    await t.throwsAsync(async () => {
        const newToken = await refreshAccessToken(tokenAndy.userId, tokenHacker.refreshToken);
    }, {message: 'Invalid refresh token'});
});

test.serial('Should be able to reset password', async t => {
    await requestPasswordReset('andy.yeung@raspect.ai');
    const resetCode = await getPasswordResetCode('andy.yeung@raspect.ai');
    await resetPassword('andy.yeung@raspect.ai', resetCode, 'password2');
    await login('andy.yeung@raspect.ai', 'password2');
    t.pass();
});

test.serial('Should not be able to request reset too frequently', async t => {
    await requestPasswordReset('hacker.yeung@raspect.ai');
    await t.throwsAsync(async () => {
        await requestPasswordReset('hacker.yeung@raspect.ai');
    }, {message: 'Reset password too frequent'});
});
