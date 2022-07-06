import moment from "moment";
import {login, logout, refreshAccessToken, requestPasswordReset, getPasswordResetCode, processForgotPwdToken, resetPassword, contactUs} from '../logic/auth-logic.mjs';
import {sendForgotPwdEmail} from '../utils/email-utils.mjs';
import sanitize from 'mongo-sanitize';
import config from 'config';

const USER_ID_COOKIE = "user_id";
const ACCESS_TOKEN_COOKIE = "access_token";
const REFRESH_TOKEN_COOKIE = "refresh_token";
const REMEMBER_ME_COOKIE = "remember_me";
const REMEMBER_ME_MAX_AGE = config.get("auth.rememberMeMaxAge");
const REFRESH_TOKEN_LIFETIME = config.get("auth.refreshTokenLifetime");
const REFRESH_TOKEN_LIFETIME_SHORT = config.get("auth.refreshTokenLifetimeShort");
export default class AuthController {
    static async webLogin(ctx) {
        const requestBody = ctx.request.body;
        Object.keys(requestBody).forEach((key, index) => {
            requestBody[key] = sanitize(requestBody[key]);
        });
        const {login:username, password, rememberMe} = requestBody;
        const token = await login(username, password, rememberMe);
        let cookieOpts = {};
        if (rememberMe) {
            cookieOpts.maxAge = REMEMBER_ME_MAX_AGE * 1000;
            ctx.cookies.set(REMEMBER_ME_COOKIE, "true", cookieOpts);
        } else {
            ctx.cookies.set(REMEMBER_ME_COOKIE, null);
        }
        ctx.cookies.set(USER_ID_COOKIE, token.id, cookieOpts);
        ctx.cookies.set(ACCESS_TOKEN_COOKIE, token.accessToken, cookieOpts);
        ctx.cookies.set(REFRESH_TOKEN_COOKIE, token.refreshToken, {
            maxAge: rememberMe ? REFRESH_TOKEN_LIFETIME * 1000 : REFRESH_TOKEN_LIFETIME_SHORT * 1000 // lifetime is only 15 minutes if rememberMe is not pressed
        });
        ctx.body = token;
    }

    static async webLogout(ctx) {
        const requestBody = ctx.request.body;
        Object.keys(requestBody).forEach((key, index) => {
            requestBody[key] = sanitize(requestBody[key]);
        });
        
        const { userId, refreshToken } = requestBody;
        const isTokenRemoved = await logout(userId, refreshToken);
        ctx.cookies.set(REMEMBER_ME_COOKIE, null);
        ctx.cookies.set(USER_ID_COOKIE, null);
        ctx.cookies.set(REFRESH_TOKEN_COOKIE, null);
        ctx.cookies.set(ACCESS_TOKEN_COOKIE, null);
        ctx.body = {
            ...isTokenRemoved
        }
    }

    static async refreshAccessToken(ctx) {
        const requestBody = ctx.request.body;
        Object.keys(requestBody).forEach((key, index) => {
            requestBody[key] = sanitize(requestBody[key]);
        });
        
        const { userId, refreshToken } = requestBody;
        const tokenPair = await refreshAccessToken(userId, refreshToken);
        
        let cookieOpts = {};
        let cookieRememberMeObject = ctx.cookies.get(REMEMBER_ME_COOKIE);
        if (cookieRememberMeObject === "true") {
            cookieOpts.maxAge = REMEMBER_ME_MAX_AGE * 1000;
        }
        ctx.cookies.set(ACCESS_TOKEN_COOKIE, tokenPair.accessToken, cookieOpts);
        ctx.cookies.set(REFRESH_TOKEN_COOKIE, tokenPair.refreshToken, {
            maxAge: REFRESH_TOKEN_LIFETIME * 1000
        });

        ctx.body = {...tokenPair}
    }

    static async forgetPassword(ctx){
        const requestBody = ctx.request.body;
        Object.keys(requestBody).forEach((key, index) => {
            requestBody[key] = sanitize(requestBody[key]);
        });
        const {staffId} = requestBody;
        await requestPasswordReset(staffId);
        const resetPwdCode = await getPasswordResetCode(staffId);
        await sendForgotPwdEmail(staffId, resetPwdCode);
        ctx.body = {success: true};
    }

    static async resetPassword(ctx){
        const requestBody = ctx.request.body;
        Object.keys(requestBody).forEach((key, index) => {
            requestBody[key] = sanitize(requestBody[key]);
        });
        const {forgotPwdToken, password} = requestBody;
        const {staffId, resetPwdCode} = await processForgotPwdToken(forgotPwdToken);
        await resetPassword(staffId, resetPwdCode, password);
        ctx.body = {success: true};
    }

    static async contactUs(ctx){
        const contactInfo = ctx.request.body;
        await contactUs(contactInfo);
        ctx.body = {success: true};
    }
}