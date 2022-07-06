import {createUser, deleteUser} from "../../src/logic/user-mgmt-logic.mjs";
import moment from "moment";
import {createTrip, updateTripPointsAndStatus} from "../../src/logic/trips-logic.mjs";
import sharp from "sharp";

export async function createMockUser() {
    await createUser({
        staffId: 'andy.yeung@raspect.ai',
        password: 'password'
    });
    await createUser({
        staffId: 'hacker.yeung@raspect.ai',
        password: 'password'
    });
}

export async function deleteMockUser() {
    await deleteUser('andy.yeung@raspect.ai');
    await deleteUser('hacker.yeung@raspect.ai');
}

export async function createTestTrip() {
    const refId = `${moment().format('YYYYMMDD')}-4`;
    await createTrip({
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

export async function createPhotos() {
    const refId = `${moment().format('YYYYMMDD')}-4`;
    await createTrip({
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

export async function generateTestImageInS3(tripId, batchId, cameraId) {
    const roundedCorners = Buffer.from(
        '<svg><style>\n' +
        '    .small { font: italic 13px sans-serif; }\n' +
        '    .heavy { font: bold 30px sans-serif; }\n' +
        '  </style><rect x="0" y="0" width="320" height="240" rx="5" ry="5"/>' +
        ` <text x="20" y="35" class="small">${batchId}</text>\n` +
        ` <text x="20" y="55" class="heavy">${cameraId}</text>` +
        '</svg>'
    );
    return sharp()
        .resize(320, 240)
        .composite([{
            input: roundedCorners,
            blend: 'dest-in'
        }])
        .jpeg({quality: 90})
        .toFile('output.jpg');
}