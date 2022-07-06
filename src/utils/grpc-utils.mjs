import path from "path"
import config from 'config';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';

const __dirname = path.resolve();

function genGrpcFunc(protoPath, serviceName, rpcName) {
    let packageDef = protoLoader.loadSync(
        protoPath,
        {
            longs: Number,
            defaults: true,
            arrays: true
        });

    let targetProto = grpc.loadPackageDefinition(packageDef);

    return async function(data) {
        let client = new targetProto[serviceName](config.get("locationService.endpoint"), grpc.credentials.createInsecure());

        return new Promise((resolve, reject) => {
            client[rpcName](data, (err, response) => {
                if (err) {
                    return reject(err);
                } else {
                    resolve(response);
                }
            });
        });
    };
}

const _getBuildings = genGrpcFunc(
    path.join(__dirname, '/src/protos/address.proto'),
    'AddressService',
    'findBdBuildingByWgs84Point'
)

export async function getBuildings(lat, lon, precision){
    return _getBuildings({
        lon: lon, lat: lat, search_dist_m: precision, out_srid: 4326
    });
}