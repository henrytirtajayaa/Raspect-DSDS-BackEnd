import getConnection from "../model/connection-factory.mjs";
import * as turf from "@turf/helpers";
import distance from "@turf/distance";
import moment from "moment";
import _ from 'lodash';

function createPolygonFromRect(rect) {
  return {
    type: "Polygon",
    coordinates: [
        [rect[0], [rect[0][0], rect[1][1]], rect[1], [rect[1][0], rect[0][1]], rect[0]]
    ]
  };
}

function tripMongoToPlain(mongoTrip) {
  const tripExport = mongoTrip.toObject();
  return tripExport;
}

export async function searchTrips(rect, startDateTime, endDateTime) {
  const db = await getConnection();
  const Trip = db.model('Trip');
  let query = {};
  if(rect){
    const boundingBox = createPolygonFromRect(JSON.parse(rect));
    query['waypoints'] = { $geoIntersects: { $geometry:  boundingBox } };
  }
  if(startDateTime && endDateTime){
    query['startTime'] = { $gte: moment(startDateTime)};
    query['$or'] = [{endTime: { $lte: moment(endDateTime)}}, {endTime: {$exists: false}}];
  }
  const trips = await Trip.find(query,{
    surveyId: 1,
    refId: 1,
    waypoints: 1,
    sampledWaypoints: 1,
    startTime: 1,
    endTime: 1,
    centerPoint: 1
  }).exec();
  return trips.map(tripMongoToPlain);
}

function updateCalculatedTripAttributes(trip) {
  if (trip.startTime && trip.endTime) {
    trip.duration = trip.endTime.diff(trip.startTime, 'second');
  }
  if (trip.waypoints) {
    trip.waypointSize = trip.waypoints.coordinates.length;
    trip.waypointsDistance = calculateDistance(trip.waypoints);
  }
  if (trip.status !== 'Recording') {
    trip.endLocation = {
      type: 'Point',
      coordinates: _.last(trip.waypoints.coordinates)
    }
  }
}

export async function createTrip(tripInput) {
  const db = await getConnection();
  const Trip = db.model('Trip');
  const surveyId = tripInput.surveyId;
  const startTime = tripInput.startTime? moment(tripInput.startTime): moment();
  const trip = new Trip({
    surveyId: surveyId,
    refId: tripInput.refId,
    startLocation: tripInput.startLocation,
    startTime: startTime,
    waypoints: tripInput.waypoints,
    waypointSize: 1,
    waypointsDistance: [0],
    batchNoWaypointMap: tripInput.batchNoWaypointMap,
    centerPoint: tripInput.centerPoint
  });
  // Use end time provided if not in recording status
  if (tripInput.status !== 'Recording' && tripInput.endTime) {
    tripInput.endTime = moment(tripInput.endTime);
    trip.status = tripInput.status;
  }

  // update survey date if first trip
  const getTrip = await Trip.findOne({
    surveyId: surveyId,
  });

  if(!getTrip){ // IF FIRST TRIP
    const Survey = db.model('Survey');
    await Survey.updateOne({
        surveyId: surveyId
      },{
        $set: { createdAt: startTime }
      },{
        new: true
      });
  }
  //

  updateCalculatedTripAttributes(trip);
  await trip.save();
  return tripMongoToPlain(trip);
}

export async function getTrip(tripRefId) {
  const db = await getConnection();
  const Trip = db.model('Trip');
  const trip = await Trip.findOne({
    refId: tripRefId,
  });
  return tripMongoToPlain(trip);
}


function calculateDistance(waypoints) {
  const turfPoints = waypoints.coordinates.map((pt) => turf.point(pt));
  let initialValue = [0];
  const distances = turfPoints.reduce((accumulator, turfPoint, idx, turfPoints) => {
    if (idx > 0) {
      const lastDistance = _.last(accumulator);
      accumulator.push(lastDistance + distance(turfPoints[idx - 1], turfPoint));
    }
    return accumulator;
  }, initialValue);
  return distances;
}

export async function updateTripPointsAndStatus(tripRefId, tripUpdateRequest) {
  const db = await getConnection();
  const Trip = db.model('Trip');
  const trip = await Trip.findOne({
    refId: tripRefId,
  });
  // Only update in forward sequence, avoid delayed messages
  if (tripUpdateRequest.sequence && trip.lastSequence < tripUpdateRequest.sequence) {
    const coordinates = tripUpdateRequest.waypoints.map((point) => {
      return point.coordinates;
    })
    if (coordinates.length > 0) {
      if (!trip.waypoints) {
        trip.waypoints = {
          type: 'LineString',
          coordinates: [trip.startLocation.coordinates],
        }
      }
      trip.waypoints.coordinates.push(...coordinates);
    }
    trip.lastSequence = tripUpdateRequest.sequence;
    if (tripUpdateRequest.status) {
      trip.status = tripUpdateRequest.status;
    }
    updateCalculatedTripAttributes(trip);
    await trip.save();
  }
  return tripMongoToPlain(trip);
}

export async function updateTrip(tripRefId, body){
  const db = await getConnection();
  const Trip = db.model('Trip');
  const trip = await Trip.findOneAndUpdate({
    refId: tripRefId
  },{
    $set: body
  },{
    new: true
  });
  return tripMongoToPlain(trip);
}

export async function getLatestTrips(){
  const db = await getConnection();
  const Trip = db.model('Trip');
  return await Trip.aggregate([
    {
      $sort: {
        startTime: -1
      }
    },{
      $lookup: {
        from: 'signboards',
        localField: 'refId',
        foreignField: 'tripRefId',
        as: 'signboards'
      }
    },{
      $project: {
        refId: 1,
        startTime: 1,
        defectiveSignbaordCount: {
          "$size": {
            '$filter': {
              input: '$signboards',
              as: 'signboards',
              cond: { $eq: ['$$signboards.signboardType', 'defective'] }
            },
          }
        },
        normalSignbaordCount: {
          "$size": {
            '$filter': {
              input: '$signboards',
              as: 'signboards',
              cond: { $eq: ['$$signboards.signboardType', 'normal'] }
            },
          }
        },
        surveyId: 1
      }
    }
  ]);
}