import mongoose from 'mongoose';
import initModel from './init-model.mjs';
import config from 'config';
import MongoMemoryServer from 'mongodb-memory-server';

let mongod = null;

export default async function getConnection() {
    const uri = config.get('db.uri');
    let conn = null;

    mongoose.set('useFindAndModify', false);
    if (uri === 'inmemory') {
        if (!mongod) {
            mongod = new MongoMemoryServer.MongoMemoryServer();
        }
        const uri = await mongod.getUri();
        const mongooseOpts = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        };
        conn = await mongoose.createConnection(uri, mongooseOpts);
    } else {
        const dbOptions = {
            user: config.get('db.user'),
            pass: config.get('db.password'),
            poolSize: config.get('db.poolSize'),
            ssl: config.get('db.ssl'),
            replicaSet: config.get('db.replicaSet'),
            authSource: config.get('db.authSource'),
            useUnifiedTopology: true,
            useNewUrlParser: true,
        };
        conn = await mongoose.connect(config.get('db.uri'), dbOptions);
    }

    initModel(conn);
    return conn;
};