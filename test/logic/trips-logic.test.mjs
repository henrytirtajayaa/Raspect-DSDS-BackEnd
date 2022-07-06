import test from "ava";
import {searchTrips, createTrip, updateTripPointsAndStatus, getTrip} from "../../src/logic/trips-logic.mjs";
import moment from "moment";

test.serial('Create Trip and Search', async t => {
    try {
        const refId = `${moment().format('YYYYMMDD')}-1`;
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
            ]
        }
        await updateTripPointsAndStatus(refId, tripUpdateRequest1);
        const trips = await searchTrips([[114.168161, 22.320385],[114.171427, 22.313055]], moment().subtract(1, 'minute'), moment())
        t.is(trips.length, 1);
        t.is(trips[0].status, 'Recording');
        t.is(trips[0].waypoints.coordinates.length, 2);
    } catch (e) {
        console.log(e);
    }
});

test.serial('Directly create trip in one go', async t => {
    try {
        const refId = `${moment().format('YYYYMMDD')}-2`;
        const trip1 = await createTrip({
            refId: refId,
            startLocation: {
                type: 'Point',
                coordinates: [114.269437, 22.319314]
            },
            waypoints: {
                type: 'LineString',
                coordinates: [[114.269437, 22.319314],[114.269507, 22.318951]]
            },
            status: 'Processing',
            startTime: moment(),
            endTime: moment().add(1, 'minute'),
        })
        console.log(JSON.stringify({
            refId: refId,
            startLocation: {
                type: 'Point',
                coordinates: [114.269437, 22.319314]
            },
            waypoints: {
                type: 'LineString',
                coordinates: [[114.269437, 22.319314],[114.269507, 22.318951]]
            },
            status: 'Processing',
            startTime: moment(),
            endTime: moment().add(1, 'minute'),
        }))
        const trips = await searchTrips([[114.268161, 22.320385],[114.271427, 22.313055]], moment().subtract(1, 'minute'), moment())
        t.is(trips.length, 1);
        t.is(trips[0].status, 'Processing');
        t.is(trips[0].waypoints.coordinates.length, 2);
    } catch (e) {
        console.log(e);
    }
});

test.serial('Create Trip and Update Waypoints Search', async t => {
    try {
        const refId = `${moment().format('YYYYMMDD')}-3`;
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
                {
                    type: 'Point',
                    coordinates: [114.169558, 22.318603]
                },
                {
                    type: 'Point',
                    coordinates: [114.169507, 22.318951]
                },
                {
                    type: 'Point',
                    coordinates: [114.169558, 22.318603]
                },
            ]
        }
        const tripUpdateRequest2 = {
            sequence: 2,
            waypoints: [
                {
                    type: 'Point',
                    coordinates: [114.169845, 22.317324]
                },
                {
                    type: 'Point',
                    coordinates: [114.169951, 22.316802]
                },
                {
                    type: 'Point',
                    coordinates: [114.170037, 22.316350]
                },
                {
                    type: 'Point',
                    coordinates: [114.170171, 22.315725]
                },
            ]
        }
        const tripUpdateRequest3 = {
            sequence: 3,
            waypoints: [
                {
                    type: 'Point',
                    coordinates: [114.170262, 22.315288]
                },
                {
                    type: 'Point',
                    coordinates: [114.170380, 22.314737]
                },
                {
                    type: 'Point',
                    coordinates: [114.170498, 22.314072]
                },
                {
                    type: 'Point',
                    coordinates: [114.170654, 22.313293]
                },
            ]
        }
        const tripUpdateRequest4 = {
            sequence: 4,
            status: 'Uploading',
            waypoints: [
                {
                    type: 'Point',
                    coordinates: [114.170540, 22.313288]
                },
                {
                    type: 'Point',
                    coordinates: [114.170189, 22.315027]
                },
                {
                    type: 'Point',
                    coordinates: [114.169945, 22.316238]
                },
                {
                    type: 'Point',
                    coordinates: [114.169615, 22.317973]
                },
                {
                    type: 'Point',
                    coordinates: [114.169331, 22.319204]
                },
            ]
        }
        await updateTripPointsAndStatus(refId, tripUpdateRequest1);
        let verifiedTrip = await getTrip(refId);
        t.is(verifiedTrip.waypoints.coordinates.length, 5, 'Expect Update 1 cause waypoint to 5');
        t.is(verifiedTrip.status, 'Recording');
        await updateTripPointsAndStatus(refId, tripUpdateRequest3); // Simulate out of order
        verifiedTrip = await getTrip(refId);
        t.is(verifiedTrip.waypoints.coordinates.length, 9, 'Expect Update 3 cause waypoint to 9');
        t.is(verifiedTrip.status, 'Recording');
        await updateTripPointsAndStatus(refId, tripUpdateRequest2);
        verifiedTrip = await getTrip(refId);
        t.is(verifiedTrip.waypoints.coordinates.length, 9, 'Expect Out order Update 2 cause waypoint keep 9');
        t.is(verifiedTrip.status, 'Recording');
        await updateTripPointsAndStatus(refId, tripUpdateRequest4);
        verifiedTrip = await getTrip(refId);
        t.is(verifiedTrip.waypoints.coordinates.length, 14, 'Expect Update 4 cause waypoint to 14');
        t.is(verifiedTrip.status, 'Uploading');
        t.deepEqual(verifiedTrip.endLocation.coordinates, [114.169331, 22.319204]);
    } catch (e) {
        console.log(e);
    }
});