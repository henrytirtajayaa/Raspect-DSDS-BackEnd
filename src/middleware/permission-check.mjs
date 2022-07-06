import _ from "lodash";

const permissionCheckMiddleware = function(actionName) {
    return async (ctx, next) => {
        console.log("user here", ctx.state.user)
        if (!ctx.state.user) {
            ctx.throw(403, 'User has no permission to perform action');
        } else if (ctx.state.user && _.isEmpty(ctx.state.user.permissions)) {
            ctx.throw(401, 'Unauthorised Access');
        } else {
            ctx.state.access = ctx.state.user.permissions[actionName];
            return next();
        }
    };
}

export default permissionCheckMiddleware;