import districts from '../constant/districts.mjs';
import bbox from '@turf/bbox';
import centroid from '@turf/centroid';
export default class CommonController {
    static getDistricts(ctx) {
        ctx.body = districts.features.map((districtFeatures)=> {
            let array = [];
            let boundingBoxCoords = bbox(districtFeatures);
            array.push([boundingBoxCoords[0], boundingBoxCoords[1]]);
            array.push([boundingBoxCoords[2], boundingBoxCoords[3]]);

            return {
                bounds: array,
                area_name: districtFeatures["properties"]["AREA_NAME"],
                center: centroid(districtFeatures)
            };
        })
    }
}