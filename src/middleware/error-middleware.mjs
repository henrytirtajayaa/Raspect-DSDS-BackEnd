import {HttpError} from "koa";
import chow from "oas3-chow-chow";



const errorMiddleware = async (ctx, next) => {
    try {
        await next();
    } catch (e) {
        ctx.log.error({
            message: e.message,
            name: e.name,
            description: e.description,
            stack: e.stack,
        });
        if (e instanceof HttpError) {
            ctx.status = e.status;
            ctx.expose = true;
            ctx.body = {
                code: e.name,
                message: e.message,
                description: e.description,
                requestId: ctx.state.id,
            };
        } else if (e instanceof chow.RequestValidationError) {
            ctx.status = 400;
            ctx.expose = false;
            ctx.body = {
                code: 'RequestValidationError',
                message: e.message,
                description: e.description,
                requestId: ctx.state.id,
                meta: e.meta,
            };
        } else if (e instanceof chow.ResponseValidationError) {
            ctx.status = 500;
            ctx.expose = false;
            ctx.body = {
                code: 'ResponseValidationError',
                message: e.message,
                description: e.description,
                requestId: ctx.state.id,
                meta: e.meta,
            };
        } else {
            ctx.status = 500;
            ctx.expose = false;
            ctx.body = {
                message: e.message,
                description: e.description,
                requestId: ctx.state.id,
            };
        }
    }
};

export default () => errorMiddleware;
