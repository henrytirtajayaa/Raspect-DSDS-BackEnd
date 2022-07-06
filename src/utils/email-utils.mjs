import jwt from 'jsonwebtoken';
import config from 'config';
import querystring from 'query-string';
import path from 'path';
import fs from 'fs';
import Promise from 'bluebird';
import Handlebars from 'handlebars';
import nodemailer from 'nodemailer';
import {SES, SendRawEmailCommand} from '@aws-sdk/client-ses';
import _ from 'lodash';

export async function sendForgotPwdEmail(staffId, resetPwdCode){
    const JWT_SECRET = config.get("auth.jwtSecret")[0];
    const BASE_URL = config.get("web.baseUrl");
    const SUPPORT_EMAIL = config.get("web.supportEmail");
    const RESET_PWD_EXPIRE_IN = "2h"; // 2 hours
    const __dirname = path.resolve();
    const readFileAsync = Promise.promisify(fs.readFile);
    const FORGOT_PWD_EMAIL_TMPL_PATH = path.join(__dirname, "/src/email-templates/forgot-pwd-email.html");
    const FORGOT_PWD_EMAIL_SUBJECT = "Forgot password DSDS";

    const forgotPwdInfo = {
        staffId, resetPwdCode
    };
    const tokenOpts = {
        expiresIn: RESET_PWD_EXPIRE_IN
    };
    const forgotPwdToken = jwt.sign(forgotPwdInfo, JWT_SECRET, tokenOpts);
    const resetPwdLink = `${BASE_URL}reset-password?${querystring.stringify({forgotPwdToken})}`;
    const tmplContent = await readFileAsync(FORGOT_PWD_EMAIL_TMPL_PATH, 'utf8');
    const emailTmpl = Handlebars.compile(tmplContent);
    const emailContent = emailTmpl({
        resetPwdLink,
        supportEmail: SUPPORT_EMAIL,
        BASE_URL
    });
    await sendEmail(SUPPORT_EMAIL, staffId, FORGOT_PWD_EMAIL_SUBJECT, {html: emailContent});
}

export async function sendEmail(fromEmail, toEmails, subject, content) {
    const mailOptions = Object.assign({
        from: fromEmail,
        to: toEmails,
        subject,
    }, content);
    const ses = new SES({
        apiVersion: '2010-12-01',
        region: 'ap-southeast-1',
        credentials: {
            accessKeyId: config.get("ses.accessKeyId"),
            secretAccessKey: config.get("ses.secretAccessKey")
        }
    });
    const transporter = nodemailer.createTransport({
        SES: {
            ses: ses,
		    aws: { SendRawEmailCommand},
        }
    });
    await transporter.sendMail(mailOptions);
}
  

export function validateEmail(email){
    let re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(_.toLower(email));
}

export function validatePassword(password){
    let re = /^.{8,}$/;
    return re.test(password);
}