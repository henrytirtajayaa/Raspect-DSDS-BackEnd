import test from "ava";
import {createTrip, searchTrips, updateTripPointsAndStatus} from "../../src/logic/trips-logic.mjs";
import moment from "moment";
import {createTripPhotos, searchTripPhotos} from "../../src/logic/photos-logic.mjs";

async function createTestTrip() {
    const refId = `${moment().format('YYYYMMDD')}-5`;
    const trip1 = await createTrip({
        refId: refId,
        startLocation: {
            type: 'Point',
            coordinates: [114.169437, 22.319314]
        }
    })
    const tripUpdateRequest1 = {
        sequence: 1,
        waypoints: [
            {
                type: 'Point',
                coordinates: [114.169507, 22.318951]
            },
        ],
        status: 'Uploading'
    }
    return updateTripPointsAndStatus(refId, tripUpdateRequest1);
}

test.serial('Search Photo from Trip', async t => {
    const searchResult = await searchTripPhotos('20210615-5', [114.17060531999999,22.31353384]);
    console.log(searchResult);
});