import mongoose from "mongoose";

const pointSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['Point'],
        required: true
    },
    coordinates: {
        type: [Number],
        index: { type: '2dsphere', sparse: false },
        required: true
    }
});

const lineStringSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['LineString'],
        required: true
    },
    coordinates: {
        index: { type: '2dsphere', sparse: false },
        type: [[Number]], // Array of arrays of arrays of numbers
        required: true
    }
});

const schema = new mongoose.Schema({
    surveyId: {
        type: String,
        required: true
    },
    refId: {
        type: String,
        required: true,
        unique: true,
    },
    startLocation: {
        type: pointSchema,
        index: '2dsphere',
        required: true
    },
    endLocation: {
        type: pointSchema,
        index: '2dsphere',
    },
    tripDuration: {
        type: Number,
        default: 0
    },
    lastSequence: {
        type: Number,
        default: 0
    },
    waypointSize: Number,
    waypoints: {
        type: lineStringSchema,
        index: '2dsphere',
    },
    waypointsDistance: [Number],
    sampledWaypoints: {
        type: lineStringSchema,
        index: '2dsphere',
    },
    status: {
        type: String,
        enum: ['Recording', 'Uploading', 'Processing', 'Completed'],
        default: 'Recording',
    },
    startTime: {
        type: Date,
        default: Date.now
    },
    endTime: Date,
    signboardLastNum: {
        type: Number,
        default: 0
    },
    batchNoWaypointMap: {},
    centerPoint: {
        type: pointSchema
    }
});

export default schema;
