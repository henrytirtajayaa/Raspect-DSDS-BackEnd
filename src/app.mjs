import Koa from 'koa';
import helmetMiddleware from 'koa-helmet';
import requestId from 'koa-requestid';
import noCache from 'koa-no-cache';
import config from 'config';
import errorMiddleware from './middleware/error-middleware.mjs';
import loggerMiddleware from './middleware/logger-middleware.mjs';
import routeMiddleware from './route/index.mjs';
import {initDB} from "./utils/data-init.mjs";
import koaBody from "koa-body";

// Support module config
process.env.SUPPRESS_NO_CONFIG_WARNING = 'y';

(async () => {
    const pinoMiddleware = loggerMiddleware();
    const app = new Koa();
    app.use(pinoMiddleware);
    app.use(requestId());
    app.use(errorMiddleware());
    app.use(noCache({
        global:true
    }));
    app.use(helmetMiddleware({ contentSecurityPolicy: (process.env.NODE_ENV === 'production') ? undefined : false }));
    app.use(koaBody({
        multipart: true,
        formLimit:"5mb",
        jsonLimit:"5mb"
    }));
    app.use(await routeMiddleware());

    const serverConfig = config.get('server');
    app.listen(serverConfig.port, serverConfig.host, () => {
        pinoMiddleware.logger.info(`Server started at ${serverConfig.host}:${serverConfig.port}. Environment: ${config.util.getEnv('NODE_ENV')} - ${config.util.getEnv('NODE_CONFIG_ENV')}`);
        pinoMiddleware.logger.info( {config: config.util.toObject()}, 'Resolved Config' );
        // Init DB
        initDB();
    });
})();



